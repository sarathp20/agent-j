import { pool } from "./db"
import type { Channel, Status, WorkMode } from "./types"

import { CHANNELS, STATUSES, WORK_MODES } from "./types"


export const ALL_STATUSES = STATUSES

export interface Tool {
    name: string
    description: string
    parameters: Record<string, unknown>
    requiresConfirmation?: boolean
    describe?: (args: Record<string, unknown>) => string | Promise<string>
    execute: (args: Record<string, unknown>) => unknown
}


const ACTIVE_STATUSES: Status[] = [
    "Applied", "In Progress", "Screening Call", "Interview", "On Hold",
]


export const ApplicationTools: Tool[] = [
    {
        name: "get_application",
        description:
            "Get the full details of ONE job application by its ID (e.g. APP001). Use when the user refers to a specific application. Returns an error if the ID does not exist. Includes archived applications.",
        parameters: {
            type: "object",
            properties: {
                id: { type: "string", description: "Application ID, e.g. APP001" },
            },
            required: ["id"],
        },
        execute: async (args) => {
            const result = await pool.query(`SELECT * FROM applications WHERE id = $1`, [String(args.id)])
            return result.rows[0] ?? { error: `No application with id ${String(args.id)}` }
        },
    },
    {
        name: "list_active_applications",
        description:
            "List all currently active applications (not archived; status Applied, In Progress, Screening Call, Interview or On Hold). Returns a short summary per application. Optionally filter by country.",
        parameters: {
            type: "object",
            properties: {
                country: {
                    type: "string",
                    description: "Country name to filter by, e.g. India. Optional.",
                },
            },
            required: [],
        },
        execute: async (args) => {
            const result = await pool.query(
                `SELECT id, company, role, status, last_contact_date
                    FROM applications
                    WHERE archived = false
                      AND status = ANY($1::text[])
                      AND ($2::text IS NULL OR lower(country) = lower($2))
                    ORDER BY id`,
                [ACTIVE_STATUSES, args.country ?? null],
            )
            if (result.rows.length === 0) {
                return { message: "No active applications" }
            }
            return result.rows
        },
    },
    {
        name: "update_status",
        description:
            "Change the status of ONE application by ID (e.g. when the user says they got a screening call or were rejected). Status must be one of the allowed values. Returns an error if the ID does not exist or the status is invalid.",
        requiresConfirmation: true,
        describe: async (args) => {
            const app = await pool.query(`SELECT * FROM applications WHERE id = $1`, [String(args.id)])
            if (app.rows.length === 0) {
                return `${args.id} -> ${args.status} (no application with that ID)`
            }
            return `${app.rows[0].id} · ${app.rows[0].company} · ${app.rows[0].role}: ${app.rows[0].status} -> ${args.status}`
        },
        parameters: {
            type: "object",
            properties: {
                id: {
                    type: "string",
                    description: "Application ID, e.g. APP001",
                },
                status: {
                    type: "string",
                    description: "The new status",
                    enum: ALL_STATUSES,
                },
            },
            required: ["id", "status"],
        },
        execute: async (args) => {
            const newStatus = String(args.status)
            if (!ALL_STATUSES.includes(newStatus as Status)) {
                return {
                    error: `Invalid status "${newStatus}". Valid statuses: ${ALL_STATUSES.join(", ")}`,
                }
            }

            const result = await pool.query(
                `UPDATE applications SET status = $2 WHERE id = $1 RETURNING id, company, status`,
                [String(args.id), newStatus],
            )
            if (result.rows.length === 0) {
                return { error: `No application found under the id ${String(args.id)}` }
            }
            return result.rows[0]
        },
    },
    {
        name: "search_by_company",
        description:
            "Search the full application history by company name, including archived, rejected and withdrawn applications. Partial, case-insensitive match. Use to answer 'did I apply to X before?' or to find all applications for a company.",
        parameters: {
            type: "object",
            properties: {
                company: {
                    type: "string",
                    description: "Company name or part of it (case insensitive)",
                },
            },
            required: ["company"],
        },
        execute: async (args) => {
            if (!args.company) {
                return { error: "No company name provided" }
            }
            const result = await pool.query(
                `SELECT id, company, role, status, city, country, applied_date, archived
         FROM applications
         WHERE company ILIKE $1
         ORDER BY id`,
                [`%${String(args.company)}%`],
            )
            return result.rows
        },
    },
    {
        name: "create_application",
        description:
            "Add a NEW job application the user has just applied for. Use only when the user says they applied somewhere new. Requires company, role, city and country. Everything else is optional: include it only if the user said it, never guess. Returns an error if the same company, role, city and country is already tracked.",
        requiresConfirmation: true,
        describe: (args) =>
            `Add: ${args.company} · ${args.role} · ${args.city ? `${args.city}, ` : ""}${args.country}` +
            ` (${args.workMode ?? "work mode unknown"}, ${args.channel ?? "channel unknown"})`,
        parameters: {
            type: "object",
            properties: {
                company: { type: "string", description: "Company applied to. The user must say it in their message. If they did not, ask them. Never take it from other applications." },
                role: { type: "string", description: "Job role applied for. The user must say it in their message. If they did not, ask them. Never take it from other applications." },
                country: {
                    type: "string",
                    description:
                        "Country of the job. Infer from the city if it is unambiguous (e.g. Kochi -> India), otherwise ask the user. Never take it from other applications.",
                },
                city: {
                    type: "string",
                    description: "City of the job. The user must say it in their message. If they did not, ask them. Never take it from other applications.",
                },
                workMode: {
                    type: "string",
                    description: "Work mode. Only if the user said it, do not guess.",
                    enum: WORK_MODES,
                },
                channel: {
                    type: "string",
                    description:
                        "Where the job was found or applied through. Only if the user said it, do not guess.",
                    enum: CHANNELS,
                },
                recruiterName: { type: "string", description: "Recruiter's name (optional)" },
                referralContact: { type: "string", description: "Referral contact's name (optional)" },
                nextAction: { type: "string", description: "Next action to take (optional)" },
                notes: { type: "string", description: "Any notes (optional)" },
                appliedDate: {
                    type: "string",
                    description: "ISO date like 2026-10-17 (optional, defaults to today)",
                },
            },
            required: ["company", "role", "city", "country"],
        },
        execute: async (args) => {
            const company = String(args.company ?? "").trim()
            const role = String(args.role ?? "").trim()
            const country = String(args.country ?? "").trim()
            const city = String(args.city ?? "").trim()
            if (!company || !role || !city || !country) {
                return { error: "company, role, city and country are required" }
            }
            if (args.workMode !== undefined && !WORK_MODES.includes(args.workMode as WorkMode)) {
                return { error: `Invalid workMode "${args.workMode}". Valid: ${WORK_MODES.join(", ")}` }
            }
            if (args.channel !== undefined && !CHANNELS.includes(args.channel as Channel)) {
                return { error: `Invalid channel "${args.channel}". Valid: ${CHANNELS.join(", ")}` }
            }

            let appliedDate = new Date().toLocaleDateString("en-CA")
            const optional = (v: unknown) => (v === undefined || v === "" ? null : String(v).trim())

            try {
                const result = await pool.query(
                    `INSERT INTO applications
           (id, company, role, country, city, applied_date, status,
            work_mode, channel, recruiter_name, referral_contact, next_action, notes)
         VALUES
           ('APP' || lpad(nextval('app_id_seq')::text, 3, '0'),
            $1, $2, $3, $4, $5, 'Applied', $6, $7, $8, $9, $10, $11)
         RETURNING id, company, role, city, status`,
                    [
                        company, role, country, city, appliedDate,
                        optional(args.workMode), optional(args.channel),
                        optional(args.recruiterName), optional(args.referralContact),
                        optional(args.nextAction), optional(args.notes),
                    ],
                )
                return result.rows[0]
            } catch (err) {
                if ((err as { code?: string }).code === "23505") {
                    return { error: `Already tracked: ${company} · ${role} · ${city}, ${country}` }
                }
                throw err
            }
        }
    }
]