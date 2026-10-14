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

const confirm = async (question: string): Promise<boolean> => {
    const answer = await ask(question)
    return answer.trim().toLowerCase() === "y"
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
                    let approved = true
                    if (tool.requiresConfirmation) {
                        const detail = tool.describe
                            ? tool.describe(args)
                            : JSON.stringify(args)
                        approved = await confirm(
                            `\n${tool.name}: ${detail}\nApprove? (y/n) `
                        )
                    }
                    if (!approved) {
                        result = { error: "User declined this action" }
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