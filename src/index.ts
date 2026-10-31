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
} catch (err) {
    // Ctrl+C makes readline reject with ABORT_ERR. Treat it as a normal exit.
    if ((err as NodeJS.ErrnoException).code !== "ABORT_ERR") throw err
    console.log("\nBye.")
} finally {
    await mcp.close()
    rl.close()
}