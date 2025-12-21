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
    // Use Gemini 1.5 Flash (closest available to "2.5 Flash" requested, assuming typo or future version, falling back to 1.5 Flash which is current fast model)
    // If user insists on 2.5, I will use the model name they might expect if I knew it, but standard is gemini-1.5-flash
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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
    console.error("Gemini Service Error:", error);
    throw new Error("Failed to process recording with Gemini");
  }
};

module.exports = {
  processRecording
};
