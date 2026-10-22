import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { z } from "zod";
import { ALL_STATUSES, ApplicationTools } from "./tools";
import { CHANNELS, STATUSES, WORK_MODES } from "./types"

async function callTool(name: string, args: Record<string, unknown>) {
    const tool = ApplicationTools.find((t) => t.name === name);
    if (!tool) {
        return {
            content: [{ type: "text" as const, text: `Unknown tool: ${name}` }],
            isError: true,
        };
    }
    try {
        const result = await tool.execute(args);
        const isError =
            typeof result === "object" && result !== null && "error" in result;
        return {
            content: [{ type: "text" as const, text: JSON.stringify(result) }],
            isError,
        };
    } catch (e) {
        return {
            content: [
                { type: "text" as const, text: e instanceof Error ? e.message : String(e) },
            ],
            isError: true,
        };
    }
}

function createServer() {
    const server = new McpServer({ name: "agent-j", version: "1.0.0" });

    server.registerTool(
        "get_application",
        {
            description:
                "Get the full details of ONE job application by its ID (e.g. APP001). Use when the user refers to a specific application. Returns an error if the ID does not exist. Includes archived applications.",
            inputSchema: z.object({
                id: z.string().describe("Application ID, e.g. APP001"),
            }),
            annotations: { readOnlyHint: true },
        },
        async ({ id }) => callTool("get_application", { id }),
    );

    server.registerTool(
        "search_by_company",
        {
            description:
                "Search the full application history by company name, including archived, rejected and withdrawn applications. Partial, case-insensitive match. Use to answer 'did I apply to X before?' or to find all applications for a company.",
            inputSchema: z.object({
                company: z.string().describe("Company name or part of it (case insensitive)"),
            }),
            annotations: { readOnlyHint: true },
        },
        async ({ company }) => callTool("search_by_company", { company }),
    );

    server.registerTool(
        "list_active_applications",
        {
            description:
                "List all currently active applications (not archived; status Applied, In Progress, Screening Call, Interview or On Hold). Returns a short summary per application. Optionally filter by country.",
            inputSchema: z.object({
                country: z.string().describe("Country name to filter by, e.g. India. Optional.").optional(),
            }),
            annotations: { readOnlyHint: true },
        },
        async ({ country }) => callTool("list_active_applications", { country }),
    );

    server.registerTool(
        "update_status",
        {
            description:
                "Change the status of ONE application by ID (e.g. when the user says they got a screening call or were rejected). Status must be one of the allowed values. Returns an error if the ID does not exist or the status is invalid.",
            inputSchema: z.object({
                id: z.string().describe("Application ID, e.g. APP001"),
                status: z.enum(STATUSES).describe("The new status"),
            }),
            annotations: {
                readOnlyHint: false,
                destructiveHint: false,
                idempotentHint: true,
            },
        },
        async ({ id, status }) => callTool("update_status", { id, status }),
    );
        server.registerTool(
        "create_application",
        {
            description:
                "Add a NEW job application the user has just applied for. Requires company, role and country. Everything else is optional: include it only if known, never guess. Returns an error if the same company, role and country is already tracked.",
            inputSchema: z.object({
                company: z.string().min(1).describe("Company applied to"),
                role: z.string().min(1).describe("Job role applied for"),
                country: z.string().min(1).describe("Country of the job"),
                city: z.string().optional().describe("City of the job"),
                workMode: z.enum(WORK_MODES).optional().describe("Work mode, only if known"),
                channel: z.enum(CHANNELS).optional().describe("How the job was found, only if known"),
                recruiterName: z.string().optional(),
                referralContact: z.string().optional(),
                nextAction: z.string().optional(),
                notes: z.string().optional(),
                appliedDate: z
                    .string()
                    .regex(/^\d{4}-\d{2}-\d{2}$/)
                    .optional()
                    .describe("ISO date like 2026-10-17, defaults to today"),
            }),
            annotations: {
                readOnlyHint: false,
                destructiveHint: false,
                idempotentHint: false,
            },
        },
        async (args) => callTool("create_application", args),
    );

    return server;
}

serveStdio(createServer, { onerror: (e) => console.error("MCP error:", e) });
console.error("agent-j MCP server running on stdio");