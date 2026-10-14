import { GoogleGenAI, type Content, type Part } from "@google/genai";
import { ApplicationTools } from "./tools";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing. Add it to .env");
}


const MAX_STEPS = 6

export const runAgent = async (userMessage: string) => {
    const contents: Content[] = [{ role: "user", parts: [{ text: userMessage }] }];
    const ai = new GoogleGenAI({ apiKey });

    for (let step = 1; step <= MAX_STEPS; step++) {
        const response = await ai.models.generateContent({
            model: "gemini-3.5-flash-lite", contents, config: {
                tools: [
                    { functionDeclarations: ApplicationTools.map(tool => ({ name: tool.name, description: tool.description, parameters: tool.parameters })) }
                ]
            }
        })
        if (!response.functionCalls || response.functionCalls.length === 0) {
            return response.text
        }
        if (response.candidates?.[0]?.content) {
            contents.push(response.candidates?.[0]?.content)
        }
        const parts: Part[] = []
        for (const call of response.functionCalls) {
            const tool = ApplicationTools.find(u => u.name === call.name)
            if (!tool) {
                parts.push({ functionResponse: { name: call.name ?? '', id: call.id ?? '', response: { error: `No tools found in the name ${call.name ?? ''}` } } })
            } else {
                let result
                try {
                    result = await tool.execute(call.args ?? {})
                } catch (e) {
                    result = { error: String(e) }
                }
                console.log(`step ${step}:`, call.name, call.args, "->", result)
                parts.push({ functionResponse: { name: call.name ?? '', id: call.id ?? '', response: { result } } })
            }
        }
        contents.push({ role: "user", parts })
    }
    return `Stopped after ${MAX_STEPS} steps.`
}