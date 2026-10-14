import { applications } from "./data"
import type { Application, Status } from "./types"

export interface Tool {
    name: string
    description: string
    parameters: Record<string, unknown>
    requiresConfirmation?: boolean
    describe?: (args: Record<string, unknown>) => string
    execute: (args: Record<string, unknown>) => unknown
}

const ALL_STATUSES: Status[] = [
    "Applied", "In Progress", "Screening Call", "Interview",
    "Offer", "Rejected", "Withdrawn", "On Hold",
]

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
                status: u.status,
                appliedDate: u.appliedDate,
                archived: u.archived,
            }))
        },
    },
]