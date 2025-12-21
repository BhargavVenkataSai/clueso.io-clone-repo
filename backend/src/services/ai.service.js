const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'mock-key');

/**
 * Generate a summary of feedback for a project
 * @param {Array} feedbackList - List of feedback objects
 * @returns {Object} - { sentiment, themes, insights }
 */
const generateProjectSummary = async (feedbackList) => {
  try {
    if (!feedbackList || feedbackList.length === 0) {
      return {
        sentiment: 'neutral',
        themes: [],
        insights: ['No feedback available to analyze.']
      };
    }

    // Prepare prompt
    const feedbackText = feedbackList.map(f => `- ${f.message}`).join('\n');
    const prompt = `
      Analyze the following user feedback for a project and provide a summary.
      
      Feedback:
      ${feedbackText}
      
      Please provide the output in the following JSON format:
      {
        "sentiment": "positive" | "neutral" | "negative",
        "themes": ["theme1", "theme2", ...],
        "insights": ["insight1", "insight2", "insight3", ...]
      }
      
      Limit to 3-5 actionable insights.
    `;

    // Call Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse JSON
    // Gemini might wrap JSON in markdown code blocks, strip them
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const data = JSON.parse(jsonStr);

    return data;
  } catch (error) {
    console.error('AI Summary Error:', error);
    // Fallback if AI fails
    return {
      sentiment: 'neutral',
      themes: ['Error analyzing feedback'],
      insights: ['Could not generate insights at this time.']
    };
  }
};

module.exports = {
  generateProjectSummary
};
