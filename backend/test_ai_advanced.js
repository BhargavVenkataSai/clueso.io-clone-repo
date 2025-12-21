const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';
let token = '';

async function testAIProcessor() {
    try {
        console.log("🚀 Testing Advanced AI Processor...");

        // 1. Login to get token
        const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'test_1766320250874@example.com', // Using previously created user or generic
            password: 'password123'
        }).catch(async err => {
            // If user doesn't exist, signup a new one
            const email = `ai_tester_${Date.now()}@example.com`;
            await axios.post(`${BASE_URL}/auth/signup`, { name: 'AI Tester', email, password: 'password123' });
            return await axios.post(`${BASE_URL}/auth/login`, { email, password: 'password123' });
        });

        token = loginRes.data.token || loginRes.data.data?.token;
        console.log("   ✅ Authenticated");

        // 2. Mock Input Data
        const inputData = {
            raw_transcript: "Um, so today I'm going to show you how to create a new project in Clueso. First click on the create button, then type the name, and basically that's it.",
            ui_events: [
                { timestamp_sec: 1.2, event_type: "click", target_description: "Clicked 'Create Project' button" },
                { timestamp_sec: 2.5, event_type: "input", target_description: "Typed 'My Demo Project' into Name field" },
                { timestamp_sec: 4.0, event_type: "click", target_description: "Clicked 'Save' button" }
            ],
            video_metadata: { duration: 10, resolution: "1920x1080" },
            style_guidelines: "Friendly, concise, professional",
            doc_use_case: "User Onboarding"
        };

        // 3. Call AI Endpoint
        console.log("   ⏳ Sending Request to Gemini...");
        const aiRes = await axios.post(`${BASE_URL}/videos/process-ai`, inputData, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        console.log("   ✅ AI Response Received!");
        console.log(JSON.stringify(aiRes.data.data, null, 2));

    } catch (err) {
        console.error("❌ Test Failed Full Error:");
        if (err.response) {
            console.error("Status:", err.response.status);
            console.error("Data:", JSON.stringify(err.response.data, null, 2));
        } else {
            console.error("Message:", err.message);
            console.error(err);
        }
    }
}

testAIProcessor();
