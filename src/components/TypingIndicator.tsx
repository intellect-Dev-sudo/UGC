"use client";
import { Bot } from "lucide-react";

export default function TypingIndicator() {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "6px 0" }}>
      <div style={{
        width: 34, height: 34, borderRadius: 10,
        background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
        border: "1px solid rgba(99,102,241,0.4)",
        boxShadow: "0 0 12px rgba(99,102,241,0.2)",
      }}>
        <Bot size={15} color="white" />
      </div>
      <div style={{
        background: "var(--ai-bubble)", border: "1px solid var(--border)",
        borderRadius: "4px 16px 16px 16px",
        padding: "12px 18px", display: "flex", gap: 5, alignItems: "center",
      }}>
        {[0, 1, 2].map((i) => (
          <span key={i} style={{
            width: 7, height: 7, borderRadius: "50%",
            background: "#6366f1", display: "inline-block",
            animation: `typing-dot 1.2s ease infinite`,
            animationDelay: `${i * 0.18}s`,
          }} />
        ))}
      </div>
    </div>
  );
}
