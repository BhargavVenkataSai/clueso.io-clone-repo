const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function listModels() {
  try {
    console.log("Listing available models...");
    // Direct REST call if SDK doesn't expose listModels easily or acts up
    // But SDK has GoogleGenerativeAI.getGenerativeModel... 
    // Actually SDK doesn't expose listModels directly on the main class in all versions.
    // Let's try to infer or use a simple test with 'gemini-1.0-pro' vs 'gemini-1.5-flash'
    
    // Attempting a simple generation with a known legacy model first
    const modelNames = ['gemini-2.5-flash'];
    
    for (const name of modelNames) {
        console.log(`\nTesting model: ${name}`);
        try {
            const model = genAI.getGenerativeModel({ model: name });
            const result = await model.generateContent("Hello");
            console.log(`✅ ${name} IS WORKING!`);
            return; // Found one!
        } catch (error) {
            console.log(`❌ ${name} failed:`, error.message.split(' ').slice(0, 10).join(' ') + '...');
        }
    }

  } catch (error) {
    console.error("Error:", error);
  }
}

listModels();
