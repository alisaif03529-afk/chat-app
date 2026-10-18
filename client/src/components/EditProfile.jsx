import { useState, useEffect } from "react";
import { API_URL } from "../config";

const SERVER = API_URL;

function EditProfile({ username, onClose, onProfileUpdated }) {
  const storageKey = "profile_" + username;
  const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");

  const [newName, setNewName] = useState(username);
  const [bio, setBio] = useState(saved.bio || "");
  const [avatar, setAvatar] = useState(saved.avatar || "");
  const [error, setError] = useState("");

  useEffect(() => {
    setNewName(username);
  }, [username]);

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      setError("Image must be smaller than 500 KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAvatar(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setError("");
    const trimmed = newName.trim();
    if (!trimmed) {
      setError("Username cannot be empty.");
      return;
    }

    if (trimmed !== username) {
      try {
        const res = await fetch(SERVER + "/api/update-profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ oldUsername: username, newUsername: trimmed }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error);
          return;
        }
        localStorage.setItem(
          "profile_" + trimmed,
          JSON.stringify({ bio, avatar })
        );
        localStorage.removeItem(storageKey);
        onProfileUpdated(data.username, { bio, avatar });
        return;
      } catch {
        setError("Cannot reach the server.");
        return;
      }
    }

    localStorage.setItem(storageKey, JSON.stringify({ bio, avatar }));
    onProfileUpdated(username, { bio, avatar });
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-card edit-profile-card" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h3>Edit Profile</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="avatar-picker">
          <div className="avatar-preview">
            {avatar ? (
              <img src={avatar} alt="Profile" />
            ) : (
              <span>{username.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <label className="avatar-upload">
            Change photo
            <input type="file" accept="image/*" onChange={handleImage} hidden />
          </label>
          {avatar && (
            <button className="remove-photo" onClick={() => setAvatar("")}>
              Remove photo
            </button>
          )}
        </div>

        <label className="field-label">Username</label>
        <input
          className="profile-input"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Username"
        />

        <label className="field-label">Bio</label>
        <textarea
          className="profile-input bio-input"
          value={bio}
          maxLength={120}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Write a short bio..."
        />
        <small className="char-count">{bio.length}/120</small>

        {error && <p className="settings-error">{error}</p>}

        <div className="settings-row">
          <button className="settings-btn small" onClick={handleSave}>
            Save
          </button>
          <button className="settings-btn small ghost" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default EditProfile;