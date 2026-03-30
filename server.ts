import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import sqlite3 from "better-sqlite3";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Ensure data directory exists
const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

// Database connections cache
const dbConnections: Record<string, any> = {};

function getDb(unitId: string): any {
  const dbPath = path.join(DATA_DIR, `${unitId}.db`);
  if (!dbConnections[unitId]) {
    const db = new sqlite3(dbPath);
    db.exec(`
      CREATE TABLE IF NOT EXISTS health_records (
        id TEXT PRIMARY KEY,
        stt INTEGER,
        thoiGian TEXT,
        diaDiem TEXT,
        noiDung TEXT,
        hinhThuc TEXT,
        doiTuong TEXT,
        soNguoi INTEGER,
        phuongTien TEXT,
        thoiLuong TEXT,
        staff TEXT,
        signature TEXT,
        ghiChu TEXT,
        unitId TEXT,
        sourceUnit TEXT,
        syncedAt TEXT
      )
    `);
    dbConnections[unitId] = db;
  }
  return dbConnections[unitId];
}

// API Keys (In a real app, these would be in .env)
const API_KEYS: Record<string, string> = {
  "tram-chinh": "key-tram-chinh-123",
  "doan-ket": "key-doan-ket-456",
  "ha-long": "key-ha-long-789",
  "dai-xuyen": "key-dai-xuyen-012",
  "van-yen": "key-van-yen-345"
};

// Middleware to verify API key
const verifyApiKey = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const apiKey = req.headers["x-api-key"];
  const unitId = req.params.unitId || req.body.unitId;

  if (!apiKey || (typeof unitId === 'string' && API_KEYS[unitId] !== apiKey)) {
    return res.status(401).json({ error: "Unauthorized: Invalid API Key" });
  }
  next();
};

// --- Station APIs ---

// GET /api/data/:unitId
app.get("/api/data/:unitId", verifyApiKey, (req, res) => {
  const { unitId } = req.params;
  try {
    const db = getDb(unitId);
    const rows = db.prepare("SELECT * FROM health_records ORDER BY thoiGian DESC").all();
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/data/:unitId
app.post("/api/data/:unitId", verifyApiKey, (req, res) => {
  const { unitId } = req.params;
  const record = req.body;
  try {
    const db = getDb(unitId);
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO health_records 
      (id, stt, thoiGian, diaDiem, noiDung, hinhThuc, doiTuong, soNguoi, phuongTien, thoiLuong, staff, signature, ghiChu, unitId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      record.id, record.stt, record.thoiGian, record.diaDiem, record.noiDung,
      record.hinhThuc, record.doiTuong, record.soNguoi, record.phuongTien,
      record.thoiLuong, record.staff, record.signature, record.ghiChu, unitId
    );

    res.json({ status: "success", id: record.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Central Station APIs ---

// POST /api/sync
app.post("/api/sync", (req, res) => {
  const { unitId, data, apiKey } = req.body;

  // Verify API key for the unit attempting to sync
  if (!apiKey || (typeof unitId === 'string' && API_KEYS[unitId] !== apiKey)) {
    return res.status(401).json({ error: "Unauthorized: Invalid API Key" });
  }

  try {
    const centralDb = getDb("central");
    const now = new Date().toISOString();

    const stmt = centralDb.prepare(`
      INSERT OR REPLACE INTO health_records 
      (id, stt, thoiGian, diaDiem, noiDung, hinhThuc, doiTuong, soNguoi, phuongTien, thoiLuong, staff, signature, ghiChu, unitId, sourceUnit, syncedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const syncTransaction = centralDb.transaction((records: any[]) => {
      for (const record of records) {
        stmt.run(
          record.id, record.stt, record.thoiGian, record.diaDiem, record.noiDung,
          record.hinhThuc, record.doiTuong, record.soNguoi, record.phuongTien,
          record.thoiLuong, record.staff, record.signature, record.ghiChu, record.unitId, unitId, now
        );
      }
    });

    syncTransaction(data);
    res.json({ status: "success", count: data.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/central/report
app.get("/api/central/report", (req, res) => {
  try {
    const centralDb = getDb("central");
    const rows = centralDb.prepare("SELECT * FROM health_records ORDER BY thoiGian DESC").all();
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Vite Integration ---

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
