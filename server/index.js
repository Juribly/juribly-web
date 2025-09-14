const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5174", "http://localhost:5175"],
    methods: ["GET", "POST"]
  }
});

// --- Simple persistence for trials ---
const DATA_DIR = path.join(__dirname, "data");
const TRIALS_PATH = path.join(DATA_DIR, "trials.json");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(TRIALS_PATH)) fs.writeFileSync(TRIALS_PATH, JSON.stringify({ trials: [] }, null, 2));

function loadTrials() {
  try {
    const raw = fs.readFileSync(TRIALS_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return parsed.trials || [];
  } catch {
    return [];
  }
}
function saveTrials() {
  fs.writeFileSync(TRIALS_PATH, JSON.stringify({ trials }, null, 2));
}

// In-memory (persisted)
let trials = loadTrials();

// Seating state per trial
const seatState = {}; // { [trialId]: { seats: [...], taken: { [seatKey]: socketId } } }

function buildSeatsForTrial(trialId) {
  if (seatState[trialId]) return seatState[trialId];
  const tiers = 5;
  const perRing = 24;
  const baseRadius = 12;
  const ringGap = 2.0;

  const seats = [];
  for (let t = 0; t < tiers; t++) {
    const r = baseRadius + t * ringGap;
    for (let i = 0; i < perRing; i++) {
      const a = (i / perRing) * Math.PI * 2;
      seats.push({ x: Math.cos(a) * r, y: 0, z: Math.sin(a) * r, tier: t + 1, angle: a });
    }
  }
  seatState[trialId] = { seats, taken: {} };
  return seatState[trialId];
}
function seatKey(s) {
  return `${s.tier}:${s.x.toFixed(3)}:${s.z.toFixed(3)}`;
}
function nearestFreeSeat(trialId, hint = { x: 0, z: 0 }) {
  const ss = buildSeatsForTrial(trialId);
  const free = ss.seats.filter(s => !ss.taken[seatKey(s)]);
  if (!free.length) return null;
  free.sort((a, b) => {
    const da = (a.x - hint.x) ** 2 + (a.z - hint.z) ** 2;
    const db = (b.x - hint.x) ** 2 + (b.z - hint.z) ** 2;
    return da - db;
  });
  return free[0];
}

// -------- REST API --------
app.get("/api/trials", (req, res) => {
  res.json({ trials });
});

app.post("/api/trials", (req, res) => {
  const { title, description } = req.body || {};
  const id = String(Date.now());
  const row = {
    id,
    title: String(title || "Untitled Trial"),
    description: String(description || ""),
    created_at: new Date().toISOString()
  };
  trials.unshift(row);
  saveTrials();
  res.json({ ok: true, trial: row });
});

app.get("/api/trials/:id", (req, res) => {
  const t = trials.find(x => x.id === req.params.id);
  if (!t) return res.status(404).json({ error: "not_found" });
  res.json({ trial: t });
});

// -------- Sockets --------
io.on("connection", (socket) => {
  socket.on("room:join", ({ trialId, role, name }) => {
    socket.join(trialId);
    socket.data.trialId = trialId;
    socket.data.role = role || "Audience";
    socket.data.name = name || "User";
    socket.to(trialId).emit("presence:join", { id: socket.id, name: socket.data.name, role: socket.data.role });
  });

  socket.on("seat:request", ({ trialId, hint }) => {
    const s = nearestFreeSeat(trialId, hint);
    if (!s) return socket.emit("seat:assigned", { ok: false, reason: "no_seats" });
    const key = seatKey(s);
    seatState[trialId].taken[key] = socket.id;
    socket.data.seatKey = key;
    socket.emit("seat:assigned", { ok: true, seat: s });
    socket.to(trialId).emit("seat:occupied", { seat: s });
  });

  socket.on("seat:release", ({ trialId }) => {
    const key = socket.data.seatKey;
    if (key && seatState[trialId]?.taken[key]) {
      delete seatState[trialId].taken[key];
      socket.to(trialId).emit("seat:freed", { seatKey: key });
      socket.data.seatKey = null;
    }
  });

  socket.on("chat:msg", ({ trialId, payload }) => {
    if (!trialId || !payload?.text) return;
    const msg = {
      id: String(Date.now()) + Math.random().toString(16).slice(2),
      from: socket.data.name || "User",
      role: socket.data.role || "Audience",
      text: String(payload.text).slice(0, 500),
      at: Date.now(),
      position: payload.position || { x: 0, y: 0, z: 0 }
    };
    io.to(trialId).emit("chat:msg", msg);
  });

  socket.on("judge:action", ({ trialId, action }) => {
    if (!trialId || !action) return;
    const banner = action === "start" ? "Session started"
      : action === "stop" ? "Session stopped"
      : action === "call_witness" ? "Witness, please step forward"
      : "Action";
    io.to(trialId).emit("court:banner", { text: banner, at: Date.now() });
  });

  socket.on("disconnect", () => {
    const trialId = socket.data.trialId;
    if (trialId) {
      const key = socket.data.seatKey;
      if (key && seatState[trialId]?.taken[key]) {
        delete seatState[trialId].taken[key];
        socket.to(trialId).emit("seat:freed", { seatKey: key });
      }
      socket.to(trialId).emit("presence:leave", { id: socket.id });
    }
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
