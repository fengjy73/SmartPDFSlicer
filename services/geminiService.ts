import { GoogleGenAI } from "@google/genai";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Please set your API Key.");
  }
  return new GoogleGenAI({ apiKey });
};

export const analyzeContent = async (
  contextText: string,
  images: string[],
  prompt: string, 
  customSystemPrompt?: string
): Promise<string> => {
  try {
    const ai = getClient();
    
    const modelId = "gemini-2.5-flash"; 

    const parts: any[] = [];

    // Add text context
    if (contextText) {
      parts.push({ text: "Here is the text extracted from the selected PDF pages:" });
      parts.push({ text: contextText });
    }

    // Add image context
    if (images && images.length > 0) {
      parts.push({ text: "Here are the images of the selected pages for visual reference (charts, diagrams, layout):" });
      images.forEach(base64Data => {
        parts.push({
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Data
          }
        });
      });
    }

    parts.push({ text: "User Question: " + prompt });

    const defaultSystemPrompt = "You are a helpful AI assistant analyzing specific chapters of a PDF document. Answer the user's questions based strictly on the provided text and visual context. Use Markdown for formatting.";

    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        role: 'user',
        parts: parts
      },
      config: {
        systemInstruction: customSystemPrompt || defaultSystemPrompt,
      }
    });

    return response.text || "I couldn't generate a response based on the content.";

  } catch (error) {
    console.error("Gemini API Error:", error);
    // Rethrow error so the UI can display it
    throw error;
  }
};