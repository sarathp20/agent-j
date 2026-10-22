import { applications } from "./data"
import type { Application, Channel, Status, WorkMode } from "./types"

import { CHANNELS, STATUSES, WORK_MODES } from "./types"


export const ALL_STATUSES = STATUSES

export interface Tool {
    name: string
    description: string
    parameters: Record<string, unknown>
    requiresConfirmation?: boolean
    describe?: (args: Record<string, unknown>) => string
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
        execute: (args) => {
            const found = applications.find((u) => u.id === String(args.id))
            if (!found) {
                return { error: `No application with id ${args.id}` }
            }
            return found
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
        execute: (args) => {
            const matches = (u: Application) => {
                const active = !u.archived && ACTIVE_STATUSES.includes(u.status)
                if (!args.country) return active
                return (
                    active &&
                    u.country.toLowerCase() === String(args.country).toLowerCase()
                )
            }
            const result = applications.filter(matches).map((u) => ({
                id: u.id,
                company: u.company,
                role: u.role,
                status: u.status,
                lastContactDate: u.lastContactDate,
            }))
            if (result.length === 0) {
                return { message: "No active applications" }
            }
            return result
        },
    },
    {
        name: "update_status",
        description:
            "Change the status of ONE application by ID (e.g. when the user says they got a screening call or were rejected). Status must be one of the allowed values. Returns an error if the ID does not exist or the status is invalid.",
        requiresConfirmation: true,
        describe: (args) => {
            const app = applications.find((u) => u.id === String(args.id))
            if (!app) {
                return `${args.id} -> ${args.status} (no application with that ID)`
            }
            return `${app.id} · ${app.company} · ${app.role}: ${app.status} -> ${args.status}`
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
        execute: (args) => {
            const newStatus = String(args.status)
            if (!ALL_STATUSES.includes(newStatus as Status)) {
                return {
                    error: `Invalid status "${newStatus}". Valid statuses: ${ALL_STATUSES.join(", ")}`,
                }
            }
            const app = applications.find((u) => u.id === String(args.id))
            if (!app) {
                return { error: `No application found under the id ${args.id}` }
            }
            app.status = newStatus as Status
            return { id: app.id, company: app.company, status: app.status }
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
        execute: (args) => {
            if (!args.company) {
                return { error: "No company name provided" }
            }
            const query = String(args.company).toLowerCase()
            const matches = applications.filter((u) =>
                u.company.toLowerCase().includes(query)
            )
            if (matches.length === 0) {
                return { message: `No applications found for "${args.company}"` }
            }
            return matches.map((u) => ({
                id: u.id,
                company: u.company,
                role: u.role,
                country: u.country,
                city: u.city,
                status: u.status,
                appliedDate: u.appliedDate,
                archived: u.archived,
            }))
        },
    },
    {
        name: "create_application",
        description:
            "Add a NEW job application the user has just applied for. Use only when the user says they applied somewhere new. Requires company, role and country. Everything else is optional: include it only if the user said it, never guess. Returns an error if the same company, role and country is already tracked.",
        requiresConfirmation: true,
        describe: (args) =>
            `Add: ${args.company} · ${args.role} · ${args.city ? `${args.city}, ` : ""}${args.country}` +
            ` (${args.workMode ?? "work mode unknown"}, ${args.channel ?? "channel unknown"})`,
        parameters: {
            type: "object",
            properties: {
                company: { type: "string", description: "Company applied to" },
                role: { type: "string", description: "Job role applied for" },
                country: {
                    type: "string",
                    description:
                        "Country of the job. Infer from the city if it is unambiguous (e.g. Kochi -> India), otherwise ask the user.",
                },
                city: {
                    type: "string",
                    description: "City of the job. Only if the user said it, do not guess.",
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
            required: ["company", "role", "country"],
        },
        execute: (args) => {
            const company = String(args.company ?? "").trim()
            const role = String(args.role ?? "").trim()
            const country = String(args.country ?? "").trim()
            if (!company || !role || !country) {
                return { error: "company, role and country are required" }
            }
            if (args.workMode !== undefined && !WORK_MODES.includes(args.workMode as WorkMode)) {
                return { error: `Invalid workMode "${args.workMode}". Valid: ${WORK_MODES.join(", ")}` }
            }
            if (args.channel !== undefined && !CHANNELS.includes(args.channel as Channel)) {
                return { error: `Invalid channel "${args.channel}". Valid: ${CHANNELS.join(", ")}` }
            }

            let appliedDate = new Date().toLocaleDateString("en-CA")
            if (args.appliedDate) {
                const d = String(args.appliedDate)
                if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
                    return { error: `appliedDate must look like 2026-10-17, got "${d}"` }
                }
                appliedDate = d
            }

            const same = (a: string, b: string) => a.trim().toLowerCase() === b.toLowerCase()
            const duplicate = applications.find(
                (u) =>
                    !u.archived &&
                    same(u.company, company) &&
                    same(u.role, role) &&
                    same(u.country, country),
            )
            if (duplicate) {
                return { error: `Already tracked as ${duplicate.id} (status: ${duplicate.status})` }
            }

            const maxNum = applications.reduce((max, u) => {
                const n = parseInt(u.id.match(/\d+/)?.[0] ?? "0", 10)
                return n > max ? n : max
            }, 0)

            const app: Application = {
                id: `APP${String(maxNum + 1).padStart(3, "0")}`,
                company,
                role,
                country,
                appliedDate,
                status: "Applied",
                recruiterContacted: false,
                salaryShared: false,
                archived: false,
            }
            if (args.city) app.city = String(args.city).trim()
            if (args.workMode) app.workMode = args.workMode as WorkMode
            if (args.channel) app.channel = args.channel as Channel
            if (args.recruiterName) app.recruiterName = String(args.recruiterName)
            if (args.referralContact) app.referralContact = String(args.referralContact)
            if (args.nextAction) app.nextAction = String(args.nextAction)
            if (args.notes) app.notes = String(args.notes)

            applications.push(app)
            return { id: app.id, company: app.company, role: app.role, status: app.status }
        },
    },
]