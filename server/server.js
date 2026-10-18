import "dotenv/config";
import express from "express";
import http from "http";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Server } from "socket.io";
import connectDB from "./config/db.js";
import Message from "./models/Message.js";
import User from "./models/User.js";
import Group from "./models/Group.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 5000;
const CLIENT_ORIGIN = "http://localhost:5173";
const SERVER_URL = `http://localhost:${PORT}`;

// ---------- Upload setup ----------
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });

// ---------- App setup ----------
const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());
app.use("/uploads", express.static(uploadDir));

// ---------- Upload route ----------
app.post("/api/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  let type = "file";
  if (req.file.mimetype.startsWith("video/")) type = "video";
  else if (req.file.mimetype.startsWith("image/")) type = "image";
  else if (req.file.mimetype.startsWith("audio/")) type = "audio";

  res.json({
    url: `${SERVER_URL}/uploads/${req.file.filename}`,
    type,
    name: req.file.originalname,
  });
});

// ---------- Auth routes ----------
app.post("/api/signup", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }
    const exists = await User.findOne({ username });
    if (exists) return res.status(400).json({ error: "Username already taken" });

    const user = await User.create({ username, password });
    res.status(201).json({ username: user.username });
  } catch {
    res.status(500).json({ error: "Signup failed" });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username, password });
    if (!user) return res.status(401).json({ error: "Invalid username or password" });

    res.json({ username: user.username });
  } catch {
    res.status(500).json({ error: "Login failed" });
  }
});

// ---------- Profile route ----------
// EditProfile.jsx ko ye field names bhejne chahiye: oldUsername, newUsername
app.post("/api/update-profile", async (req, res) => {
  try {
    const { oldUsername, newUsername } = req.body;
    if (!newUsername || !newUsername.trim()) {
      return res.status(400).json({ error: "Username cannot be empty" });
    }
    const newName = newUsername.trim();

    if (newName !== oldUsername) {
      const taken = await User.findOne({ username: newName });
      if (taken) return res.status(400).json({ error: "Username already taken" });

      await User.findOneAndUpdate({ username: oldUsername }, { username: newName });
      await Message.updateMany({ sender: oldUsername }, { sender: newName });

      const groups = await Group.find({
        $or: [{ members: oldUsername }, { admins: oldUsername }, { createdBy: oldUsername }],
      });
      for (const g of groups) {
        g.members = g.members.map((m) => (m === oldUsername ? newName : m));
        g.admins = g.admins.map((m) => (m === oldUsername ? newName : m));
        if (g.createdBy === oldUsername) g.createdBy = newName;
        await g.save();
      }
    }

    res.json({ username: newName });
  } catch {
    res.status(500).json({ error: "Could not update profile" });
  }
});

// ---------- Group routes ----------
app.post("/api/groups", async (req, res) => {
  try {
    const { name, creator } = req.body;
    if (!name || !creator) {
      return res.status(400).json({ error: "Name and creator required" });
    }
    const group = await Group.create({
      name,
      createdBy: creator,
      admins: [creator],
      members: [creator],
    });
    res.status(201).json(group);
  } catch {
    res.status(500).json({ error: "Could not create group" });
  }
});

app.get("/api/groups/user/:username", async (req, res) => {
  try {
    const groups = await Group.find({ members: req.params.username }).sort({ createdAt: -1 });
    res.json(groups);
  } catch {
    res.status(500).json({ error: "Could not load groups" });
  }
});

app.post("/api/groups/:id/members", async (req, res) => {
  try {
    const { actor, username } = req.body;
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: "Group not found" });
    if (!group.admins.includes(actor)) {
      return res.status(403).json({ error: "Only admins can add members" });
    }
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ error: "User not found. Pehle signup karwao." });
    if (group.members.includes(username)) {
      return res.status(400).json({ error: "Already a member" });
    }
    group.members.push(username);
    await group.save();
    res.json(group);
  } catch {
    res.status(500).json({ error: "Could not add member" });
  }
});

app.post("/api/groups/:id/remove", async (req, res) => {
  try {
    const { actor, username } = req.body;
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: "Group not found" });

    const isSelf = username === actor;
    if (!isSelf && !group.admins.includes(actor)) {
      return res.status(403).json({ error: "Only admins can remove members" });
    }
    if (username === group.createdBy) {
      return res.status(403).json({ error: "Creator cannot be removed" });
    }
    if (!group.members.includes(username)) {
      return res.status(400).json({ error: "Not a member" });
    }
    group.members = group.members.filter((m) => m !== username);
    group.admins = group.admins.filter((m) => m !== username);
    await group.save();
    res.json(group);
  } catch {
    res.status(500).json({ error: "Could not remove member" });
  }
});

app.post("/api/groups/:id/admin", async (req, res) => {
  try {
    const { actor, username } = req.body;
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: "Group not found" });
    if (!group.admins.includes(actor)) {
      return res.status(403).json({ error: "Only admins can make admins" });
    }
    if (!group.members.includes(username)) {
      return res.status(400).json({ error: "User is not a member" });
    }
    if (!group.admins.includes(username)) group.admins.push(username);
    await group.save();
    res.json(group);
  } catch {
    res.status(500).json({ error: "Could not make admin" });
  }
});

app.delete("/api/groups/:id", async (req, res) => {
  try {
    const { actor } = req.body;
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: "Group not found" });
    if (group.createdBy !== actor) {
      return res.status(403).json({ error: "Only the creator can delete the group" });
    }
    await Message.deleteMany({ room: req.params.id });
    await Group.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Could not delete group" });
  }
});

// ---------- Status & display name routes ----------
app.get("/api/users/status", async (req, res) => {
  try {
    const names = (req.query.names || "").split(",").filter(Boolean);
    const users = await User.find({ username: { $in: names } }, "username lastSeen displayName");
    const result = {};
    users.forEach((u) => {
      result[u.username] = { lastSeen: u.lastSeen, displayName: u.displayName || "" };
    });
    res.json(result);
  } catch {
    res.status(500).json({ error: "Could not load status" });
  }
});

app.post("/api/display-name", async (req, res) => {
  try {
    const { username, displayName } = req.body;
    const name = (displayName || "").trim().slice(0, 30);
    const user = await User.findOneAndUpdate({ username }, { displayName: name }, { new: true });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ displayName: user.displayName });
  } catch {
    res.status(500).json({ error: "Could not save name" });
  }
});

// ---------- Socket.io ----------
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: CLIENT_ORIGIN, methods: ["GET", "POST"] },
});

// ----- Presence (online / last seen) -----
const onlineCounts = new Map(); // username -> kitne tabs/sockets open hain

const onlineList = () => [...onlineCounts.keys()];

const broadcastPresence = () => {
  io.emit("presence", { online: onlineList() });
};

const markOfflineIfLast = async (username) => {
  const remaining = (onlineCounts.get(username) || 1) - 1;
  if (remaining > 0) {
    onlineCounts.set(username, remaining);
    return;
  }
  onlineCounts.delete(username);
  await User.findOneAndUpdate({ username }, { lastSeen: new Date() });
  broadcastPresence();
};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);
  socket.emit("presence", { online: onlineList() });

  socket.on("register", (username) => {
    if (!username || socket.data.username) return;
    socket.data.username = username;
    onlineCounts.set(username, (onlineCounts.get(username) || 0) + 1);
    broadcastPresence();
  });

  socket.on("unregister", async () => {
    const name = socket.data.username;
    if (!name) return;
    socket.data.username = null;
    await markOfflineIfLast(name);
  });

  socket.on("disconnect", async () => {
    console.log("User disconnected:", socket.id);
    const name = socket.data.username;
    if (!name) return;
    socket.data.username = null;
    await markOfflineIfLast(name);
  });

  socket.on("joinRoom", async (room) => {
    socket.join(room);
    const latest = await Message.find({ room }).sort({ createdAt: -1 }).limit(50);
    socket.emit("chatHistory", latest.reverse());
  });

  socket.on("leaveRoom", (room) => {
    socket.leave(room);
  });

  socket.on("sendMessage", async (data) => {
    try {
      const msg = await Message.create({
        room: data.room,
        sender: data.sender,
        text: data.text || "",
        fileUrl: data.fileUrl || "",
        fileType: data.fileType || "",
        fileName: data.fileName || "",
      });
      io.to(data.room).emit("newMessage", msg);
    } catch (err) {
      console.log("sendMessage error:", err.message);
    }
  });

  socket.on("deleteMessage", async ({ messageId, room, sender }) => {
    const msg = await Message.findById(messageId);
    if (!msg || msg.sender !== sender) return;
    await Message.findByIdAndDelete(messageId);
    io.to(room).emit("messageDeleted", messageId);
  });

  socket.on("editMessage", async ({ messageId, room, sender, text }) => {
    const msg = await Message.findById(messageId);
    if (!msg || msg.sender !== sender || msg.fileUrl) return;
    msg.text = text;
    msg.edited = true;
    await msg.save();
    io.to(room).emit("messageEdited", { messageId, text });
  });

  socket.on("deleteRoomChat", async ({ room }) => {
    await Message.deleteMany({ room });
    io.to(room).emit("chatCleared");
  });
});

// ---------- Start ----------
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});