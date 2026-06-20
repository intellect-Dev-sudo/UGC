"use client";
import { Sparkles, Link, HelpCircle } from "lucide-react";

const prompts = [
  { icon: Link, label: "CalAI — calorie tracker", text: "I'm building CalAI, a calorie tracking app. Here's the site: https://calai.app" },
  { icon: Sparkles, label: "What can you do?", text: "What can you do?" },
  { icon: HelpCircle, label: "How does the video get made?", text: "How does the video get made?" },
];

export default function SuggestedPrompts({ onSelect }: { onSelect: (t: string) => void }) {
  return (
    <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 10 }}>
      <p style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", letterSpacing: "0.05em" }}>
        SUGGESTED
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
        {prompts.map(({ icon: Icon, label, text }) => (
          <button
            key={label}
            onClick={() => onSelect(text)}
            style={{
              padding: "8px 14px",
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 20,
              color: "var(--text-secondary)",
              fontSize: 13,
              cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6,
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "#6366f1";
              (e.currentTarget as HTMLElement).style.color = "var(--accent-light)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
              (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
            }}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
