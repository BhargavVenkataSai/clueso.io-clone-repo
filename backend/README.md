# Clueso.io Clone - Backend API Link: https://clueso-io-clone-repo.onrender.com

AI-powered video creation and documentation platform backend.

## Architecture

```
src/
├── config/         # Configuration files (DB, environment)
├── models/         # Mongoose schemas (User, Workspace, Video, Documentation, Template)
├── controllers/    # Business logic handlers
├── services/       # External services (Gemini AI)
├── routes/         # API route definitions
├── middleware/     # Auth, validation, error handling
├── utils/          # Helper functions (AI mock service, JWT)
└── server.js       # Express app entry point
```

## Setup

1. Copy `.env.example` to `.env` and configure
2. Install dependencies: `npm install`
3. Start MongoDB locally
4. Run dev server: `npm run dev`

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new user
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/me` - Get current user profile

### Workspaces
- `GET /api/workspaces` - List user's workspaces
- `POST /api/workspaces` - Create new workspace
- `GET /api/workspaces/:id` - Get workspace details
- `PUT /api/workspaces/:id` - Update workspace
- `POST /api/workspaces/:id/members` - Add team member

### Videos
- `GET /api/videos?workspaceId=:id` - List workspace videos
- `POST /api/videos` - Upload/create new video
- `GET /api/videos/:id` - Get video details
- `PUT /api/videos/:id` - Update video settings
- `POST /api/videos/:id/process` - Trigger AI processing
- `DELETE /api/videos/:id` - Delete video

### AI Services
- `POST /api/ai/process-recording` - Process recording with Gemini
- `POST /api/ai/summarize/:projectId` - Generate summary

### Documentation
- `POST /api/documentation` - Generate docs from video
- `GET /api/documentation/:id` - Get documentation
- `GET /api/documentation/video/:videoId` - Get docs for video
- `PUT /api/documentation/:id` - Update documentation
- `POST /api/documentation/:id/translate` - Translate to language
- `POST /api/documentation/:id/export` - Export in format

## Features

### AI Processing (Mocked)
- **Transcription**: Audio to text conversion
- **Filler Word Removal**: Clean up "um", "uh", etc.
- **AI Voiceovers**: Natural-sounding voice generation
- **Auto-Zoom**: Intelligent zoom detection
- **Captions**: Auto-generated time-synced captions
- **Documentation**: Step-by-step guides from videos
- **Translation**: 31+ languages support

### Real Features
- User authentication with JWT
- Workspace collaboration
- Video management
- Template system
- Documentation generation
- Export functionality

## Notes

- **AI features are MOCKED** for this technical assignment
- All mock AI logic is in `/utils/aiService.js`
- File uploads use mock data (in production, use Multer + S3)
- JWT tokens expire based on JWT_EXPIRES_IN env variable
- All protected routes require `Authorization: Bearer <token>` header
