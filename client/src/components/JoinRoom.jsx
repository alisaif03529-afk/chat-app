import { useState } from "react";
import FriendsLogo from "./FriendsLogo";

export default function JoinRoom({ defaultName = "", onJoin }) {
  const [name, setName] = useState(defaultName);
  const [room, setRoom] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !room.trim()) return;
    onJoin(room.trim(), name.trim());
  };

  return (
    <div className="join-page">
      <div className="brand">
        <FriendsLogo size={130} />
        <h1 className="brand-title">Welcome to Friends Chat</h1>
        <p className="brand-sub">Apne dosto ke saath real-time baat karo</p>
      </div>

      <div className="join-card">
        <h2 className="join-heading">Join a Chat Room</h2>

        <form onSubmit={handleSubmit} className="join-form">
          <input
            className="auth-input"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="auth-input"
            placeholder="Room name"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
          />
          <button className="auth-btn" type="submit">
            Join
          </button>
        </form>
      </div>
    </div>
  );
}