import { useState } from "react";

const SERVER = "http://localhost:5000";

function CreateGroup({ username, onClose, onCreated }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setError("");
    if (!name.trim()) {
      setError("Group name is required");
      return;
    }

    setLoading(true);
    let res;
    try {
      res = await fetch(SERVER + "/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), creator: username }),
      });
    } catch {
      setLoading(false);
      setError("Server se connection nahi ho paya. Server terminal check karo.");
      return;
    }

    const data = await res.json().catch(() => null);
    setLoading(false);

    if (!res.ok || !data) {
      setError(data?.error || `Server error (${res.status}). Server restart karo.`);
      return;
    }
    onCreated(data);
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-card" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h3>Create Group</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <input
          className="profile-input"
          placeholder="Group name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        {error && <p className="settings-error">{error}</p>}

        <button className="settings-btn small" onClick={handleCreate} disabled={loading}>
          {loading ? "Creating..." : "Create Group"}
        </button>
      </div>
    </div>
  );
}

export default CreateGroup;