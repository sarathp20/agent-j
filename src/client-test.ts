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
console.log(await mcp.call("search_by_company", { company: "ibm" }))
console.log(await mcp.call("get_application", { id: "APP999" }))
console.log(await mcp.call("update_status", { id: "APP005", status: "Banana" }))
console.log(await mcp.call("no_such_tool", {}))
} finally {
    await mcp.close()
}