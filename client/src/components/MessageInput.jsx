import { useRef, useState } from "react";

const SERVER = "http://localhost:5000";
const LEVEL_COUNT = 40;

const formatTime = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;

function MessageInput({ onSend }) {
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [levels, setLevels] = useState([]);
  const [seconds, setSeconds] = useState(0);

  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const startTimeRef = useRef(0);

  const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(SERVER + "/api/upload", { method: "POST", body: formData });
    if (!res.ok) throw new Error("upload failed");
    return res.json();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend({ text: text.trim() });
    setText("");
  };

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const data = await uploadFile(file);
      onSend({ text: "", fileUrl: data.url, fileType: data.type, fileName: data.name });
    } catch {
      alert("File upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Live waveform ke liye analyser
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      audioCtx.createMediaStreamSource(stream).connect(analyser);
      const samples = new Uint8Array(analyser.fftSize);

      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        audioCtx.close();

        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const ext = blob.type.includes("ogg") ? "ogg" : "webm";
        const file = new File([blob], `voice-${Date.now()}.${ext}`, { type: blob.type });

        setUploading(true);
        try {
          const data = await uploadFile(file);
          onSend({ text: "", fileUrl: data.url, fileType: data.type, fileName: data.name });
        } catch {
          alert("Voice message upload failed");
        } finally {
          setUploading(false);
        }
      };

      recorder.start();
      recorderRef.current = recorder;
      startTimeRef.current = Date.now();
      setLevels([]);
      setSeconds(0);
      setRecording(true);

      timerRef.current = setInterval(() => {
        analyser.getByteTimeDomainData(samples);
        let sum = 0;
        for (const v of samples) {
          const n = (v - 128) / 128;
          sum += n * n;
        }
        const level = Math.min(1, Math.sqrt(sum / samples.length) * 4);
        setLevels((prev) => [...prev.slice(-(LEVEL_COUNT - 1)), Math.max(0.08, level)]);
        setSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 100);
    } catch {
      alert("Microphone access nahi mila. Browser mein mic permission allow karo.");
    }
  };

  const stopRecording = () => {
    clearInterval(timerRef.current);
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  };

  return (
    <form className="message-form" onSubmit={handleSubmit}>
      <label className="attach-btn" title="Attach file">
        📎
        <input type="file" hidden onChange={handleFile} disabled={uploading || recording} />
      </label>

      <button
        type="button"
        className={recording ? "mic-btn recording" : "mic-btn"}
        onClick={recording ? stopRecording : startRecording}
        disabled={uploading}
        title={recording ? "Stop & send" : "Voice message"}
      >
        {recording ? "⏹" : "🎤"}
      </button>

      {recording ? (
        <div className="recording-bar">
          <span className="rec-dot" />
          <span className="rec-time">{formatTime(seconds)}</span>
          <div className="live-wave">
            {levels.map((l, i) => (
              <span key={i} style={{ height: `${Math.round(l * 100)}%` }} />
            ))}
          </div>
        </div>
      ) : (
        <input
          className="message-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={uploading ? "Uploading..." : "Type a message..."}
        />
      )}

      <button className="send-btn" type="submit" disabled={uploading || recording}>
        Send
      </button>
    </form>
  );
}

export default MessageInput;