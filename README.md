# SOMA

An interactive anatomy education app powered by AI. Users describe symptoms, chat with Oso — a friendly AI bear mascot — and get a guided lesson on the relevant muscles through a 3D voxel body visualization and text-to-speech narration.

## Features

- **Conversational symptom intake** — Oso asks focused follow-up questions to understand what you're feeling
- **Symptom triage** — AI assesses severity (1–5 scale) and identifies the affected body region
- **Interactive 3D body map** — voxel-rendered muscle groups you can orbit and explore
- **Narrated anatomy lesson** — sequential muscle focus with ElevenLabs TTS playback
- **Free explore mode** — browse all 20+ muscle groups without symptom input

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, Three.js, React Three Fiber |
| Backend | Node.js, Express |
| AI | Google Generative AI (Gemini 2.0 Flash / Gemma 3 27B) |
| TTS | ElevenLabs API |
| Deployment | Frontend → Vercel, Backend → Render |

## Prerequisites

- Node.js 16+
- [Google Generative AI API key](https://aistudio.google.com/)
- [ElevenLabs API key](https://elevenlabs.io/)

## Getting Started

### 1. Install dependencies

```bash
# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 2. Configure environment variables

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

```env
GEMINI_API_KEY=your_google_genai_api_key
ELEVENLABS_API_KEY=your_elevenlabs_api_key
ELEVENLABS_VOICE_ID=oEQ6y2Z3RRGa3doHtAB5   # optional, this is the default
PORT=3001
```

### 3. Run locally

```bash
# Terminal 1 — backend (http://localhost:3001)
cd backend && npm run dev

# Terminal 2 — frontend (http://localhost:5173)
cd frontend && npm run dev
```

The Vite dev server proxies all `/api` requests to the backend automatically.

## Scripts

**Backend**

| Command | Description |
|---------|-------------|
| `npm start` | Production server |
| `npm run dev` | Dev server with watch mode |

**Frontend**

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /api/chat` | Oso conversation turn |
| `POST /api/triage` | Severity + body region assessment |
| `POST /api/narration` | Region intro narration |
| `POST /api/muscle-story` | Muscle lesson script generation |
| `POST /api/muscle-focus` | Extract muscle name from text |
| `POST /api/speak` | ElevenLabs TTS → audio stream |

## Project Structure

```
Soma/
├── backend/
│   ├── server.js          # Express API with all 6 routes
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx        # Phase router (intro → landing → ... → anatomy)
│   │   ├── components/
│   │   │   ├── bodyman/VoxelBrain.tsx   # 3D voxel body (React Three Fiber)
│   │   │   ├── Oso/                     # AI mascot component
│   │   │   ├── BodyMapSVG/              # Interactive body silhouette
│   │   │   ├── SeverityGauge/           # 1–5 severity indicator
│   │   │   └── VoiceButton/             # TTS playback control
│   │   ├── screens/
│   │   │   ├── Intro/        SymptomInput/   QnA/
│   │   │   ├── Triage/       BodyMap/        Anatomy/
│   │   │   └── Explore/      Landing/        EmergencyBanner/
│   │   ├── services/
│   │   │   ├── claude.js      # Backend API calls
│   │   │   └── elevenlabs.js  # TTS (speak, stop, prefetch)
│   │   └── constants/bodyRegions.js
│   ├── vite.config.js
│   └── vercel.json
└── scripts/
    ├── split_muscles.py       # Splits 3D model into individual muscle meshes
    └── generate-muscles.mjs
```

## User Flow

```
Intro → Landing
           ├── Chat flow: Symptom Input → Q&A (up to 4 turns) → Triage → Body Map → Anatomy lesson
           └── Explore:   Free 3D muscle exploration
```
