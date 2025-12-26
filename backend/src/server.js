require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const { testGemini, testElevenLabs } = require('./services/aiHealthCheck');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/projects', require('./routes/projectRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));
app.use('/api/workspaces', require('./routes/workspaceRoutes'));
app.use('/api/videos', require('./routes/videoRoutes'));
app.use('/api/feedback', require('./routes/feedbackRoutes'));
app.use('/api/rag', require('./routes/ragRoutes'));
app.use('/api/documentation', require('./routes/documentationRoutes'));

// Serve uploads statically
app.use('/uploads', express.static('src/uploads'));

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Clueso Clone API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      workspaces: '/api/workspaces',
      videos: '/api/videos',
      documentation: '/api/documentation'
    }
  });
});

// API Documentation
app.get('/docs', (req, res) => {
  res.json({
    title: 'Clueso Clone API Documentation',
    version: '1.0.0',
    description: 'AI-Powered Video Creation Platform API',
    baseUrl: `http://localhost:${PORT}`,
    endpoints: [
      {
        group: 'Authentication',
        baseRoute: '/api/auth',
        routes: [
          { method: 'POST', path: '/signup', description: 'Register new user' },
          { method: 'POST', path: '/login', description: 'Login user' },
          { method: 'GET', path: '/me', description: 'Get current user', auth: true }
        ]
      },
      {
        group: 'Workspaces',
        baseRoute: '/api/workspaces',
        routes: [
          { method: 'GET', path: '/', description: 'Get all workspaces', auth: true },
          { method: 'POST', path: '/', description: 'Create workspace', auth: true },
          { method: 'GET', path: '/:id', description: 'Get workspace by ID', auth: true },
          { method: 'PUT', path: '/:id', description: 'Update workspace', auth: true },
          { method: 'POST', path: '/:id/members', description: 'Add member', auth: true }
        ]
      },
      {
        group: 'Videos',
        baseRoute: '/api/videos',
        routes: [
          { method: 'GET', path: '/', description: 'Get all videos', auth: true },
          { method: 'POST', path: '/', description: 'Create video', auth: true },
          { method: 'GET', path: '/:id', description: 'Get video by ID', auth: true },
          { method: 'PUT', path: '/:id', description: 'Update video', auth: true },
          { method: 'DELETE', path: '/:id', description: 'Delete video', auth: true },
          { method: 'POST', path: '/:id/process', description: 'Process video with AI', auth: true },
          { method: 'POST', path: '/:id/export', description: 'Export video', auth: true }
        ]
      },
      {
        group: 'Documentation',
        baseRoute: '/api/documentation',
        routes: [
          { method: 'POST', path: '/', description: 'Generate documentation', auth: true },
          { method: 'GET', path: '/:id', description: 'Get documentation by ID', auth: true },
          { method: 'GET', path: '/video/:videoId', description: 'Get docs by video ID', auth: true },
          { method: 'PUT', path: '/:id', description: 'Update documentation', auth: true },
          { method: 'POST', path: '/:id/translate', description: 'Translate documentation', auth: true },
          { method: 'POST', path: '/:id/export', description: 'Export documentation', auth: true }
        ]
      }
    ]
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Chrome DevTools handler (suppress 404)
app.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => {
  res.status(204).end();
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Function to check AI services on startup
async function checkAIServices() {
  console.log('\n🔍 Checking AI Services...');
  
  // Check Gemini
  const geminiResult = await testGemini();
  if (geminiResult.status === 'success') {
    console.log(`   ✅ Gemini AI: Connected (${geminiResult.latency})`);
  } else if (geminiResult.status === 'rate_limited') {
    console.log(`   ⚠️  Gemini AI: Rate limited (will retry later)`);
  } else {
    console.log(`   ❌ Gemini AI: ${geminiResult.message}`);
  }

  // Check ElevenLabs
  const elevenLabsResult = await testElevenLabs();
  if (elevenLabsResult.status === 'success') {
    console.log(`   ✅ ElevenLabs TTS: Connected (${elevenLabsResult.voices_available} voices, ${elevenLabsResult.latency})`);
  } else {
    console.log(`   ❌ ElevenLabs TTS: ${elevenLabsResult.message}`);
    console.log(`   ⚠️  Fallback: Google TTS will be used`);
  }

  console.log('');
}

// Start server
app.listen(PORT, async () => {
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║     🎬 CLUESO CLONE - VIDEO PLATFORM       ║');
  console.log('╚════════════════════════════════════════════╝\n');
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Backend URL: http://localhost:${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Check AI services after startup
  await checkAIServices();
  
  console.log('✨ Server is ready to accept requests!\n');
});

module.exports = app;

