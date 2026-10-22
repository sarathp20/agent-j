import path from "node:path"
import { Client } from "@modelcontextprotocol/client"
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio"

export async function connectMcp() {
    const root = path.resolve(import.meta.dirname, "..")
    const tsxCli = path.join(root, "node_modules/tsx/dist/cli.mjs")
    const serverFile = path.join(root, "src/mcp-server.ts")

    const transport = new StdioClientTransport({
        command: process.execPath,
        args: [tsxCli, serverFile],
    })
    const client = new Client({ name: "agent-j-cli", version: "1.0.0" })
    await client.connect(transport)
    const { tools } = await client.listTools()

    async function call(name: string, args: any){
        try{
            const result = await client.callTool({ name, arguments: args })
            // const response = result.map(res => {
            //     // TBD
            // })
            
        }catch(e){

        }
    }
    return { tools, close: () => client.close() }
}