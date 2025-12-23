const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Process recording data using Gemini 2.5 Flash
 * @param {Object} data
 * @param {string} data.rawTranscript - The raw transcript from the recording
 * @param {Array} data.uiEvents - List of UI events (clicks, scrolls, etc.)
 * @param {string} data.styleGuidelines - Style guidelines for the output
 * @param {string} data.docUseCase - The use case for the documentation
 * @returns {Promise<Object>} - Returns polished script, zoom plan, and step-by-step doc
 */
const processRecording = async ({ rawTranscript, uiEvents, styleGuidelines, docUseCase }) => {
  try {
    // Use Gemini 2.5 Flash as requested
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
      You are an expert video editor and technical writer.
      I have a raw transcript and UI events from a screen recording.
      
      Context:
      - Use Case: ${docUseCase || 'General Tutorial'}
      - Style Guidelines: ${styleGuidelines || 'Professional, concise, and friendly'}
      
      Raw Transcript:
      "${rawTranscript}"
      
      UI Events:
      ${JSON.stringify(uiEvents || [])}
      
      Please generate a JSON response with the following structure:
      {
        "polished_script": "A rewritten, professional script suitable for voiceover, matching the video flow.",
        "zoom_plan": [
          { "timestamp": 0, "zoom_level": 100, "focus_point": { "x": 0, "y": 0 }, "reason": "Intro" },
          { "timestamp": 10, "zoom_level": 150, "focus_point": { "x": 500, "y": 300 }, "reason": "Focus on button click" }
        ],
        "step_by_step_doc": [
          { "step": 1, "description": "Open the application", "timestamp": 0 },
          { "step": 2, "description": "Click on the 'Settings' button", "timestamp": 15 }
        ]
      }
      
      Ensure the JSON is valid and strictly follows the structure.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Clean up markdown code blocks if present
    const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Gemini Service Error:", error.message);
    if (error.response) {
        console.error("Gemini API Response Error:", JSON.stringify(error.response, null, 2));
    }
    throw new Error(`Failed to process recording with Gemini: ${error.message}`);
  }
};

/**
 * Generate a video script from document text
 * @param {string} text - The extracted text from the document
 * @returns {Promise<string>} - Returns the generated script
 */
const generateScriptFromDocument = async (text) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
      You are an expert video script writer.
      I have the content of a document (PDF/DOCX/TXT).
      Please convert this content into an engaging video script for a narrated presentation.
      
      Document Content:
      "${text.substring(0, 30000)}" 
      
      The script should be divided into sections corresponding to slides if possible.
      Return ONLY the raw text of the script, ready for TTS. Do not include "Scene 1" markers or stage directions unless they are part of the narration.
      Make it sound natural and professional.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini Script Generation Error:", error);
    throw new Error("Failed to generate script from document");
  }
};

module.exports = {
  processRecording,
  generateScriptFromDocument
};
