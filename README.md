# UGC Studio — AI Video Generator

A full-stack Next.js chat app that turns product URLs into UGC-style short videos.

## Setup

```bash
npm install
npm run dev        # http://localhost:3000
npm run build
npm start
```

## How it works

1. User sends a message like: *"I'm building CalAI, here's the site: calai.app"*
2. `/api/chat` detects the URL and product context
3. Claude reads the live webpage and plans a video with: background, text overlay, trending audio, GIF
4. The VideoCard renders a simulated 5–10s preview with layer-by-layer build animation

## Project structure

```
src/
├── app/
│   ├── page.tsx              # Main chat UI
│   ├── globals.css           # Design tokens + animations
│   ├── layout.tsx
│   └── api/chat/route.ts     # Claude API + video assembly logic
└── components/
    ├── ChatMessage.tsx        # User/AI bubbles
    ├── TypingIndicator.tsx    # Animated dots
    ├── VideoCard.tsx          # Video preview + layers breakdown
    └── SuggestedPrompts.tsx   # Quick-start chips
```

## API key

Set your Anthropic API key in `src/app/api/chat/route.ts` (line 3) or move to `.env.local`:

```
ANTHROPIC_API_KEY=sk-ant-...
```

## Video layers

| Layer | What it does |
|-------|-------------|
| 🎬 Background | Unsplash photo matched to product category |
| 📝 Text Overlay | Claude-generated viral hook (≤8 words) |
| 🎵 Audio | Trending track picked from curated list |
| 🎭 GIF | Reaction GIF layered in corner |
