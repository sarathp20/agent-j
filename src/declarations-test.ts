import { connectMcp, toGeminiDeclarations } from "./mcp-client";
import { GoogleGenAI, type Content } from "@google/genai"

const apiKey = process.env.GEMINI_API_KEY
if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing. Add it to .env")
}

const MODEL = process.env.GEMINI_MODEL ?? "gemini-3.5-flash-lite"

const ai = new GoogleGenAI({ apiKey })

const mcp = await connectMcp()

try {
    const generatedTools = toGeminiDeclarations(mcp.tools)
    const contents: Content[] = [{role: "user", parts: [{ text: 'Which applications do I have for IBM?' }] }]
    const response = await ai.models.generateContent({
        model: MODEL,
        contents,
        config: {
            tools: [{ functionDeclarations: generatedTools }],
        },
    })
    console.log(response.functionCalls)
   console.log(response.text)

} finally {
    await mcp.close()
}
