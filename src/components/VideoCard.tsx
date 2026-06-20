"use client";
import { VideoResult } from "@/app/page";
import { useVideoComposer } from "@/hooks/useVideoComposer";
import { AlertCircle, CheckCircle, Download, ExternalLink, Film, ImageIcon, Loader2, Music, Pause, Play, Type, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function gifToMp4(url: string): string {
  if (!url) return url;
  if (url.includes("giphy.com")) {
    return url.replace(/\.gif($|\?)/, ".mp4$1");
  }
  return url;
}

interface Props { video: VideoResult; }
const LAYER_ICONS = [Film, Type, Music, ImageIcon];

export default function VideoCard({ video }: Props) {
  const [stage, setStage] = useState<"building" | "ready">("building");
  const [buildStep, setBuildStep] = useState(0);
  const [buildProgress, setBuildProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [bgLoaded, setBgLoaded] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);

  const { compose, status: composeStatus, reset: resetCompose } = useVideoComposer();

  // Init preview audio
  useEffect(() => {
    if (video.audioTrack?.url) {
      const a = new Audio(video.audioTrack.url);
      a.loop = true; a.volume = 0.6;
      audioRef.current = a;
      return () => { a.pause(); a.src = ""; };
    }
  }, [video.audioTrack?.url]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = muted;
    if (videoElRef.current) videoElRef.current.muted = muted;
  }, [muted]);

  // Layer-by-layer build animation
  useEffect(() => {
    let step = 0;
    const steps = video.layers.length;
    const advance = () => {
      step++;
      setBuildStep(step);
      setBuildProgress((step / steps) * 100);
      if (step < steps) setTimeout(advance, 900);
      else setTimeout(() => setStage("ready"), 600);
    };
    const t = setTimeout(advance, 500);
    return () => clearTimeout(t);
  }, [video.layers.length]);

  // Preview playback (before real video)
  useEffect(() => {
    if (!videoUrl) {
      if (playing) {
        audioRef.current?.play().catch(() => { });
        timerRef.current = setInterval(() => {
          setElapsed(p => {
            if (p >= video.duration) { setPlaying(false); audioRef.current?.pause(); return 0; }
            return +(p + 0.1).toFixed(1);
          });
        }, 100);
      } else {
        audioRef.current?.pause();
        if (timerRef.current) clearInterval(timerRef.current);
      }
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }
  }, [playing, video.duration, videoUrl]);

  const togglePlay = () => {
    if (videoUrl && videoElRef.current) {
      if (videoElRef.current.paused) videoElRef.current.play();
      else videoElRef.current.pause();
      setPlaying(p => !p);
      return;
    }
    if (elapsed >= video.duration) setElapsed(0);
    setPlaying(p => !p);
  };

  const handleExport = async () => {
    if (videoUrl) {
      const a = document.createElement("a");
      a.href = videoUrl;
      a.download = `${video.productName.replace(/\s+/g, "-")}-ugc.mp4`;
      a.click();
      return;
    }

    if (!previewRef.current) return;

    // Pause preview playback while capturing
    setPlaying(false);
    audioRef.current?.pause();

    const url = await compose(
      previewRef.current,
      video.audioTrack?.url || "",
      video.duration,
      video.reactionCaption || "",
    );

    if (url) {
      setVideoUrl(url);
    }
  };

  const progress = videoUrl ? 0 : (elapsed / video.duration) * 100;

  const isComposing = composeStatus.phase !== "idle" && composeStatus.phase !== "done" && composeStatus.phase !== "error";
  const composeLabel = () => {
    if (composeStatus.phase === "loading_ffmpeg") return `Loading engine… ${composeStatus.pct}%`;
    if (composeStatus.phase === "fetching_assets") return composeStatus.step;
    if (composeStatus.phase === "compositing") return `${composeStatus.step} ${composeStatus.pct}%`;
    if (composeStatus.phase === "error") return "Error — retry?";
    return "";
  };

  // ── Build animation ────────────────────────────────────────────────
  if (stage === "building") {
    return (
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b", animation: "pulse-glow 1.5s ease infinite" }} />
          <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 }}>Assembling video…</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {video.layers.map((layer, i) => {
            const Icon = LAYER_ICONS[i] || Film;
            const done = i < buildStep, active = i === buildStep;
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, opacity: done || active ? 1 : 0.3, transition: "opacity 0.3s" }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: done ? "rgba(16,185,129,0.2)" : active ? "rgba(99,102,241,0.2)" : "var(--bg-secondary)", border: `1px solid ${done ? "#10b981" : active ? "#6366f1" : "var(--border)"}`, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.3s" }}>
                  <Icon size={13} color={done ? "#10b981" : active ? "#6366f1" : "var(--text-muted)"} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: done ? "#10b981" : "var(--text-primary)" }}>{layer.label}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{layer.description}</div>
                </div>
                {done && <span style={{ color: "#10b981" }}>✓</span>}
                {active && <div style={{ width: 14, height: 14, border: "2px solid #6366f1", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />}
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 16, height: 3, background: "var(--bg-secondary)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${buildProgress}%`, background: "linear-gradient(90deg,#6366f1,#8b5cf6)", borderRadius: 2, transition: "width 0.5s ease" }} />
        </div>
      </div>
    );
  }

  // ── Ready state ───────────────────────────────────────────────────
  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>

      {/* Preview area */}
      <div ref={previewRef} style={{ position: "relative", aspectRatio: "9/16", maxHeight: 340, background: "#0d0d1a", overflow: "hidden", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={togglePlay}>

        {/* Real MP4 (after export) */}
        {videoUrl ? (
          <video
            ref={videoElRef}
            src={videoUrl}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
            loop playsInline muted={muted}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
          />
        ) : (
          <>
            {/* Background image preview */}
            <img src={video.backgroundImage} alt="bg"
              crossOrigin="anonymous"
              onLoad={() => setBgLoaded(true)}
              onError={e => { const el = e.target as HTMLImageElement; if (!el.dataset.tried) { el.dataset.tried = "1"; el.src = `https://picsum.photos/seed/ugc${Date.now()}/800/1400`; } }}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: bgLoaded ? 0.9 : 0, transition: "opacity 0.5s" }} />
            {!bgLoaded && <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg,#1a1a2e,#0f3460)" }} />}

            {/* gradient */}
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom,rgba(0,0,0,0.18),rgba(0,0,0,0.04) 45%,rgba(0,0,0,0.58))" }} />

            <div style={{ position: "absolute", top: 22, left: 18, right: 18 }}>
              <p style={{ fontSize: 14, fontWeight: 900, color: "white", lineHeight: 1.15, textAlign: "center", textShadow: "0 2px 0 #000, 0 -1px 0 #000, 1px 0 0 #000, -1px 0 0 #000, 0 5px 12px rgba(0,0,0,0.5)" }}>{video.memeCaption}</p>
            </div>

            {/* GIF */}
            {video.gif && (
              <video
                data-capture="gif"
                src={gifToMp4(video.gif)}
                autoPlay
                loop
                muted
                playsInline
                crossOrigin="anonymous"
                onError={e => { (e.target as HTMLVideoElement).style.display = "none"; }}
                style={{
                  position: "absolute",
                  bottom: 74,
                  left: "50%",
                  width: 204,
                  height: 204,
                  marginLeft: -102,
                  borderRadius: 22,
                  border: "4px solid rgba(255,255,255,0.9)",
                  objectFit: "cover",
                  transform: "rotate(-1deg)",
                  boxShadow: "0 16px 32px rgba(0,0,0,0.4)",
                }}
              />
            )}

            {video.reactionCaption && (
              <div data-capture="reaction" style={{ position: "absolute", bottom: 58, right: 86, background: "white", color: "#111", borderRadius: 999, padding: "3px 9px", fontSize: 10, fontWeight: 900, textTransform: "uppercase", boxShadow: "0 6px 14px rgba(0,0,0,0.25)" }}>
                {video.reactionCaption}
              </div>
            )}

            {/* Text overlay */}
            <div style={{ position: "absolute", bottom: 22, left: 12, right: 12, padding: "4px 8px" }}>
              <p style={{ fontSize: 22, fontWeight: 900, color: "white", lineHeight: 1.05, textAlign: "center", textShadow: "0 3px 0 #000, 0 -2px 0 #000, 2px 0 0 #000, -2px 0 0 #000, 0 8px 18px rgba(0,0,0,0.6)" }}>{video.textOverlay.toUpperCase()}</p>
            </div>

            {/* Progress bar (preview) */}
            <div data-capture="overlay" style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: "rgba(255,255,255,0.1)" }}>
              <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg,#6366f1,#8b5cf6)", transition: "width 0.1s linear" }} />
            </div>
          </>
        )}

        {/* Play/pause overlay */}
        <div data-capture="overlay" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: playing ? 0 : 1, transition: "opacity 0.2s" }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(99,102,241,0.85)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {playing ? <Pause size={22} color="white" /> : <Play size={22} color="white" style={{ marginLeft: 3 }} />}
          </div>
        </div>

        {/* Mute */}
        <button data-capture="overlay" onClick={e => { e.stopPropagation(); setMuted(m => !m); }}
          style={{ position: "absolute", top: 10, left: 10, width: 30, height: 30, borderRadius: "50%", background: "rgba(0,0,0,0.5)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {muted ? <VolumeX size={13} color="white" /> : <Volume2 size={13} color="white" />}
        </button>

        {/* Duration */}
        <div data-capture="overlay" style={{ position: "absolute", top: 10, right: 10, background: "rgba(0,0,0,0.7)", borderRadius: 6, padding: "2px 7px", fontSize: 11, color: "white", fontWeight: 600 }}>
          {video.duration}s
        </div>

        {/* "Real MP4" badge */}
        {videoUrl && (
          <div style={{ position: "absolute", bottom: 10, left: 10, background: "rgba(16,185,129,0.9)", borderRadius: 6, padding: "2px 8px", fontSize: 11, color: "white", fontWeight: 700 }}>
            ✓ Real MP4
          </div>
        )}
      </div>

      {/* Info section */}
      <div style={{ padding: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 2 }}>{video.title}</h3>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>{video.description}</p>

        {/* Layers grid */}
        <div style={{ background: "var(--bg-secondary)", borderRadius: 10, padding: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
          {video.layers.map((layer, i) => {
            const Icon = LAYER_ICONS[i] || Film;
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Icon size={11} color="#6366f1" />
                <div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{layer.label}</div>
                  <div style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 500 }}>{layer.description.slice(0, 22)}{layer.description.length > 22 ? "…" : ""}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Audio row */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 10, padding: "8px 12px", marginBottom: 12 }}>
          <Music size={13} color="#6366f1" />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{video.audioTrack.name}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{video.audioTrack.artist}</div>
          </div>
          <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
            {[3, 5, 4, 7, 5, 3, 6, 4, 5, 3].map((h, i) => (
              <div key={i} style={{ width: 2, height: h * 2 + 4, background: "#6366f1", borderRadius: 1, opacity: playing ? 1 : 0.4, animation: playing ? `typing-dot ${0.5 + i * 0.08}s ease infinite` : "none" }} />
            ))}
          </div>
        </div>

        {/* Compose progress bar */}
        {isComposing && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <Loader2 size={13} color="#6366f1" style={{ animation: "spin 1s linear infinite" }} />
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{composeLabel()}</span>
            </div>
            <div style={{ height: 4, background: "var(--bg-secondary)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: composeStatus.phase === "loading_ffmpeg" ? `${composeStatus.pct}%`
                  : composeStatus.phase === "compositing" ? `${composeStatus.pct}%`
                    : "40%",
                background: "linear-gradient(90deg,#6366f1,#8b5cf6)",
                borderRadius: 2, transition: "width 0.4s ease",
              }} />
            </div>
          </div>
        )}

        {composeStatus.phase === "error" && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#ef4444", fontSize: 12, marginBottom: 10 }}>
            <AlertCircle size={13} />
            {composeStatus.message.slice(0, 80)}
            <button onClick={resetCompose} style={{ marginLeft: "auto", color: "#6366f1", background: "none", border: "none", cursor: "pointer", fontSize: 12 }}>Retry</button>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 8 }}>
          <a href={video.productUrl} target="_blank" rel="noopener noreferrer"
            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 14px", borderRadius: 10, background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-secondary)", fontSize: 13, textDecoration: "none", fontWeight: 500 }}>
            <ExternalLink size={13} />
            View Product
          </a>
          <button
            onClick={handleExport}
            disabled={isComposing}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "9px 14px", borderRadius: 10,
              background: videoUrl ? "linear-gradient(135deg,#10b981,#059669)" : "linear-gradient(135deg,#6366f1,#8b5cf6)",
              border: "none", color: "white", fontSize: 13,
              cursor: isComposing ? "wait" : "pointer", fontWeight: 600,
              opacity: isComposing ? 0.7 : 1, transition: "all 0.3s",
              boxShadow: "0 0 16px rgba(99,102,241,0.3)",
            }}>
            {isComposing ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />
              : videoUrl ? <CheckCircle size={13} />
                : <Download size={13} />}
            {isComposing ? "Rendering…" : videoUrl ? "Download MP4" : "Export MP4"}
          </button>
        </div>

        {videoUrl && (
          <p style={{ fontSize: 11, color: "#10b981", textAlign: "center", marginTop: 8 }}>
            ✓ Real MP4 ready — click Download MP4 to save
          </p>
        )}
      </div>
    </div>
  );
}
