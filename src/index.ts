import { createAgent } from "./agent"
import { ask, rl } from "./io"
import { connectMcp } from "./mcp-client"

const mcp = await connectMcp()
const send = createAgent(mcp)

console.log("Job tracker agent. Type 'exit' to quit.")
try {
    while (true) {
        const input = (await ask("\nyou> ")).trim()
        if (!input) continue
        if (input === "exit") break
        console.log("\nagent>", await send(input))
    }
}
finally { await mcp.close(); rl.close() }