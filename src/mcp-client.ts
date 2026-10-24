import path from "node:path"
import { Client } from "@modelcontextprotocol/client"
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio"

type McpTool = Awaited<ReturnType<typeof connectMcp>>["tools"][number]

export async function connectMcp() {
    const root = path.resolve(import.meta.dirname, "..")
    const tsxCli = path.join(root, "node_modules/tsx/dist/cli.mjs")
    const servers = [
        { name: "agent-j", file: "src/mcp-server.ts" },
        { name: "clock", file: "src/mcp-server-clock.ts" },
    ]

    const connections = await Promise.all(
        servers.map(async (server) => {
            const transport = new StdioClientTransport({
                command: process.execPath,
                args: [tsxCli, path.join(root, server.file)],
            })
            const client = new Client({ name: server.name, version: "1.0.0" })
            await client.connect(transport)
            const { tools } = await client.listTools()
            return { client, tools }
        }),
    )

    const closeAll = () => Promise.all(connections.map((c) => c.client.close()))

    // tool name -> the client that owns it
    const owner = new Map<string, Client>()
    for (const { client, tools } of connections) {
        for (const tool of tools) {
            if (owner.has(tool.name)) {
                await closeAll() // don't leave the child processes running
                throw new Error(`Two servers both define a tool named "${tool.name}"`)
            }
            owner.set(tool.name, client)
        }
    }

    const tools = connections.flatMap((c) => c.tools)

    const call = async (name: string, args: Record<string, unknown>): Promise<unknown> => {
        const client = owner.get(name)
        if (!client) return { error: `No tool named ${name}` }
        try {
            const result = await client.callTool({ name, arguments: args })
            const text = result.content.flatMap((c) => (c.type === "text" ? [c.text] : [])).join("\n")

            let data: unknown
            try {
                data = JSON.parse(text)
            } catch {
                data = text
            }

            if (result.isError) {
                const alreadyError = typeof data === "object" && data !== null && "error" in data
                return alreadyError ? data : { error: data }
            }
            return data
        } catch (e) {
            return { error: e instanceof Error ? e.message : String(e) }
        }
    }

    return { tools, call, close: closeAll }
}

export const toGeminiDeclarations = (tools: McpTool[]) => {

    return tools.map(tool => {
        const { $schema, ...parameters } = tool.inputSchema
        return ({
            name: tool.name,
            description: tool.description ?? "",
            parametersJsonSchema: parameters
        })
    })

}