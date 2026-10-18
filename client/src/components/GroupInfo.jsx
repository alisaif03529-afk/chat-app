import { useEffect, useState } from "react";
import { API_URL } from "../config";
import PresenceStatus from "./PresenceStatus";
import { getName } from "../utils/name";

const SERVER = API_URL;

function GroupInfo({ group, username, onlineUsers, names = {}, onClose, onUpdated, onLeft }) {
  const [newMember, setNewMember] = useState("");
  const [error, setError] = useState("");
  const [lastSeenMap, setLastSeenMap] = useState({});

  const isAdmin = group.admins.includes(username);
  const isCreator = group.createdBy === username;

  const displayName = (m) => getName(m, names);

  useEffect(() => {
    const list = group.members.join(",");
    fetch(`${SERVER}/api/users/status?names=${encodeURIComponent(list)}`)
      .then((res) => res.json())
      .then((data) => {
        const map = {};
        Object.keys(data).forEach((name) => {
          map[name] = data[name].lastSeen;
        });
        setLastSeenMap(map);
      })
      .catch(() => {});
  }, [group.members, onlineUsers]);

  const request = async (path, method, body) => {
    setError("");
    try {
      const res = await fetch(`${SERVER}/api/groups/${group._id}${path}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return null;
      }
      return data;
    } catch {
      setError("Cannot reach the server.");
      return null;
    }
  };

  const addMember = async () => {
    if (!newMember.trim()) return;
    const data = await request("/members", "POST", {
      actor: username,
      username: newMember.trim(),
    });
    if (data) {
      onUpdated(data);
      setNewMember("");
    }
  };

  const removeMember = async (member) => {
    if (!window.confirm(`Remove ${displayName(member)} from this group?`)) return;
    const data = await request("/remove", "POST", { actor: username, username: member });
    if (data) onUpdated(data);
  };

  const makeAdmin = async (member) => {
    const data = await request("/admin", "POST", { actor: username, username: member });
    if (data) onUpdated(data);
  };

  const leaveGroup = async () => {
    if (!window.confirm("Leave this group?")) return;
    const data = await request("/remove", "POST", { actor: username, username });
    if (data) onLeft();
  };

  const deleteGroup = async () => {
    if (!window.confirm("Delete this group and all its messages?")) return;
    const data = await request("", "DELETE", { actor: username });
    if (data) onLeft();
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-card group-card" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <div>
            <h3>{group.name}</h3>
            <small className="muted">
              {group.members.filter((m) => onlineUsers.includes(m)).length} online ·{" "}
              {group.members.length} members
            </small>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {isAdmin && (
          <div className="add-member-row">
            <input
              className="profile-input"
              placeholder="Add member by username"
              value={newMember}
              onChange={(e) => setNewMember(e.target.value)}
            />
            <button className="settings-btn small" onClick={addMember}>Add</button>
          </div>
        )}

        {error && <p className="settings-error">{error}</p>}

        <div className="member-list">
          {group.members.map((m) => {
            const role =
              m === group.createdBy ? "Creator" : group.admins.includes(m) ? "Admin" : "Member";
            const canManage = isAdmin && m !== username && m !== group.createdBy;
            return (
              <div key={m} className="member-row">
                <div className="member-info">
                  <span className="member-avatar">{displayName(m).charAt(0).toUpperCase()}</span>
                  <div>
                    <div className="member-name">
                      {displayName(m)}
                      {m === username && " (you)"}
                    </div>
                    <small className="member-role">{role}</small>
                    <div>
                      <PresenceStatus
                        isOnline={onlineUsers.includes(m)}
                        lastSeen={lastSeenMap[m]}
                      />
                    </div>
                  </div>
                </div>

                {canManage && (
                  <div className="member-actions">
                    {!group.admins.includes(m) && (
                      <button className="mini-btn" onClick={() => makeAdmin(m)}>
                        Make admin
                      </button>
                    )}
                    <button className="mini-btn danger-btn" onClick={() => removeMember(m)}>
                      Remove
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {isCreator ? (
          <button className="settings-btn danger" onClick={deleteGroup}>
            Delete group
          </button>
        ) : (
          <button className="settings-btn danger" onClick={leaveGroup}>
            Leave group
          </button>
        )}
      </div>
    </div>
  );
}

export default GroupInfo;