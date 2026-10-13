import { GoogleGenAI } from "@google/genai";
import { ApplicationTools } from "./tools";
import { error } from "node:console";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing. Add it to .env");
}


const MAX_STEPS = 6

export const runAgent = async (userMessage: string) => {
    const contents = [
        { role: 'user', parts: [{ text: userMessage }] }
    ]
    const ai = new GoogleGenAI({ apiKey });
    let agentLoopNumber = 0
    while (agentLoopNumber < MAX_STEPS) {
        const response = await ai.models.generateContent({
            model: "gemini-3.8-flash", contents, config: {
                tools: [
                    { functionDeclarations: ApplicationTools.map(tool => ({ name: tool.name, description: tool.description, parameters: tool.parameters })) }
                ]
            }
        })
        if (!response.functionCalls || response.functionCalls.length === 0) {
            return response.text
        } else {
            response.functionCalls.forEach(call => {
                const tool = ApplicationTools.find(u => u.name === call.name)
                if (!tool) {
                    contents.push({ role: 'user', parts: [{ functionResponse: { name: call.name, id: call.id, response: { error: `No tools found in the name ${call.name}` } } }] })
                }
                try {
                    const callResponse = tool?.execute({ args: call.args ?? {} })
                    contents.push(callResponse?.candidates?.[0]?.content ?? { error: 'No proper respponse form the tool' })
                }catch(e){
                    contents.push({ error: 'Error while calling the tool' + e })
                }
                })
        }
        agentLoopNumber++
    }
}