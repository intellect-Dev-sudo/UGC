import { NextRequest, NextResponse } from "next/server";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";
// Free-to-use audio from Pixabay (no account needed, direct MP3 links)
const TRENDING_AUDIO = [
  { name: "Inspiring Corporate", artist: "Trending Beat", url: "https://cdn.pixabay.com/audio/2023/10/30/audio_9dece9f2e5.mp3" },
  { name: "Upbeat Vibes", artist: "UGC Sound", url: "https://cdn.pixabay.com/audio/2023/09/05/audio_168a3e0cec.mp3" },
  { name: "Energetic Pop", artist: "Viral Track", url: "https://cdn.pixabay.com/audio/2022/10/25/audio_a6e92b89f2.mp3" },
  { name: "Chill Lo-Fi", artist: "Studio Beat", url: "https://cdn.pixabay.com/audio/2023/06/08/audio_6d5f1e3f12.mp3" },
  { name: "Hype Drop", artist: "TikTok Sound", url: "https://cdn.pixabay.com/audio/2023/11/13/audio_9a2e4c78b1.mp3" },
  { name: "Dramatic Build", artist: "Reel Audio", url: "https://cdn.pixabay.com/audio/2022/12/09/audio_f6f38e0ced.mp3" },
];

const TRENDING_GIFS = [
  "https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif",
  "https://media.giphy.com/media/l0MYGb1LuZ3n7dRnO/giphy.gif",
  "https://media.giphy.com/media/xT9IgG50Lg7russbD6/giphy.gif",
  "https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif",
  "https://media.giphy.com/media/3o7bu3XilJ5BOiSGic/giphy.gif",
  "https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif",
  "https://media.giphy.com/media/26tknCqiJrBQG6bxC/giphy.gif",
  "https://media.giphy.com/media/3ohzdIuqJoo8QdKlnW/giphy.gif",
];

const BACKGROUNDS_BY_CATEGORY = {
  nutrition: [
    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=900&h=1600&q=85",
    "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=900&h=1600&q=85",
    "https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=900&h=1600&q=85",
    "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=900&h=1600&q=85",
  ],
  fitness: [
    "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=900&h=1600&q=85",
    "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=900&h=1600&q=85",
  ],
  productivity: [
    "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&h=1600&q=85",
    "https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=900&h=1600&q=85",
  ],
  default: [
    "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&h=1600&q=85",
    "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=900&h=1600&q=85",
    "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=900&h=1600&q=85",
  ],
};

type ProductCategory = keyof typeof BACKGROUNDS_BY_CATEGORY;

function detectCategory(text: string): ProductCategory {
  if (/calai|calorie|macro|nutrition|meal|food|diet|protein|restaurant|eat|eating|weight/i.test(text)) {
    return "nutrition";
  }
  if (/fitness|gym|workout|exercise|run|training|muscle/i.test(text)) {
    return "fitness";
  }
  if (/productivity|task|calendar|meeting|workflow|notes|email|sales|crm|founder/i.test(text)) {
    return "productivity";
  }
  return "default";
}

function extractUrl(text: string): string | null {
  const urlRegex = /https?:\/\/[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\/[^\s]*)?/g;
  const matches = text.match(urlRegex);
  if (!matches) return null;
  let url = matches[0];
  if (!url.startsWith("http")) url = "https://" + url;
  return url;
}

async function fetchUrlContent(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; UGCBot/1.0)" },
      signal: AbortSignal.timeout(8000),
    });
    const html = await res.text();
    // Strip tags, get text
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 3000);
    return text;
  } catch {
    return "";
  }
}

async function callClaude(messages: { role: string; content: string }[], system: string) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system,
      messages,
    }),
  });
  const data = await res.json();
  return data.content?.[0]?.text || "";
}

export async function POST(req: NextRequest) {
  const { messages } = await req.json();
  const lastMsg = messages[messages.length - 1]?.content || "";

  // Detect product URL
  const url = extractUrl(lastMsg);

  const system = `You are an AI UGC (User Generated Content) video studio assistant. You help founders and marketers create short-form viral videos for their products.

You are friendly, direct, and enthusiastic. Keep responses concise — 1-3 sentences max unless explaining something complex.

If someone mentions a product or URL, tell them you're analyzing it and assembling their video. Then respond ONLY with valid JSON in this exact format (no other text):

{
  "content": "Your conversational reply here",
  "generateVideo": true,
  "productUrl": "the url",
  "productName": "product name",
  "productDescription": "what the product does"
}

For normal conversation (greetings, questions, etc.), respond ONLY with valid JSON:
{
  "content": "Your reply here",
  "generateVideo": false
}

Always return valid JSON, nothing else.`;

  try {
    const rawResponse = await callClaude(messages, system);

    let parsed: { content: string; generateVideo: boolean; productUrl?: string; productName?: string; productDescription?: string };
    try {
      const clean = rawResponse.replace(/```json\n?|\n?```/g, "").trim();
      parsed = JSON.parse(clean);
    } catch {
      return NextResponse.json({ content: rawResponse });
    }

    if (!parsed.generateVideo) {
      return NextResponse.json({ content: parsed.content });
    }

    // Fetch product page
    const targetUrl = parsed.productUrl || url || "https://example.com";
    const pageContent = await fetchUrlContent(targetUrl);

    const category = detectCategory(`${parsed.productName || ""} ${parsed.productDescription || ""} ${pageContent} ${lastMsg}`);

    // Get video assembly plan from Claude
    const videoSystem = `You are a UGC video creative director for TikTok, Reels, and meme ads. Given product info, create a realistic vertical meme-style video assembly plan.

Make it feel like a creator posted it from their phone: relatable pain point, funny but believable hook, clean meme captions, no generic marketing words, no fake claims, no cringe hashtags.

Match the visuals to the product category. If it is a calorie, macro, diet, food, or nutrition product, the concept MUST happen around eating food, a meal, a restaurant table, groceries, or casual snacking. Do not use generic office/startup backgrounds for food apps.

Return ONLY valid JSON, no other text:

{
  "title": "Short punchy video title",
  "textOverlay": "Main viral hook text, max 7 words",
  "memeCaption": "Top meme caption, max 9 words",
  "reactionCaption": "Small reaction caption, max 5 words",
  "layers": [
    { "label": "Realistic background", "description": "phone-shot lifestyle visual" },
    { "label": "Meme captions", "description": "top caption and bold punchline" },
    { "label": "Audio", "description": "vibe/energy description" },
    { "label": "Reaction sticker", "description": "what GIF/reaction to overlay" }
  ],
  "backgroundQuery": "realistic lifestyle photo search query, no brand names",
  "gifKeyword": "keyword for gif (e.g. 'mind blown', 'obsessed', 'fire')"
}`;

    const videoPrompt = `Product: ${parsed.productName || "App"}
URL: ${targetUrl}
Description: ${parsed.productDescription || ""}
Page content: ${pageContent.slice(0, 1500)}
Detected category: ${category}

Create a UGC video plan in the same spirit as a meme where someone is casually eating and the app suddenly solves the annoying tracking/logging problem.`;

    const videoRaw = await callClaude([{ role: "user", content: videoPrompt }], videoSystem);

    let videoPlan: {
      title: string;
      textOverlay: string;
      memeCaption: string;
      reactionCaption: string;
      layers: { label: string; description: string }[];
      backgroundQuery: string;
      gifKeyword: string;
    };

    try {
      const cleanVideo = videoRaw.replace(/```json\n?|\n?```/g, "").trim();
      videoPlan = JSON.parse(cleanVideo);
    } catch {
      videoPlan = {
        title: `${parsed.productName || "Product"} UGC Video`,
        textOverlay: "WAIT, THIS ACTUALLY WORKS",
        memeCaption: "me after finding this tool",
        reactionCaption: "no way",
        layers: [
          { label: "Realistic background", description: "Phone-shot lifestyle visual" },
          { label: "Meme captions", description: "Relatable top caption and punchline" },
          { label: "Audio", description: "Trending sound" },
          { label: "Reaction sticker", description: "Expressive reaction GIF" },
        ],
        backgroundQuery: "app lifestyle technology",
        gifKeyword: "mind blown",
      };
    }

    if (category === "nutrition") {
      videoPlan = {
        ...videoPlan,
        title: videoPlan.title || `${parsed.productName || "Calorie App"} Food Tracking Meme`,
        textOverlay: /wait|changed|works/i.test(videoPlan.textOverlay)
          ? "JUST SNAP THE FOOD"
          : videoPlan.textOverlay,
        memeCaption: /tool|finding|discovering/i.test(videoPlan.memeCaption)
          ? `when you're eating chill but ${parsed.productName || "the app"} tracks macros`
          : videoPlan.memeCaption,
        reactionCaption: videoPlan.reactionCaption || "macros done",
        layers: [
          { label: "Food context", description: "Restaurant/table scene tied to calories" },
          { label: "Meme caption", description: "Casual eating problem + app payoff" },
          { label: "Audio", description: "Short-form reaction sound" },
          { label: "Reaction cutout", description: "Large central reaction overlay" },
        ],
      };
    }

    // Pick random trending audio + gif
    const audio = TRENDING_AUDIO[Math.floor(Math.random() * TRENDING_AUDIO.length)];
    const gif = TRENDING_GIFS[Math.floor(Math.random() * TRENDING_GIFS.length)];

    // Use stable real-photo URLs so the canvas export stays reliable.
    const seed = (parsed.productName || "product").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const categoryBackgrounds = BACKGROUNDS_BY_CATEGORY[category] || BACKGROUNDS_BY_CATEGORY.default;
    const bgImage = categoryBackgrounds[seed % categoryBackgrounds.length];

    const videoResult = {
      title: videoPlan.title,
      description: `UGC video for ${parsed.productName || "your product"}`,
      backgroundVideo: "",
      backgroundImage: bgImage,
      gif,
      textOverlay: videoPlan.textOverlay,
      memeCaption: videoPlan.memeCaption || `me discovering ${parsed.productName || "this"}`,
      reactionCaption: videoPlan.reactionCaption || "wait what",
      audioTrack: audio,
      productUrl: targetUrl,
      productName: parsed.productName || "Product",
      duration: category === "nutrition" ? 8 : Math.floor(Math.random() * 3) + 7,
      layers: videoPlan.layers,
    };

    return NextResponse.json({
      content: parsed.content,
      video: videoResult,
    });

  } catch (err) {
    console.error(err);
    return NextResponse.json({
      content: "Something went wrong. Please try again.",
    });
  }
}
