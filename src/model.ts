import { GoogleGenAI } from "@google/genai";
import { ApplicationTools } from "./tools";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing. Add it to .env");
}

export const JobTracker = async (message: string) => {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
        model: "gemini-3.8-flash", contents: message, config: {
            tools: [
                { functionDeclarations: ApplicationTools.map(tool => ({ name: tool.name, description: tool.description, parameters: tool.parameters })) }
            ]
        }
    })
    return {text: response.text, functionCalls: response.functionCalls}
}
