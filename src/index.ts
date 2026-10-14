import { createAgent } from "./agent"
import { ask, rl } from "./io"

const send = createAgent()

console.log("Job tracker agent. Type 'exit' to quit.")

while (true) {
    const input = (await ask("\nyou> ")).trim()
    if (!input) continue
    if (input === "exit") break
    console.log("\nagent>", await send(input))
}

rl.close()