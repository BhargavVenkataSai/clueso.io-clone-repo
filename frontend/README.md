# Clueso.io Clone - Frontend

AI-powered video creation platform (Clueso.io functional clone).

## Tech Stack

- **Framework**: Next.js 14 (React)
- **Styling**: Tailwind CSS
- **API Communication**: Axios
- **State Management**: React Context API

## Features

### ✅ Implemented
- User authentication (signup/login with JWT)
- Landing page (Clueso.io style)
- Dashboard with workspace management
- Video listing and creation
- **Studio Interface**: Advanced editor with timeline and script panel
- **AI Integration**: Gemini-powered script polishing and zoom planning
- Responsive design
- Clean, modern UI

### 🚧 Core Pages
- `/` - Landing page
- `/signup` - User registration
- `/login` - User login
- `/dashboard` - Main dashboard with workspaces and videos
- `/projects/[id]` - Studio Editor (Active)
- `/videos/[id]` - Video editor (Legacy)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment:
```bash
# Create .env.local with:
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

3. Start development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
frontend/
├── pages/
│   ├── _app.js           # App wrapper with AuthProvider
│   ├── index.js          # Landing page
│   ├── signup.js         # Registration page
│   ├── login.js          # Login page
│   └── dashboard.js      # Main dashboard
├── contexts/
│   └── AuthContext.js    # Authentication state management
├── lib/
│   └── api.js            # API client and endpoints
├── styles/
│   └── globals.css       # Global styles + Tailwind
└── public/               # Static assets
```

## API Integration

All API calls are centralized in `/lib/api.js`:

```javascript
import { authAPI, workspaceAPI, videoAPI, documentationAPI } from '../lib/api';

// Example usage:
const response = await authAPI.login({ email, password });
const videos = await videoAPI.getAll(workspaceId);
```

## Authentication Flow

1. User signs up/logs in
2. JWT token stored in localStorage
3. Token attached to all API requests via interceptor
4. Automatic redirect to login on 401 errors
5. AuthContext provides user state throughout app

## Development Notes

- File uploads are currently **mocked** (no actual file handling yet)
- Video player/editor UI to be implemented
- Documentation generation UI to be implemented
- Translation UI to be implemented

## Next Steps

1. Implement video detail/editor page
2. Add video processing UI with progress indicator
3. Build documentation viewer
4. Add translation interface
5. Implement template management
6. Add export functionality

## Production Build

```bash
npm run build
npm start
```
