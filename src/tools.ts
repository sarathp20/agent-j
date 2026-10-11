import { applications } from "./data"
import type { Application, Status } from "./types"
export interface Tool {
    name: string
    description: string
    parameters: Record<string, unknown>
    execute: (args: Record<string, unknown>) => unknown
}

const ACTIVE_STATUSES: Status[] = ['Applied', 'In Progress', 'Interview', 'On Hold', 'Screening Call']

export const ApplicationTools: Tool[] = [{
    name: "get_application",
    description: "Get the full details of ONE job application by its ID (e.g. APP001). Use when the user refers to a specific application. Returns an error if the ID does not exist. Includes archived applications.",
    parameters: {
        type: "object",
        properties: {
            id: { type: "string", description: "Application ID, e.g. APP001" }
        },
        required: ["id"]
    },
    execute: (args) => {
        const applicationFound = applications.find(u => u.id === String(args.id))
        if (applicationFound) {
            return applicationFound
        } else {
            return { error: `No application with id ${args.id}` }
        }
    }

},
{
    name: "list_active_applications",
    description: "List all currently active applications (not archived; status Applied, In Progress, Screening Call, Interview or On Hold). Returns a short summary per application. Optionally filter by country.",
    parameters: {
        type: "object",
        properties: {
            country: { type: "string", description: "Country name to filter by, e.g. India. Optional." }
        },
        required: []
    },
    execute: (args) => {
        const basicFilter = (u: Application) => {
            const found = !u.archived && ACTIVE_STATUSES.includes(u.status)
            if (args.country) {
                const countrymatch = u.country.toLowerCase() === String(args.country).toLowerCase()
                return countrymatch && found
            } else {
                return found
            }
        }
        const applicationsActive = applications.filter(basicFilter).map(ele => ({
            id: ele.id,
            company: ele.company,
            role: ele.role,
            status: ele.status,
            lastContactDate: ele.lastContactDate,
        }))
        if (applicationsActive.length === 0) {
            return { message: "No active applications" }
        }
        return applicationsActive
    }

}
]