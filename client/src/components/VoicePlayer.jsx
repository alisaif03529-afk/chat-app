import { useEffect, useRef, useState } from "react";

const BARS = 40;

function formatTime(sec) {
  if (!sec || !isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function VoicePlayer({ src }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bars, setBars] = useState(Array(BARS).fill(0.3));

  // Audio download karke waveform ke bars banana
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch(src);
        const buffer = await res.arrayBuffer();
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const audioBuffer = await ctx.decodeAudioData(buffer);
        ctx.close();

        const channel = audioBuffer.getChannelData(0);
        const block = Math.max(1, Math.floor(channel.length / BARS));
        const peaks = [];
        for (let i = 0; i < BARS; i++) {
          let peak = 0;
          for (let j = 0; j < block; j++) {
            const idx = i * block + j;
            if (idx < channel.length) peak = Math.max(peak, Math.abs(channel[idx]));
          }
          peaks.push(peak);
        }
        const max = Math.max(...peaks, 0.0001);

        if (!cancelled) {
          setBars(peaks.map((p) => Math.max(0.08, p / max)));
          // Chrome ki recorded webm files mein audio element ki duration galat aati hai,
          // isliye decoded audio ki duration use karte hain
          setDuration(audioBuffer.duration);
        }
      } catch {
        // decode fail hua to flat bars dikhenge
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [src]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play();
    else a.pause();
  };

  const seek = (e) => {
    const a = audioRef.current;
    if (!a || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    a.currentTime = ratio * duration;
    setCurrent(a.currentTime);
  };

  const playedBars = duration ? Math.floor((current / duration) * BARS) : 0;

  return (
    <div className="voice-player">
      <audio
        ref={audioRef}
        src={src}
        preload="auto"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setCurrent(0);
        }}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
      />

      <button className="voice-btn" onClick={toggle} aria-label={playing ? "Pause" : "Play"}>
        {playing ? "⏸" : "▶"}
      </button>

      <div className="voice-wave" onClick={seek}>
        {bars.map((h, i) => (
          <span
            key={i}
            className={i < playedBars ? "bar played" : "bar"}
            style={{ height: `${Math.max(12, h * 100)}%` }}
          />
        ))}
      </div>

      <span className="voice-time">{formatTime(current > 0 ? current : duration)}</span>
    </div>
  );
}

export default VoicePlayer;