/**
 * AI Services Health Check & Test Service
 * Verifies Gemini and ElevenLabs are configured and working
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");
const { ElevenLabsClient } = require("@elevenlabs/elevenlabs-js");

/**
 * Test Gemini API connectivity and functionality
 */
const testGemini = async () => {
    const startTime = Date.now();
    
    if (!process.env.GEMINI_API_KEY) {
        return {
            service: 'Gemini',
            status: 'error',
            message: 'GEMINI_API_KEY not configured in .env',
            latency: 0
        };
    }

    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        
        // Simple test prompt
        const result = await model.generateContent("Say 'Hello' in one word.");
        const response = await result.response;
        const text = response.text().trim();
        
        const latency = Date.now() - startTime;
        
        return {
            service: 'Gemini',
            status: 'success',
            message: `Gemini is working! Response: "${text}"`,
            model: 'gemini-2.5-flash',
            latency: `${latency}ms`
        };
    } catch (error) {
        const latency = Date.now() - startTime;
        
        // Check for specific error types
        if (error.status === 429 || error.message?.includes('429')) {
            return {
                service: 'Gemini',
                status: 'rate_limited',
                message: 'Gemini API rate limit reached. Try again later.',
                latency: `${latency}ms`
            };
        }
        
        if (error.message?.includes('API_KEY')) {
            return {
                service: 'Gemini',
                status: 'error',
                message: 'Invalid Gemini API key',
                latency: `${latency}ms`
            };
        }
        
        return {
            service: 'Gemini',
            status: 'error',
            message: error.message,
            latency: `${latency}ms`
        };
    }
};

/**
 * Test ElevenLabs API connectivity and functionality
 */
const testElevenLabs = async () => {
    const startTime = Date.now();
    
    if (!process.env.ELEVENLABS_API_KEY) {
        return {
            service: 'ElevenLabs',
            status: 'error',
            message: 'ELEVENLABS_API_KEY not configured in .env',
            latency: 0
        };
    }

    try {
        const elevenlabs = new ElevenLabsClient({
            apiKey: process.env.ELEVENLABS_API_KEY
        });
        
        // Test by fetching available voices (more reliable than user endpoint)
        const voices = await elevenlabs.voices.getAll();
        const latency = Date.now() - startTime;
        
        return {
            service: 'ElevenLabs',
            status: 'success',
            message: 'ElevenLabs is working!',
            voices_available: voices.voices?.length || 0,
            latency: `${latency}ms`
        };
    } catch (error) {
        const latency = Date.now() - startTime;
        
        if (error.statusCode === 401 || error.message?.includes('401')) {
            return {
                service: 'ElevenLabs',
                status: 'error',
                message: 'Invalid ElevenLabs API key',
                latency: `${latency}ms`
            };
        }
        
        return {
            service: 'ElevenLabs',
            status: 'error',
            message: error.message,
            latency: `${latency}ms`
        };
    }
};

/**
 * Test TTS generation with a short sample
 */
const testTTSGeneration = async () => {
    const startTime = Date.now();
    
    if (!process.env.ELEVENLABS_API_KEY) {
        return {
            service: 'ElevenLabs TTS',
            status: 'skipped',
            message: 'ElevenLabs not configured, would use Google TTS fallback',
            latency: 0
        };
    }

    try {
        const elevenlabs = new ElevenLabsClient({
            apiKey: process.env.ELEVENLABS_API_KEY
        });
        
        // Generate a very short audio sample
        const audio = await elevenlabs.textToSpeech.convert(
            "21m00Tcm4TlvDq8ikWAM", // Rachel voice
            {
                text: "Hello",
                model_id: "eleven_multilingual_v2",
                output_format: "mp3_44100_128"
            }
        );

        // Read the stream to verify it works
        const chunks = [];
        for await (const chunk of audio) {
            chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);
        
        const latency = Date.now() - startTime;
        
        return {
            service: 'ElevenLabs TTS',
            status: 'success',
            message: `TTS generation working! Generated ${buffer.length} bytes`,
            audio_size: `${(buffer.length / 1024).toFixed(2)} KB`,
            latency: `${latency}ms`
        };
    } catch (error) {
        const latency = Date.now() - startTime;
        
        return {
            service: 'ElevenLabs TTS',
            status: 'error',
            message: error.message,
            latency: `${latency}ms`
        };
    }
};

/**
 * Run all service tests
 */
const runAllTests = async () => {
    console.log('\n🔍 Running AI Services Health Check...\n');
    
    const results = {
        timestamp: new Date().toISOString(),
        tests: []
    };

    // Test Gemini
    console.log('Testing Gemini...');
    const geminiResult = await testGemini();
    results.tests.push(geminiResult);
    console.log(`  ${geminiResult.status === 'success' ? '✅' : '❌'} ${geminiResult.message}`);

    // Test ElevenLabs
    console.log('Testing ElevenLabs...');
    const elevenLabsResult = await testElevenLabs();
    results.tests.push(elevenLabsResult);
    console.log(`  ${elevenLabsResult.status === 'success' ? '✅' : '❌'} ${elevenLabsResult.message}`);

    // Test TTS Generation
    console.log('Testing TTS Generation...');
    const ttsResult = await testTTSGeneration();
    results.tests.push(ttsResult);
    console.log(`  ${ttsResult.status === 'success' ? '✅' : ttsResult.status === 'skipped' ? '⚠️' : '❌'} ${ttsResult.message}`);

    // Calculate overall status
    const allSuccess = results.tests.every(t => t.status === 'success' || t.status === 'skipped');
    results.overall = allSuccess ? 'healthy' : 'degraded';
    
    console.log(`\n📊 Overall Status: ${results.overall.toUpperCase()}\n`);

    return results;
};

module.exports = {
    testGemini,
    testElevenLabs,
    testTTSGeneration,
    runAllTests
};
