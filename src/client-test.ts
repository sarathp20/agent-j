import { connectMcp } from "./mcp-client";

const mcp = await connectMcp()
try {
    for (const tool of mcp.tools) {
        console.log(
            tool.name,
            "| readOnly:", tool.annotations?.readOnlyHint,
            "|", tool.description?.slice(0, 60),
        )
    }
console.log(JSON.stringify(mcp.tools[0]?.inputSchema, null, 2))
} finally {
    await mcp.close()
}