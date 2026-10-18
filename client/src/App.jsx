import { useEffect, useState } from "react";
import socket from "./socket";
import AuthForm from "./components/AuthForm";
import JoinRoom from "./components/JoinRoom";
import ChatWindow from "./components/ChatWindow";
import MessageInput from "./components/MessageInput";
import SettingsPanel from "./components/SettingsPanel";
import EditProfile from "./components/EditProfile";
import CreateGroup from "./components/CreateGroup";
import GroupInfo from "./components/GroupInfo";
import { getName } from "./utils/name";
import "./App.css";

const SERVER = "http://localhost:5000";

const getInitialNotify = () => {
  try {
    return (
      localStorage.getItem("notify_on") === "1" &&
      typeof Notification !== "undefined" &&
      Notification.permission === "granted"
    );
  } catch {
    return false;
  }
};

function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [joined, setJoined] = useState(false);
  const [username, setUsername] = useState("");
  const [room, setRoom] = useState("");
  const [roomTitle, setRoomTitle] = useState("");
  const [activeGroup, setActiveGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [groups, setGroups] = useState([]);
  const [names, setNames] = useState({});
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [notifyOn, setNotifyOn] = useState(getInitialNotify);
  const [darkMode, setDarkMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [profile, setProfile] = useState({ bio: "", avatar: "" });

  useEffect(() => {
    socket.on("chatHistory", (history) => setMessages(history));
    socket.on("newMessage", (msg) => setMessages((prev) => [...prev, msg]));
    socket.on("messageDeleted", (messageId) => {
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
    });
    socket.on("messageEdited", ({ messageId, text }) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, text, edited: true } : m))
      );
    });
    socket.on("chatCleared", () => setMessages([]));
    socket.on("presence", ({ online }) => setOnlineUsers(online));

    return () => {
      socket.off("chatHistory");
      socket.off("newMessage");
      socket.off("messageDeleted");
      socket.off("messageEdited");
      socket.off("chatCleared");
      socket.off("presence");
    };
  }, []);

  // Login hone par server ko batana ki ye user online hai.
  useEffect(() => {
    if (!loggedIn || !username) return;

    const register = () => socket.emit("register", username);
    register();
    socket.on("connect", register);

    return () => {
      socket.off("connect", register);
      socket.emit("unregister");
    };
  }, [loggedIn, username]);

  // Jitne users ke messages ya groups mein members hain, unke display names load karna
  const senderKey = [...new Set(messages.map((m) => m.sender))].join(",");
  const memberKey = groups.map((g) => g.members.join(",")).join("|");

  useEffect(() => {
    if (!loggedIn) return;
    const list = new Set([username, ...senderKey.split(","), ...memberKey.split(/[|,]/)]);
    const q = [...list].filter(Boolean).join(",");
    if (!q) return;

    fetch(`${SERVER}/api/users/status?names=${encodeURIComponent(q)}`)
      .then((res) => res.json())
      .then((data) => {
        const map = {};
        Object.keys(data).forEach((k) => {
          map[k] = data[k].displayName || "";
        });
        setNames((prev) => ({ ...prev, ...map }));
      })
      .catch(() => {});
  }, [loggedIn, username, senderKey, memberKey]);

  // Notifications: jab doosre ka message aaye aur wo chat abhi khuli na ho
  useEffect(() => {
    if (!notifyOn) return;

    const handler = (msg) => {
      if (msg.sender === username) return;
      const isActive = msg.room === room && !document.hidden;
      if (isActive) return;
      if (typeof Notification === "undefined" || Notification.permission !== "granted") return;

      const group = groups.find((g) => g._id === msg.room);
      const where = group ? group.name : msg.room;

      let body = msg.text;
      if (msg.fileType === "audio") body = "🎤 Voice message";
      else if (msg.fileUrl) body = `📎 ${msg.fileName || "File"}`;

      const n = new Notification(`${getName(msg.sender, names)} · ${where}`, { body });
      n.onclick = () => {
        window.focus();
        n.close();
      };
    };

    socket.on("newMessage", handler);
    return () => socket.off("newMessage", handler);
  }, [notifyOn, room, username, groups, names]);

  const toggleNotifications = async () => {
    if (notifyOn) {
      setNotifyOn(false);
      localStorage.setItem("notify_on", "0");
      return;
    }

    if (typeof Notification === "undefined") {
      alert("Ye browser notifications support nahi karta.");
      return;
    }

    let permission = Notification.permission;
    if (permission === "default") {
      permission = await Notification.requestPermission();
    }

    if (permission !== "granted") {
      alert("Notification permission allow karo (browser ki settings se).");
      return;
    }

    setNotifyOn(true);
    localStorage.setItem("notify_on", "1");
  };

  const loadProfile = (user) => {
    const saved = JSON.parse(localStorage.getItem("profile_" + user) || "{}");
    setProfile({ bio: saved.bio || "", avatar: saved.avatar || "" });
  };

  const loadGroups = async (user) => {
    try {
      const res = await fetch(`${SERVER}/api/groups/user/${encodeURIComponent(user)}`);
      setGroups(await res.json());
    } catch {
      setGroups([]);
    }
  };

  const enterRoom = (id, title, group = null) => {
    if (room && room !== id) socket.emit("leaveRoom", room);
    setMessages([]);
    setRoom(id);
    setRoomTitle(title);
    setActiveGroup(group);
    setJoined(true);
    socket.emit("joinRoom", id);
  };

  const handleAuth = (user) => {
    setUsername(user);
    loadProfile(user);
    loadGroups(user);
    setLoggedIn(true);
  };

  const handleJoin = async (roomName, name) => {
    if (name && name !== names[username]) {
      try {
        await fetch(`${SERVER}/api/display-name`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, displayName: name }),
        });
        setNames((prev) => ({ ...prev, [username]: name }));
      } catch {
        alert("Naam save nahi ho paya. Server check karo.");
      }
    }

    setRooms((prev) => (prev.includes(roomName) ? prev : [roomName, ...prev]));
    enterRoom(roomName, roomName);
  };

  const openGroup = (group) => {
    enterRoom(group._id, group.name, group);
  };

  const handleGroupCreated = (group) => {
    setGroups((prev) => [group, ...prev]);
    setShowCreateGroup(false);
    openGroup(group);
  };

  const handleGroupUpdated = (group) => {
    setActiveGroup(group);
    setGroups((prev) => prev.map((g) => (g._id === group._id ? group : g)));
  };

  const handleGroupLeftOrDeleted = () => {
    socket.emit("leaveRoom", room);
    setShowGroupInfo(false);
    setActiveGroup(null);
    setMessages([]);
    setRoom("");
    setRoomTitle("");
    setJoined(false);
    loadGroups(username);
  };

  const handleDeleteGroup = async (group) => {
    if (!window.confirm(`"${group.name}" group aur uske saare messages delete karne hain?`)) return;

    try {
      const res = await fetch(`${SERVER}/api/groups/${group._id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actor: username }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error);
        return;
      }
      setGroups((prev) => prev.filter((g) => g._id !== group._id));
      if (room === group._id) handleGroupLeftOrDeleted();
    } catch {
      alert("Server se connect nahi ho paya.");
    }
  };

  const handleClearCurrentChat = () => {
    if (!room) return;
    if (window.confirm("Is chat ke saare messages delete karne hain?")) {
      socket.emit("deleteRoomChat", { room, sender: username });
    }
  };

  const handleLogout = () => {
    if (room) socket.emit("leaveRoom", room);
    setShowSettings(false);
    setShowEditProfile(false);
    setShowGroupInfo(false);
    setLoggedIn(false);
    setJoined(false);
    setUsername("");
    setRoom("");
    setRoomTitle("");
    setActiveGroup(null);
    setMessages([]);
    setRooms([]);
    setGroups([]);
    setNames({});
    setProfile({ bio: "", avatar: "" });
  };

  const handleClearChat = () => {
    if (!room) return;
    if (window.confirm("Delete all messages in this room?")) {
      socket.emit("deleteRoomChat", { room, sender: username });
      setShowSettings(false);
    }
  };

  const handleProfileUpdated = (newName, newProfile) => {
    setUsername(newName);
    setProfile(newProfile);
    setShowEditProfile(false);
    loadGroups(newName);
  };

  const handleSend = ({ text, fileUrl = "", fileType = "", fileName = "" }) => {
    socket.emit("sendMessage", { room, sender: username, text, fileUrl, fileType, fileName });
  };

  const handleDelete = (messageId) => {
    socket.emit("deleteMessage", { messageId, room, sender: username });
  };

  const handleEdit = (messageId, text) => {
    socket.emit("editMessage", { messageId, room, sender: username, text });
  };

  if (!loggedIn) return <AuthForm onAuth={handleAuth} />;
  if (!joined) return <JoinRoom defaultName={names[username] || ""} onJoin={handleJoin} />;

  const displayName = (u) => getName(u, names);

  const onlineCount = activeGroup
    ? activeGroup.members.filter((m) => onlineUsers.includes(m)).length
    : 0;

  return (
    <div className={darkMode ? "app-layout dark" : "app-layout"}>
      <aside className="sidebar">
        <div className="brand">ChatConnect</div>

        <div className="profile">
          {profile.avatar ? (
            <img className="avatar avatar-img" src={profile.avatar} alt="" />
          ) : (
            <div className="avatar">{displayName(username).charAt(0).toUpperCase()}</div>
          )}
          <div className="profile-info">
            <div className="profile-name">{displayName(username)}</div>
            <div className="online">● Online</div>
            {profile.bio && <div className="profile-bio">{profile.bio}</div>}
          </div>
        </div>

        <nav className="menu">
          <button className="menu-item active" onClick={() => setJoined(false)}>
            New Chat
          </button>
          <button className="menu-item" onClick={() => setShowCreateGroup(true)}>
            Group Chat
          </button>
          <button className="menu-item" onClick={() => setShowSettings(true)}>
            Settings
          </button>
        </nav>

        <div className="quick-box">
          <p className="section-title">Quick Features</p>
          <div className="quick-item">Group Chat</div>
          <div className="quick-item">Edit & Unsend</div>
          <div className="quick-item">Message History</div>
        </div>
      </aside>

      <main className="main-panel">
        <div className="chat-header">
          <div>
            <h2 className="room-header">{roomTitle}</h2>
            <p className="room-sub">
              {activeGroup
                ? `${onlineCount} online · ${activeGroup.members.length} members · ${messages.length} messages`
                : `${messages.length} messages`}
            </p>
          </div>

          <div className="header-actions">
            <button
              className="bell-btn"
              onClick={() => setDarkMode((d) => !d)}
              title={darkMode ? "Light mode" : "Dark mode"}
            >
              {darkMode ? "☀️" : "🌙"}
            </button>

            <button
              className={notifyOn ? "bell-btn on" : "bell-btn"}
              onClick={toggleNotifications}
              title={notifyOn ? "Notifications on (click to turn off)" : "Turn on notifications"}
            >
              {notifyOn ? "🔔" : "🔕"}
            </button>

            {activeGroup && (
              <button className="group-info-btn" onClick={() => setShowGroupInfo(true)}>
                Group info
              </button>
            )}
          </div>
        </div>

        <ChatWindow
          messages={messages}
          currentUser={username}
          onDelete={handleDelete}
          onEdit={handleEdit}
          names={names}
        />
        <MessageInput onSend={handleSend} />
      </main>

      <aside className="right-panel">
        <div className="panel-card">
          <p className="section-title">My Groups</p>
          {groups.length === 0 && <p className="muted">No groups yet</p>}
          {groups.map((g) => {
            const isAdmin = g.admins.includes(username);
            const isCreator = g.createdBy === username;
            return (
              <div key={g._id} className="group-row">
                <button
                  className={g._id === room ? "history-item active" : "history-item"}
                  onClick={() => openGroup(g)}
                >
                  <span className="history-avatar">{g.name.charAt(0).toUpperCase()}</span>
                  <span className="history-text">
                    <strong>
                      {g.name}
                      {isAdmin && (
                        <span className="admin-badge">{isCreator ? "Creator" : "Admin"}</span>
                      )}
                    </strong>
                    <small>{g.members.length} members</small>
                  </span>
                </button>

                {isCreator && (
                  <button className="mini-btn danger-btn" onClick={() => handleDeleteGroup(g)}>
                    Delete
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="panel-card">
          <p className="section-title">Chat History</p>
          {rooms.length === 0 && <p className="muted">No rooms yet</p>}
          {rooms.map((r) => (
            <button
              key={r}
              className={r === room ? "history-item active" : "history-item"}
              onClick={() => enterRoom(r, r)}
            >
              <span className="history-avatar">{r.charAt(0).toUpperCase()}</span>
              <span className="history-text">
                <strong>{r}</strong>
                <small>Tap to open</small>
              </span>
            </button>
          ))}

          <button
            className="clear-chat-btn"
            onClick={handleClearCurrentChat}
            disabled={!room}
          >
            🗑 Clear current chat
          </button>
        </div>

        <div className="mern-badge">MERN Stack · Socket.io · Real-time</div>
      </aside>

      {showSettings && (
        <SettingsPanel
          onClose={() => setShowSettings(false)}
          onLogout={handleLogout}
          onEditProfile={() => {
            setShowSettings(false);
            setShowEditProfile(true);
          }}
          onClearChat={handleClearChat}
        />
      )}

      {showEditProfile && (
        <EditProfile
          username={username}
          onClose={() => setShowEditProfile(false)}
          onProfileUpdated={handleProfileUpdated}
        />
      )}

      {showCreateGroup && (
        <CreateGroup
          username={username}
          onClose={() => setShowCreateGroup(false)}
          onCreated={handleGroupCreated}
        />
      )}

      {showGroupInfo && activeGroup && (
        <GroupInfo
          group={activeGroup}
          username={username}
          onlineUsers={onlineUsers}
          names={names}
          onClose={() => setShowGroupInfo(false)}
          onUpdated={handleGroupUpdated}
          onLeft={handleGroupLeftOrDeleted}
        />
      )}
    </div>
  );
}

export default App;