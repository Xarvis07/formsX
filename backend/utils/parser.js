const mammoth = require('mammoth');
const { GoogleGenAI } = require('@google/genai');

async function extractQuestionsFromDocx(buffer, apiKey) {
  try {
    // 1. Extract text from docx
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value;

    if (!text || text.trim() === '') {
      throw new Error("No text found in the document");
    }

    if (!apiKey) {
      throw new Error("Gemini API key is not configured.");
    }

    // 2. Use Gemini to parse text into structured JSON
    const ai = new GoogleGenAI({ apiKey: apiKey });
    const prompt = `
You are an expert at extracting quiz questions from text. 
I have a document containing programming questions.
Extract all multiple-choice questions from the text below. 
Return ONLY a valid JSON array of objects.
Each object must have exactly these keys:
- "text": The question text.
- "options": An array of exactly 4 string options.
- "correctAnswer": The exact string of the correct option.
- "topic": A short 1-2 word topic for the question (e.g., "Variables", "Loops").

If correct answers are not explicitly marked, do your best to infer the correct programming answer based on standard CSE/IT knowledge.

Document Text:
${text}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const outputText = response.text;
    const questions = JSON.parse(outputText);
    return questions;
  } catch (error) {
    console.error("Error in extractQuestionsFromDocx:", error);
    throw error;
  }
}

module.exports = { extractQuestionsFromDocx };
