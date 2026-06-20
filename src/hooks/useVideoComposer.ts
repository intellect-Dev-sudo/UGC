"use client";
import { useCallback, useState } from "react";

export type ComposeStatus =
  | { phase: "idle" }
  | { phase: "loading_ffmpeg"; pct: number }
  | { phase: "fetching_assets"; step: string }
  | { phase: "compositing"; pct: number; step: string }
  | { phase: "done"; url: string; mimeType: string }
  | { phase: "error"; message: string };

function pickMime(): string {
  const candidates = [
    "video/mp4;codecs=avc1",
    "video/mp4",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) return c;
  }
  return "video/webm";
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function useVideoComposer() {
  const [status, setStatus] = useState<ComposeStatus>({ phase: "idle" });

  const compose = useCallback(async (
    previewEl: HTMLElement,
    audioUrl: string,
    duration: number,
    reactionCaption: string,
  ): Promise<string | null> => {
    try {
      const html2canvas = (await import("html2canvas")).default;

      const dur = Math.max(5, Math.min(10, duration));
      const FPS = 30;
      const totalFrames = FPS * dur;
      const mime = pickMime();
      const W = 720, H = 1280;

      // ── 1. Read element positions from the live DOM ──────────────────
      const previewRect = previewEl.getBoundingClientRect();
      const sx = W / previewRect.width;
      const sy = H / previewRect.height;

      // Find GIF video element
      const gifEl = previewEl.querySelector('[data-capture="gif"]') as HTMLVideoElement | null;
      let gifPos: { cx: number; cy: number; w: number; h: number } | null = null;
      if (gifEl) {
        const r = gifEl.getBoundingClientRect();
        gifPos = {
          cx: ((r.left - previewRect.left) + r.width / 2) * sx,
          cy: ((r.top - previewRect.top) + r.height / 2) * sy,
          w: r.width * sx,
          h: r.height * sy,
        };
      }

      // Find reaction badge
      const badgeEl = previewEl.querySelector('[data-capture="reaction"]') as HTMLElement | null;
      let badgePos: { x: number; y: number; w: number; h: number } | null = null;
      if (badgeEl) {
        const r = badgeEl.getBoundingClientRect();
        badgePos = {
          x: (r.left - previewRect.left) * sx,
          y: (r.top - previewRect.top) * sy,
          w: r.width * sx,
          h: r.height * sy,
        };
      }

      // ── 2. Hide dynamic elements, capture static parts ──────────────
      setStatus({ phase: "fetching_assets", step: "Capturing preview…" });
      const hideEls = previewEl.querySelectorAll("[data-capture]");
      hideEls.forEach(el => (el as HTMLElement).style.visibility = "hidden");

      const snapshot = await html2canvas(previewEl, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#0d0d1a",
        scale: 2,
        logging: false,
      });

      // Restore visibility immediately
      hideEls.forEach(el => (el as HTMLElement).style.visibility = "");

      // ── 3. Load audio with proper AudioContext ──────────────────────
      setStatus({ phase: "fetching_assets", step: "Loading audio…" });
      let audioCtx: AudioContext | null = null;
      let audioSrc: AudioBufferSourceNode | null = null;
      let audioStream: MediaStream | null = null;

      if (audioUrl) {
        try {
          audioCtx = new AudioContext();
          await audioCtx.resume(); // Required for autoplay policy
          const res = await fetch(audioUrl);
          const arrayBuf = await res.arrayBuffer();
          const audioBuf = await audioCtx.decodeAudioData(arrayBuf);
          const dest = audioCtx.createMediaStreamDestination();
          audioSrc = audioCtx.createBufferSource();
          audioSrc.buffer = audioBuf;
          audioSrc.loop = true;
          audioSrc.connect(dest);
          audioStream = dest.stream;
        } catch (e) {
          console.warn("Audio load failed:", e);
          if (audioCtx) { try { audioCtx.close(); } catch { /* ignore */ } }
          audioCtx = null;
          audioSrc = null;
          audioStream = null;
        }
      }

      // ── 4. Set up canvas + MediaRecorder ────────────────────────────
      setStatus({ phase: "compositing", pct: 5, step: "Setting up recorder…" });
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d")!;

      // Draw one frame first so the canvas isn't blank when captureStream starts
      ctx.fillStyle = "#0d0d1a";
      ctx.fillRect(0, 0, W, H);

      const canvasStream = canvas.captureStream(FPS);
      const combinedStream = audioStream
        ? new MediaStream([...canvasStream.getVideoTracks(), ...audioStream.getAudioTracks()])
        : canvasStream;

      const chunks: Blob[] = [];
      const recorder = new MediaRecorder(combinedStream, {
        mimeType: mime,
        videoBitsPerSecond: 5_000_000,
      });
      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };

      // ── 5. Record frame by frame ────────────────────────────────────
      let frame = 0;
      const borderRadius = 22 * sx;
      const borderWidth = 4 * sx;

      await new Promise<void>((resolve, reject) => {
        recorder.onstop = () => resolve();
        recorder.onerror = () => reject(new Error("Recording failed"));

        // Reset the GIF video element to frame 0 and play to sync animation
        if (gifEl) {
          gifEl.currentTime = 0;
          gifEl.play().catch(() => {});
        }

        recorder.start(100);
        audioSrc?.start(0);

        const tick = () => {
          if (frame >= totalFrames) {
            recorder.stop();
            try { audioCtx?.close(); } catch { /* ignore */ }
            return;
          }

          const t = frame / FPS;
          const pct = Math.round((frame / totalFrames) * 90) + 5;
          setStatus({ phase: "compositing", pct, step: `Recording ${frame + 1}/${totalFrames}…` });

          ctx.clearRect(0, 0, W, H);

          // ─── A. Static snapshot (bg + gradient + captions + text overlay) ───
          ctx.drawImage(snapshot, 0, 0, W, H);

          // ─── B. Animated GIF with border, rounded corners, rotation, shadow ─
          if (gifEl && gifPos) {
            const { cx, cy, w: gw, h: gh } = gifPos;

            // Shadow
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(-Math.PI / 180);
            ctx.shadowColor = "rgba(0,0,0,0.4)";
            ctx.shadowBlur = Math.round(32 * sx);
            ctx.shadowOffsetY = Math.round(16 * sx);
            ctx.fillStyle = "#000";
            drawRoundedRect(ctx, -gw / 2, -gh / 2, gw, gh, borderRadius);
            ctx.fill();
            ctx.restore();

            // GIF image clipped to rounded rect
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(-Math.PI / 180);
            drawRoundedRect(ctx, -gw / 2, -gh / 2, gw, gh, borderRadius);
            ctx.clip();
            // drawImage reads the CURRENT animation frame from the playing video
            ctx.drawImage(gifEl, -gw / 2, -gh / 2, gw, gh);
            ctx.restore();

            // White border
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(-Math.PI / 180);
            ctx.strokeStyle = "rgba(255,255,255,0.9)";
            ctx.lineWidth = borderWidth;
            drawRoundedRect(ctx, -gw / 2, -gh / 2, gw, gh, borderRadius);
            ctx.stroke();
            ctx.restore();
          }

          // ─── C. Reaction badge (drawn on top of GIF, just like preview) ─────
          if (reactionCaption && badgePos) {
            const { x: bx, y: by, w: bw, h: bh } = badgePos;
            ctx.save();
            ctx.shadowColor = "rgba(0,0,0,0.25)";
            ctx.shadowBlur = Math.round(14 * sx);
            ctx.shadowOffsetY = Math.round(6 * sx);
            ctx.fillStyle = "#ffffff";
            drawRoundedRect(ctx, bx, by, bw, bh, bh / 2);
            ctx.fill();
            ctx.restore();
            // Badge text
            const fontSize = Math.max(12, Math.round(10 * sx));
            ctx.fillStyle = "#111111";
            ctx.font = `900 ${fontSize}px Arial, sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(reactionCaption.toUpperCase(), bx + bw / 2, by + bh / 2);
          }

          // ─── D. Progress bar ────────────────────────────────────────────────
          const barH = Math.max(4, Math.round(3 * sy));
          const progW = (t / dur) * W;
          ctx.fillStyle = "rgba(255,255,255,0.1)";
          ctx.fillRect(0, H - barH, W, barH);
          if (progW > 0) {
            const pg = ctx.createLinearGradient(0, 0, progW, 0);
            pg.addColorStop(0, "#6366f1");
            pg.addColorStop(1, "#8b5cf6");
            ctx.fillStyle = pg;
            ctx.fillRect(0, H - barH, progW, barH);
          }

          frame++;
          window.setTimeout(tick, 1000 / FPS);
        };

        tick();
      });

      setStatus({ phase: "compositing", pct: 95, step: "Packaging video…" });
      await new Promise(r => setTimeout(r, 500));

      const blob = new Blob(chunks, { type: mime });
      const url = URL.createObjectURL(blob);
      setStatus({ phase: "done", url, mimeType: mime });
      return url;

    } catch (err: unknown) {
      console.error("Compose error:", err);
      const message = err instanceof Error ? err.message : String(err);
      setStatus({ phase: "error", message });
      return null;
    }
  }, []);

  const reset = useCallback(() => setStatus({ phase: "idle" }), []);
  return { compose, status, reset };
}
