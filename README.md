# Clueso.io Clone - Technical Assignment

Full-stack functional clone of Clueso.io - an AI-powered video creation and documentation platform.

## 🎯 Project Overview

This is a technical assignment demonstrating:
- Clean, well-structured code
- Full-stack development (MERN stack)
- RESTful API design
- Mock AI service implementation
- Modern UI with React/Next.js
- JWT-based authentication

**Note**: This focuses on **feature parity** and **clean architecture**, not pixel-perfect UI replication.

## 🏗️ Architecture

### Backend (Node.js + Express + MongoDB)
- **Authentication**: JWT-based sessions
- **Database**: MongoDB with Mongoose ODM
- **AI Features**: Mocked services (clearly documented)
- **API**: RESTful endpoints with validation

### Frontend (Next.js + Tailwind CSS)
- **Framework**: Next.js 14 (React)
- **Styling**: Tailwind CSS
- **State**: React Context API
- **API Client**: Axios with interceptors

## 📁 Project Structure

```
Clueso.io clone project/
├── backend/
│   ├── src/
│   │   ├── config/          # DB connection
│   │   ├── models/          # Mongoose schemas
│   │   ├── controllers/     # Business logic
│   │   ├── routes/          # API routes
│   │   ├── middleware/      # Auth, validation
│   │   ├── utils/           # AI service (MOCKED), JWT
│   │   └── server.js        # Express app
│   ├── package.json
│   └── README.md
│
└── frontend/
    ├── pages/               # Next.js pages
    ├── contexts/            # React contexts
    ├── lib/                 # API client
    ├── styles/              # Global CSS
    ├── package.json
    └── README.md
```

## 🚀 Quick Start

**👉 For detailed step-by-step instructions, see [SETUP.md](SETUP.md)**

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### 1. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret
npm run dev
```

Backend runs on: **http://localhost:5000**

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on: **http://localhost:3000**

## 🎬 Demo & Features Walkthrough

### Complete User Flow
1. **Sign up** → Create account with email/password
2. **Create workspace** → Your first project container
3. **Upload video** → Add title & description (file upload mocked)
4. **Open editor** → Click on video to edit
5. **Apply AI magic** → Enable features and process
6. **Edit script** → Clean up transcript manually
7. **Export** → Download in multiple formats
8. **Documentation** → Generate step-by-step guide

See the full demo video: [Link to be added]

## 📝 Features

### ✅ Implemented

**Authentication**
- User signup with validation
- Login with JWT tokens
- Protected routes
- Session management

**Workspaces**
- Create/manage workspaces
- Team collaboration structure
- Branding settings
- Workspace switching

**Videos**
- Upload videos (mocked file handling)
- List videos by workspace
- Video metadata management
- AI processing pipeline (mocked)

**AI Features (Mocked)**
- Transcription generation
- Filler word removal
- AI voiceover generation
- Auto-zoom detection
- Caption generation
- Documentation from videos
- Translation (31+ languages)

**Documentation**
- Generate step-by-step guides
- Screenshot management
- Multi-format export
- Translation support

### 🔧 Mock AI Implementation

All AI features are **clearly mocked** in `/backend/src/utils/aiService.js`:

```javascript
/**
 * Mock AI Service
 * NOTE: This is a MOCK implementation for the technical assignment.
 * In production, this would integrate with:
 * - OpenAI Whisper for transcription
 * - ElevenLabs for voiceovers
 * - Custom ML models for filler detection
 */
```

## 🔌 API Endpoints

### Authentication
```
POST /api/auth/signup        # Create account
POST /api/auth/login         # Login
GET  /api/auth/me            # Get current user
```

### Workspaces
```
GET    /api/workspaces       # List workspaces
POST   /api/workspaces       # Create workspace
GET    /api/workspaces/:id   # Get workspace
PUT    /api/workspaces/:id   # Update workspace
POST   /api/workspaces/:id/members  # Add member
```

### Videos
```
GET    /api/videos?workspaceId=:id  # List videos
POST   /api/videos                   # Create video
GET    /api/videos/:id               # Get video
PUT    /api/videos/:id               # Update video
POST   /api/videos/:id/process       # Trigger AI processing
DELETE /api/videos/:id               # Delete video
```

### Documentation
```
POST /api/documentation                 # Generate from video
GET  /api/documentation/:id             # Get docs
PUT  /api/documentation/:id             # Update docs
POST /api/documentation/:id/translate   # Translate
POST /api/documentation/:id/export      # Export
```

## 🎨 Tech Decisions

### Backend
- **Express**: Lightweight, flexible routing
- **MongoDB**: Document structure fits video metadata well
- **JWT**: Stateless authentication
- **Mongoose**: Schema validation, relationships
- **bcryptjs**: Secure password hashing

### Frontend
- **Next.js**: SSR capabilities, routing, optimization
- **Tailwind**: Rapid UI development, consistent styling
- **Context API**: Simple state management
- **Axios**: Clean API client with interceptors

## 📊 Data Models

**User**: Authentication and profile  
**Workspace**: Collaboration container  
**Video**: Video projects with AI features  
**Documentation**: Generated guides  
**Template**: Branding templates  

See `/backend/src/models/` for detailed schemas.

## 🧪 Testing the Application

1. **Start both servers** (backend on 5000, frontend on 3000)
2. **Sign up** at http://localhost:3000/signup
3. **Create a workspace** on the dashboard
4. **Create a video** (uses mock file data)
5. **Watch AI processing** (simulated delays)
6. Videos show status: uploading → processing → ready

## 🔐 Security

- Passwords hashed with bcrypt (10 salt rounds)
- JWT tokens with expiration
- Protected API routes with middleware
- Input validation on all endpoints
- CORS configuration
- SQL injection prevention (NoSQL)

## 📈 Future Enhancements

- Real file upload (Multer + AWS S3)
- Actual AI integration (OpenAI, ElevenLabs)
- Video player UI
- Real-time processing updates (WebSockets)
- Advanced video editor
- Template marketplace
- Analytics dashboard

## 🎓 What This Demonstrates

✅ Full-stack MERN development  
✅ RESTful API design  
✅ Database modeling  
✅ Authentication & authorization  
✅ Clean code organization  
✅ Error handling  
✅ Modern React patterns  
✅ Responsive design  

## 📄 License

This is a technical assignment project for demonstration purposes.

---

**Built with ❤️ for the technical assignment**
