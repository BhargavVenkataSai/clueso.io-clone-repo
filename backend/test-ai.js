/**
 * Quick test script for AI services
 * Run with: node test-ai.js
 */
require('dotenv').config();

const { testGemini, testElevenLabs, testTTSGeneration } = require('./src/services/aiHealthCheck');

async function main() {
    console.log('\n🔍 Testing AI Services...\n');
    
    // Test Gemini
    console.log('1️⃣ Testing Gemini AI...');
    const geminiResult = await testGemini();
    console.log('   Result:', geminiResult);
    
    // Test ElevenLabs
    console.log('\n2️⃣ Testing ElevenLabs...');
    const elevenLabsResult = await testElevenLabs();
    console.log('   Result:', elevenLabsResult);
    
    // Test TTS Generation
    console.log('\n3️⃣ Testing TTS Generation...');
    const ttsResult = await testTTSGeneration();
    console.log('   Result:', ttsResult);
    
    console.log('\n✅ Tests complete!\n');
}

main().catch(console.error);
