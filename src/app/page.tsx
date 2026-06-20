"use client";
import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Video, Zap, ChevronDown } from "lucide-react";
import ChatMessage from "@/components/ChatMessage";
import TypingIndicator from "@/components/TypingIndicator";
import VideoCard from "@/components/VideoCard";
import SuggestedPrompts from "@/components/SuggestedPrompts";

export type MessageRole = "user" | "assistant";
export type MessageStatus = "sending" | "done" | "error";

export interface VideoResult {
  title: string;
  description: string;
  backgroundVideo: string;
  backgroundImage: string;
  gif: string;
  textOverlay: string;
  memeCaption: string;
  reactionCaption: string;
  audioTrack: { name: string; artist: string; url: string };
  productUrl: string;
  productName: string;
  duration: number;
  layers: { label: string; description: string }[];
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  status: MessageStatus;
  video?: VideoResult;
  timestamp: Date;
}

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content: "Hey! 👋 I'm your UGC video studio. Drop a product URL and I'll build a short-form video with trending audio, text overlays, and GIF — ready to post.\n\nWhat product are you building for?",
  status: "done",
  timestamp: new Date(),
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = (smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handler = () => {
      const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      setShowScrollBtn(distFromBottom > 200);
    };
    el.addEventListener("scroll", handler);
    return () => el.removeEventListener("scroll", handler);
  }, []);

  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 140) + "px";
  };

  const sendMessage = async (text?: string) => {
    const content = (text || input).trim();
    if (!content || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      status: "done",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await res.json();

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.content,
        status: "done",
        video: data.video || undefined,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Something went wrong. Please try again.",
          status: "error",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const showSuggested = messages.length === 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--bg-primary)" }}>
      {/* Header */}
      <header style={{
        display: "flex", alignItems: "center", gap: 12, padding: "14px 20px",
        borderBottom: "1px solid var(--border)",
        background: "rgba(10,10,15,0.9)",
        backdropFilter: "blur(12px)",
        position: "sticky", top: 0, zIndex: 50,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 0 20px rgba(99,102,241,0.4)",
        }}>
          <Video size={18} color="white" />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: "-0.3px", color: "var(--text-primary)" }}>
            UGC Studio
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", display: "inline-block" }} />
            AI-powered · 5–10s videos
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <div style={{
            padding: "4px 10px", borderRadius: 20, border: "1px solid var(--border)",
            fontSize: 11, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 4,
          }}>
            <Zap size={10} color="#f59e0b" />
            4 layers
          </div>
        </div>
      </header>

      {/* Chat scroll area */}
      <div
        ref={scrollRef}
        style={{ flex: 1, overflowY: "auto", padding: "24px 0", position: "relative" }}
      >
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 16px", display: "flex", flexDirection: "column", gap: 4 }}>
          {messages.map((msg) => (
            <div key={msg.id} className="animate-slide-up">
              <ChatMessage message={msg} />
              {msg.video && (
                <div style={{ marginLeft: msg.role === "assistant" ? 44 : "auto", marginTop: 12, maxWidth: 480 }}>
                  <VideoCard video={msg.video} />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="animate-slide-up">
              <TypingIndicator />
            </div>
          )}

          {showSuggested && !isLoading && (
            <SuggestedPrompts onSelect={(p) => sendMessage(p)} />
          )}

          <div ref={bottomRef} />
        </div>

        {/* Scroll to bottom btn */}
        {showScrollBtn && (
          <button
            onClick={() => scrollToBottom()}
            style={{
              position: "fixed", bottom: 100, right: 24,
              width: 36, height: 36, borderRadius: "50%",
              background: "var(--bg-card)", border: "1px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "var(--text-secondary)",
              boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
            }}
          >
            <ChevronDown size={16} />
          </button>
        )}
      </div>

      {/* Input bar */}
      <div style={{
        borderTop: "1px solid var(--border)",
        background: "rgba(10,10,15,0.95)",
        backdropFilter: "blur(12px)",
        padding: "12px 16px 16px",
      }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{
            display: "flex", gap: 10, alignItems: "flex-end",
            background: "var(--bg-input)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            padding: "10px 10px 10px 16px",
            transition: "border-color 0.2s",
          }}
            onFocus={() => {}}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
                <Sparkles size={9} color="#6366f1" />
                Try: &quot;I&apos;m building [app name], here&apos;s my site: [url]&quot;
              </div>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => { setInput(e.target.value); autoResize(); }}
                onKeyDown={handleKey}
                placeholder="Describe your product or drop a URL..."
                rows={1}
                style={{
                  width: "100%", background: "transparent",
                  border: "none", resize: "none",
                  color: "var(--text-primary)", fontSize: 15,
                  lineHeight: 1.5, fontFamily: "inherit",
                  maxHeight: 140,
                }}
              />
            </div>
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isLoading}
              style={{
                width: 40, height: 40, borderRadius: 12,
                background: input.trim() && !isLoading
                  ? "linear-gradient(135deg, #6366f1, #8b5cf6)"
                  : "var(--border)",
                border: "none", cursor: input.trim() && !isLoading ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.2s",
                flexShrink: 0,
                boxShadow: input.trim() && !isLoading ? "0 0 16px rgba(99,102,241,0.4)" : "none",
              }}
            >
              <Send size={16} color={input.trim() && !isLoading ? "white" : "#555577"} />
            </button>
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center", marginTop: 8 }}>
            Shift+Enter for new line · Enter to send
          </div>
        </div>
      </div>
    </div>
  );
}
