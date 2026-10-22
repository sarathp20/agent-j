import { GoogleGenAI, type Content, type Part } from "@google/genai"
import { ApplicationTools } from "./tools"
import { ask } from "./io"

const apiKey = process.env.GEMINI_API_KEY
if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing. Add it to .env")
}

const MODEL = process.env.GEMINI_MODEL ?? "gemini-3.5-flash-lite"
const MAX_STEPS = 6

const ai = new GoogleGenAI({ apiKey })

const functionDeclarations = ApplicationTools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
}))

async function confirm(message: string): Promise<{ approved: boolean; reply: string }> {
    const answer = (await ask(`${message}\nApprove? (y/n, or type a correction) `)).trim()
    const approved = ["y", "yes"].includes(answer.toLowerCase())
    return { approved, reply: answer }
}

export const createAgent = () => {
    const today = new Date().toISOString().slice(0, 10)
    const systemInstruction = `You are a job application assistant. Today's date is ${today}.
- Only use data returned by tools. Never invent application IDs or details.
- If a request could match more than one application, ask the user which one before changing anything.
- After changing data, confirm exactly what changed.`

    // History lives here, so it survives between messages.
    const contents: Content[] = []

    return async (userMessage: string): Promise<string> => {
        contents.push({ role: "user", parts: [{ text: userMessage }] })

        for (let step = 1; step <= MAX_STEPS; step++) {
            const response = await ai.models.generateContent({
                model: MODEL,
                contents,
                config: {
                    systemInstruction,
                    tools: [{ functionDeclarations }],
                },
            })

            const modelContent = response.candidates?.[0]?.content
            if (modelContent) {
                contents.push(modelContent)
            }

            if (!response.functionCalls || response.functionCalls.length === 0) {
                return response.text ?? "(no reply)"
            }

            const parts: Part[] = []
            for (const call of response.functionCalls) {
                const tool = ApplicationTools.find((t) => t.name === call.name)
                let result: unknown

                if (!tool) {
                    result = { error: `No tool named ${call.name ?? ""}` }
                } else {
                    const args = call.args ?? {}
                    let declined: string | undefined

                    if (tool.requiresConfirmation) {
                        const description = tool.describe?.(args) ?? JSON.stringify(args)
                        const { approved, reply } = await confirm(`${tool.name}: ${description}`)
                        if (!approved) {
                            const isPlainNo = ["", "n", "no"].includes(reply.toLowerCase())
                            declined = isPlainNo
                                ? "User declined this action"
                                : `User declined and said: "${reply}". Adjust and try again.`
                        }
                    }

                    if (declined) {
                        result = { error: declined }
                    } else {
                        try {
                            result = await tool.execute(args)
                        } catch (e) {
                            result = { error: String(e) }
                        }
                    }
                }

                console.log(`  [step ${step}] ${call.name}`, call.args, "->", result)
                parts.push({
                    functionResponse: {
                        name: call.name ?? "",
                        id: call.id ?? "",
                        response: { result },
                    },
                })
            }

            contents.push({ role: "user", parts })
        }

        // The last turn in history is a user turn. Add a model turn so the
        // roles still alternate for the next message.
        const stopped = `Stopped after ${MAX_STEPS} steps.`
        contents.push({ role: "model", parts: [{ text: stopped }] })
        return stopped
    }
}