import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { z } from "zod";

function createServer() {
    const server = new McpServer({ name: "clock", version: "1.0.0" });
    server.registerTool(
        "get_current_time",
        {
            description:
                "Get the current date and time in a given timezone (IANA name like Asia/Tokyo). Defaults to Asia/Kolkata if no timezone is given. Use this for any question about what time or date it is now.",
            inputSchema: z.object({
                timeZone: z.string().describe("IANA timezone name, e.g. Asia/Tokyo").optional(),
            }),
            annotations: { readOnlyHint: true },
        },
        async ({ timeZone }) => {
            const zone = timeZone ?? "Asia/Kolkata";
            try {
                const time = new Intl.DateTimeFormat("en-IN", {
                    timeZone: zone,
                    dateStyle: "medium",
                    timeStyle: "short",
                }).format(new Date());
                return { content: [{ type: "text", text: JSON.stringify({ timeZone: zone, time }) }] };
            } catch (e) {
                const message = e instanceof Error ? e.message : String(e);
                return {
                    content: [{ type: "text", text: JSON.stringify({ error: `Invalid timezone "${zone}": ${message}` }) }],
                    isError: true,
                };
            }
        },
    );
    return server;
}

serveStdio(createServer, { onerror: (e) => console.error("MCP error:", e) });
console.error("clock MCP server running on stdio");