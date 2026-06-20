"use client";
import { Message } from "@/app/page";
import { Bot, User, AlertCircle } from "lucide-react";

interface Props { message: Message; }

export default function ChatMessage({ message }: Props) {
  const isUser = message.role === "user";

  return (
    <div style={{
      display: "flex",
      flexDirection: isUser ? "row-reverse" : "row",
      gap: 10,
      alignItems: "flex-start",
      padding: "6px 0",
    }}>
      {/* Avatar */}
      <div style={{
        width: 34, height: 34, borderRadius: isUser ? 10 : 10,
        background: isUser
          ? "linear-gradient(135deg, #1e1e4a, #2a2a5e)"
          : "linear-gradient(135deg, #6366f1, #8b5cf6)",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
        border: `1px solid ${isUser ? "#2a2a5e" : "rgba(99,102,241,0.4)"}`,
        boxShadow: isUser ? "none" : "0 0 12px rgba(99,102,241,0.2)",
      }}>
        {isUser
          ? <User size={15} color="#818cf8" />
          : <Bot size={15} color="white" />}
      </div>

      {/* Bubble */}
      <div style={{
        maxWidth: "75%",
        background: isUser ? "var(--user-bubble)" : "var(--ai-bubble)",
        border: `1px solid ${isUser ? "#2a2a5e" : "var(--border)"}`,
        borderRadius: isUser ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
        padding: "11px 15px",
        position: "relative",
      }}>
        {message.status === "error" && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, color: "#ef4444", fontSize: 12 }}>
            <AlertCircle size={12} />
            Error
          </div>
        )}
        <p style={{
          fontSize: 14.5, lineHeight: 1.65,
          color: message.status === "error" ? "#ef4444" : "var(--text-primary)",
          whiteSpace: "pre-wrap",
        }}>
          {message.content}
        </p>
        <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 5, textAlign: isUser ? "right" : "left" }}>
          {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
    </div>
  );
}
