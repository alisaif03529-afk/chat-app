import { useEffect, useRef, useState } from "react";
import VoicePlayer from "./VoicePlayer";
import FriendsLogo from "./FriendsLogo";
import { getName } from "../utils/name";

function ChatWindow({ messages, currentUser, onDelete, onEdit, names = {} }) {
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const bottomRef = useRef(null);

  const displayName = (u) => getName(u, names);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startEdit = (msg) => {
    setEditingId(msg._id);
    setEditText(msg.text);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
  };

  const saveEdit = (msg) => {
    const trimmed = editText.trim();
    if (!trimmed) return;
    onEdit(msg._id, trimmed);
    cancelEdit();
  };

  const renderFile = (msg) => {
    if (msg.type === "audio") {
      return <VoicePlayer src={msg.fileUrl} />;
    }
    if (msg.type === "image") {
      return (
        <img
          className="msg-image"
          src={msg.fileUrl}
          alt={msg.fileName || "image"}
        />
      );
    }
    if (msg.type === "video") {
      return <video className="msg-video" controls src={msg.fileUrl} />;
    }
    return (
      <a
        className="msg-file"
        href={msg.fileUrl}
        target="_blank"
        rel="noreferrer"
      >
        📄 {msg.fileName || "Download file"}
      </a>
    );
  };

  return (
    <div className="chat-window">
      {messages.length === 0 && (
        <div className="chat-empty">
          <FriendsLogo size={120} />
          <p className="chat-empty-text">No messages yet. Say hello!</p>
        </div>
      )}

      {messages.map((msg) => {
        const isMine = msg.sender === currentUser;
        const hasFile = !!msg.fileUrl;
        const isEditing = editingId === msg._id;

        return (
          <div
            key={msg._id}
            className={isMine ? "message my-message" : "message other-message"}
          >
            <div className="msg-sender">{displayName(msg.sender)}</div>

            {isEditing ? (
              <div className="edit-box">
                <input
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveEdit(msg);
                    if (e.key === "Escape") cancelEdit();
                  }}
                  autoFocus
                />
                <button onClick={() => saveEdit(msg)}>Save</button>
                <button onClick={cancelEdit}>Cancel</button>
              </div>
            ) : hasFile ? (
              renderFile(msg)
            ) : (
              <p className="msg-text">
                {msg.text}
                {msg.edited && <small className="edited"> (edited)</small>}
              </p>
            )}

            {isMine && !isEditing && (
              <div className="msg-actions">
                {!hasFile && (
                  <button onClick={() => startEdit(msg)}>Edit</button>
                )}
                <button onClick={() => onDelete(msg._id)}>Unsend</button>
              </div>
            )}
          </div>
        );
      })}

      <div ref={bottomRef} />
    </div>
  );
}

export default ChatWindow;