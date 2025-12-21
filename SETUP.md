# 🎬 Clueso.io Clone - Complete Setup Guide

Step-by-step instructions to run the application locally.

## Prerequisites

Before you begin, ensure you have installed:

- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **MongoDB** - Choose one option:
  - **Local**: [Download MongoDB Community](https://www.mongodb.com/try/download/community)
  - **Cloud**: [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (Free tier available)
- **Git** - [Download here](https://git-scm.com/)

## Step 1: Clone the Repository

```bash
git clone <your-repository-url>
cd "Clueso.io clone project"
```

## Step 2: Set Up MongoDB

### Option A: Local MongoDB

1. Start MongoDB service:
```bash
# Windows
net start MongoDB

# macOS/Linux
sudo systemctl start mongod
```

2. Your connection string will be:
```
mongodb://localhost:27017/clueso_clone
```

### Option B: MongoDB Atlas (Cloud)

1. Create a free account at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster (free tier M0)
3. Create a database user with password
4. Whitelist your IP address (or use 0.0.0.0/0 for development)
5. Get your connection string (looks like):
```
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/clueso_clone
```

## Step 3: Backend Setup

```bash
# Navigate to backend folder
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

### Configure Backend Environment

Open `backend/.env` and update:

```bash
# Server Configuration
PORT=5000
NODE_ENV=development

# Database - Replace with your MongoDB connection string
MONGODB_URI=mongodb://localhost:27017/clueso_clone
# OR for Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/clueso_clone

# Authentication - Change this to a random string
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production_123456
JWT_EXPIRES_IN=7d

# CORS - Frontend URL
CORS_ORIGIN=http://localhost:3000
```

### Start Backend Server

```bash
npm run dev
```

You should see:
```
🚀 Server running on port 5000
📝 Environment: development
✅ MongoDB Connected: localhost
```

**Backend is now running at**: http://localhost:5000

Test it: Open http://localhost:5000/health in your browser

## Step 4: Frontend Setup

Open a **new terminal** window:

```bash
# Navigate to frontend folder (from project root)
cd frontend

# Install dependencies
npm install
```

### Frontend Environment

The file `.env.local` is already created with:
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

No changes needed unless you changed the backend port.

### Start Frontend Server

```bash
npm run dev
```

You should see:
```
ready - started server on 0.0.0.0:3000, url: http://localhost:3000
```

**Frontend is now running at**: http://localhost:3000

## Step 5: Access the Application

Open your browser and go to:
```
http://localhost:3000
```

You should see the Clueso Clone landing page!

## 🎯 Complete User Journey

### 1. Create Account

1. Click "Start Free Trial" or "Sign Up"
2. Fill in:
   - Name: John Doe
   - Email: john@example.com
   - Password: password123 (minimum 6 characters)
3. Click "Create Account"
4. You'll be automatically logged in and redirected to dashboard

### 2. Create Your First Workspace

1. The dashboard will prompt you to create a workspace
2. Click "Create Workspace" or the modal will auto-open
3. Enter:
   - Name: "My Product Videos"
   - Description: (optional) "Product demo videos"
4. Click "Create"

### 3. Upload Your First Video

1. Click "+ Create Video" button
2. Fill in:
   - Title: "How to Use Feature X"
   - Description: (optional) "Tutorial for new users"
3. Click "Upload"
   - Note: File upload is mocked - no actual file needed!
4. Video will appear in your dashboard with status "processing"

### 4. Edit Video with AI

1. Click on the video card to open the editor
2. You'll see:
   - Video preview area
   - Script tab with original transcript
   - AI Features panel on the right
3. Enable AI features (checkboxes):
   - ✅ Remove Filler Words
   - ✅ AI Voiceover (select a voice)
   - ✅ Smart Auto-Zoom
   - ✅ Generate Captions
   - ✅ Create Documentation
4. Click "✨ Apply AI Magic"
5. Wait 3-5 seconds for processing
6. See the cleaned script and enabled features marked as "✓ Applied"

### 5. Edit the Script

1. Click on "Script" tab
2. See original transcript (with filler words)
3. Edit the cleaned script in the text area
4. Click "Save Changes"

### 6. View Captions

1. Click "Captions" tab
2. See auto-generated time-synced captions
3. Each caption shows timestamp and text

### 7. Export Video

1. Click "Export" button in the header
2. Choose options:
   - Format: MP4, GIF, or WebM
   - Quality: 4K, 1080p, 720p, or 480p
   - Include Subtitles: checkbox
3. Click "Export"
4. You'll get a success message with export details

### 8. Generate Documentation

1. In the right sidebar, find "Documentation" section
2. Click "Generate Documentation"
3. AI creates a step-by-step guide from your video
4. Click "View Documentation" to see the guide

## 🐛 Troubleshooting

### Backend won't start

**Error: "MongoDB connection failed"**
```bash
# Check if MongoDB is running
# Windows:
sc query MongoDB

# macOS/Linux:
sudo systemctl status mongod

# If not running, start it (see Step 2)
```

**Error: "Port 5000 is already in use"**
```bash
# Change PORT in backend/.env to a different number (e.g., 5001)
PORT=5001

# Also update frontend/.env.local:
NEXT_PUBLIC_API_URL=http://localhost:5001/api
```

### Frontend won't connect to backend

**Check backend is running**: Open http://localhost:5000/health

**CORS error in browser console**:
- Make sure CORS_ORIGIN in backend/.env matches your frontend URL
- Default should be: `CORS_ORIGIN=http://localhost:3000`

### Can't create account

**"User already exists" error**:
- Email is already registered
- Try a different email or login instead

**"Validation failed" error**:
- Make sure password is at least 6 characters
- Make sure email is valid format

### Videos not processing

**Status stuck on "processing"**:
- Refresh the page
- Check backend terminal for errors
- AI processing is mocked and should complete in 3-5 seconds

## 🔧 Development Tips

### View Database

Use MongoDB Compass to view your data:
1. Download [MongoDB Compass](https://www.mongodb.com/products/compass)
2. Connect to `mongodb://localhost:27017`
3. Open `clueso_clone` database

### Check API Responses

Use browser DevTools:
1. Open DevTools (F12)
2. Go to Network tab
3. Perform actions in the app
4. Click on API calls to see requests/responses

### Reset Database

To start fresh:
```bash
# In MongoDB shell or Compass, drop the database
use clueso_clone
db.dropDatabase()

# Or delete the database folder if using local MongoDB
```

## 📚 Next Steps

- Explore all AI features in the video editor
- Try creating multiple workspaces
- Test export with different formats
- Generate documentation from videos
- Check the code in `/backend/src/utils/aiService.js` to see how AI is mocked

## 🆘 Still Having Issues?

Check:
1. Both backend and frontend terminals for error messages
2. MongoDB is running and accessible
3. All npm packages installed (`npm install` in both folders)
4. Environment variables are correct in `.env` files
5. Port 3000 and 5000 are available

## ✅ Success Checklist

- [ ] MongoDB is running
- [ ] Backend server starts without errors
- [ ] Frontend server starts without errors
- [ ] Can access http://localhost:3000
- [ ] Can create an account
- [ ] Can create a workspace
- [ ] Can create a video
- [ ] Can apply AI features
- [ ] Can export video

---

**Congratulations! 🎉** Your Clueso.io clone is now running!
