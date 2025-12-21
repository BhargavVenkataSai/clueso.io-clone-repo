const axios = require('axios');

async function testGemini() {
  try {
    console.log("Testing Gemini API via Backend...");
    // Mocking the request expected by aiService or a similar endpoint
    // We don't have a direct "test" endpoint, but we can try to call the generate script function 
    // OR we can just try to use the audio service if we can.
    // Actually, `videoController` has `processAudioFull` at `/audio-full-process`.
    // It expects { script: string, voiceId: string, speed: number }.
    
    // Let's assume the backend is running at localhost:5000
    const response = await axios.post('http://localhost:5000/api/videos/audio-full-process', {
      script: "This is a test of the Gemini API key.",
      voiceId: "en-US-Journey-F", // Standard Google TTS voice
      speed: 1
    });

    console.log("Response Status:", response.status);
    console.log("Response Data:", response.data);
    
    if (response.status === 200 && response.data.audioPath) {
        console.log("SUCCESS: API Key is valid and Audio generated.");
    } else {
        console.log("FAILURE: Unexpected response format.");
    }

  } catch (error) {
    console.error("ERROR: API Call Failed.");
    if (error.response) {
        console.error("Status:", error.response.status);
        console.error("Data:", error.response.data);
    } else {
        console.error(error.message);
    }
  }
}

testGemini();
