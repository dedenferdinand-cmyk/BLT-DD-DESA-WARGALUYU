import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://hflyqbvgsaqfzjaivkxi.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_e9FyOuOPSj8InYq4PSeQFA_7x72cMZA";

// Initialize Supabase Client
const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

interface PenerimaBlt {
  id: string;
  nik: string;
  no_kk: string;
  nama: string;
  jenis_kelamin: 'Laki-laki' | 'Perempuan';
  alamat: string;
  rt: string;
  rw: string;
  nominal: number;
  tahun: string;
  tahap: string;
  status: 'Belum Disalurkan' | 'Sudah Disalurkan';
  created_at?: string;
  qr_code?: string;
}

interface PenyaluranBlt {
  id: string;
  penerima_id: string;
  nik: string;
  nama: string;
  alamat: string;
  rt: string;
  rw: string;
  nominal: number;
  tanggal: string; // YYYY-MM-DD
  jam: string; // HH:mm:ss
  petugas: string;
  foto_ktp: string; // base64 or storage URL
  foto_penerima: string; // base64 or storage URL
  status: 'Sudah Disalurkan';
  created_at?: string;
}

const DB_FILE = path.join(process.cwd(), "database.json");

const SEED_PENERIMA: PenerimaBlt[] = [
  {
    id: "p1",
    nik: "3205011212890001",
    no_kk: "3205012503140003",
    nama: "Ahmad Dahlan",
    jenis_kelamin: "Laki-laki",
    alamat: "Jl. Wargaluyu Indah No. 42",
    rt: "001",
    rw: "003",
    nominal: 300000,
    tahun: "2026",
    tahap: "Tahap 1",
    status: "Belum Disalurkan",
    created_at: new Date().toISOString()
  },
  {
    id: "p2",
    nik: "3205015505920005",
    no_kk: "3205012503140011",
    nama: "Siti Rahmaawati",
    jenis_kelamin: "Perempuan",
    alamat: "Kampung Siliwangi Rt 02",
    rt: "002",
    rw: "003",
    nominal: 300000,
    tahun: "2026",
    tahap: "Tahap 1",
    status: "Sudah Disalurkan",
    created_at: new Date().toISOString()
  },
  {
    id: "p3",
    nik: "3205011708780002",
    no_kk: "3205012211150009",
    nama: "Budi Santoso",
    jenis_kelamin: "Laki-laki",
    alamat: "Dusun Caringin Kulon",
    rt: "003",
    rw: "004",
    nominal: 300000,
    tahun: "2026",
    tahap: "Tahap 1",
    status: "Belum Disalurkan",
    created_at: new Date().toISOString()
  },
  {
    id: "p4",
    nik: "3205014309850004",
    no_kk: "3205012211150015",
    nama: "Dewi Lestari",
    jenis_kelamin: "Perempuan",
    alamat: "Kampung Sukasari RT 01",
    rt: "001",
    rw: "004",
    nominal: 300000,
    tahun: "2026",
    tahap: "Tahap 1",
    status: "Belum Disalurkan",
    created_at: new Date().toISOString()
  }
];

const SEED_PENYALURAN: PenyaluranBlt[] = [
  {
    id: "s1",
    penerima_id: "p2",
    nik: "3205015505920005",
    nama: "Siti Rahmaawati",
    alamat: "Kampung Siliwangi Rt 02",
    rt: "002",
    rw: "003",
    nominal: 300000,
    tanggal: "2026-06-15",
    jam: "09:45:00",
    petugas: "Admin Kantor Desa",
    foto_ktp: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
    foto_penerima: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
    status: "Sudah Disalurkan",
    created_at: new Date().toISOString()
  }
];

function readDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error("Error reading database file, using fallback:", err);
  }
  
  // Seed initial DB if not found
  const initial = { penerima: SEED_PENERIMA, penyaluran: SEED_PENYALURAN };
  writeDb(initial);
  return initial;
}

function writeDb(data: { penerima: PenerimaBlt[]; penyaluran: PenyaluranBlt[] }) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving to database file:", err);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Extend upload payload limit to handle base64 images size
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  console.log(`[SYS] Konfigurasi Supabase terdeteksi: URL=${SUPABASE_URL}`);

  // --- Helper to check and sync Supabase state ---
  const getPenerimaList = async (): Promise<PenerimaBlt[]> => {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("penerima_blt")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        
        // If Supabase is connected but empty, let's auto-seed it from our default local seed list!
        if (data && data.length === 0) {
          console.log("[SYS] Supabase terhubung tapi kosong, memulai otomatis proses migrasi/seeding awal...");
          const { error: seedErr } = await supabase.from("penerima_blt").insert(SEED_PENERIMA);
          if (!seedErr) {
            const { data: seededData } = await supabase.from("penerima_blt").select("*").order("created_at", { ascending: false });
            if (seededData) return seededData as PenerimaBlt[];
          } else {
            console.warn("[WARN] Gagal menyemai otomatis data awal Supabase:", seedErr.message);
          }
        }
        
        return data as PenerimaBlt[];
      } catch (err: any) {
        console.warn("[WARN] Gagal mengambil dari Supabase, gunakan file lokal:", err.message || err);
      }
    }
    return readDb().penerima;
  };

  const getPenyaluranList = async (): Promise<PenyaluranBlt[]> => {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("penyaluran_blt")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        
        // Auto seed penyaluran if connected but empty
        if (data && data.length === 0 && SEED_PENYALURAN.length > 0) {
          console.log("[SYS] Supabase menyemai data penyaluran awal secara otomatis...");
          await supabase.from("penyaluran_blt").insert(SEED_PENYALURAN);
          const { data: seededData } = await supabase.from("penyaluran_blt").select("*").order("created_at", { ascending: false });
          if (seededData) return seededData as PenyaluranBlt[];
        }

        return data as PenyaluranBlt[];
      } catch (err: any) {
        console.warn("[WARN] Gagal mengambil riwayat dari Supabase:", err.message || err);
      }
    }
    return readDb().penyaluran;
  };

  // --- API Endpoints ---

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      mode: "online-sync", 
      using_supabase: !!supabase,
      url: SUPABASE_URL
    });
  });

  // Get both lists (or just Penerima list)
  app.get("/api/penerima", async (req, res) => {
    const list = await getPenerimaList();
    res.json(list);
  });

  // Add Penerima
  app.post("/api/penerima", async (req, res) => {
    const payload = req.body;
    const item: PenerimaBlt = {
      ...payload,
      id: "p_" + Date.now() + Math.random().toString(36).substring(2, 6),
      status: "Belum Disalurkan",
      created_at: new Date().toISOString()
    };

    // Save to local file DB as fallback cache
    const db = readDb();
    db.penerima.push(item);
    writeDb(db);

    if (supabase) {
      try {
        // We match table column styles. Ensure to omit fields if database UUID generation handles it,
        // or write plain text ID.
        const { error } = await supabase.from("penerima_blt").insert([item]);
        if (!error) {
          return res.status(201).json(item);
        }
        console.warn("[WARN] Supabase insert error:", error.message);
      } catch (err) {
        console.warn("[WARN] Supabase insert exception:", err);
      }
    }

    res.status(201).json(item);
  });

  // Update Penerima
  app.put("/api/penerima/:id", async (req, res) => {
    const { id } = req.params;
    const body = req.body;

    // Update local file fallback
    const db = readDb();
    const index = db.penerima.findIndex((p: any) => p.id === id || p.nik === id);
    let updatedItem = null;

    if (index !== -1) {
      updatedItem = { ...db.penerima[index], ...body };
      db.penerima[index] = updatedItem;
      writeDb(db);
    }

    if (supabase) {
      try {
        // Try update in Supabase (check id matching)
        const { error } = await supabase
          .from("penerima_blt")
          .update(body)
          .or(`id.eq.${id},nik.eq.${id}`);

        if (!error) {
          return res.json(updatedItem || body);
        }
        console.warn("[WARN] Supabase update failed, served locally:", error.message);
      } catch (err) {
        console.warn("[WARN] Supabase update exception:", err);
      }
    }

    if (!updatedItem) {
      return res.status(404).json({ error: "Data tidak ditemukan" });
    }
    res.json(updatedItem);
  });

  // Delete Penerima
  app.delete("/api/penerima/:id", async (req, res) => {
    const { id } = req.params;

    // Delete locally
    const db = readDb();
    db.penerima = db.penerima.filter((p: any) => p.id !== id && p.nik !== id);
    db.penyaluran = db.penyaluran.filter((s: any) => s.penerima_id !== id && s.nik !== id);
    writeDb(db);

    if (supabase) {
      try {
        const { error } = await supabase
          .from("penerima_blt")
          .delete()
          .or(`id.eq.${id},nik.eq.${id}`);

        if (!error) {
          return res.json({ success: true });
        }
        console.warn("[WARN] Supabase delete failed, served locally:", error.message);
      } catch (err) {
        console.warn("[WARN] Supabase delete exception:", err);
      }
    }

    res.json({ success: true });
  });

  // Get active penyaluran history
  app.get("/api/penyaluran", async (req, res) => {
    const list = await getPenyaluranList();
    res.json(list);
  });

  // Add Penyaluran
  app.post("/api/penyaluran", async (req, res) => {
    const payload = req.body;
    const item: PenyaluranBlt = {
      ...payload,
      id: "s_" + Date.now() + Math.random().toString(36).substring(2, 6),
      status: "Sudah Disalurkan",
      created_at: new Date().toISOString()
    };

    // Update status in local backup database
    const db = readDb();
    const pIndex = db.penerima.findIndex((p: any) => p.id === payload.penerima_id || p.nik === payload.nik);
    if (pIndex !== -1) {
      db.penerima[pIndex].status = "Sudah Disalurkan";
    }
    db.penyaluran.push(item);
    writeDb(db);

    if (supabase) {
      try {
        // Step 1: Insert Penyaluran record
        const { error: errorPen } = await supabase.from("penyaluran_blt").insert([item]);
        
        if (!errorPen) {
          // Step 2: Update Penerima status in Supabase
          await supabase
            .from("penerima_blt")
            .update({ status: "Sudah Disalurkan" })
            .or(`id.eq.${payload.penerima_id},nik.eq.${payload.nik}`);

          return res.status(201).json(item);
        }
        console.warn("[WARN] Supabase penyaluran insert error:", errorPen.message);
      } catch (err) {
        console.warn("[WARN] Supabase penyaluran exception:", err);
      }
    }

    res.status(201).json(item);
  });

  // Import Backup data
  app.post("/api/import", async (req, res) => {
    const { penerima, penyaluran } = req.body;
    if (Array.isArray(penerima) && Array.isArray(penyaluran)) {
      writeDb({ penerima, penyaluran });

      if (supabase) {
        try {
          // Clear current
          await supabase.from("penyaluran_blt").delete().neq("id", "00000000-0000-0000-0000-000000000000");
          await supabase.from("penerima_blt").delete().neq("id", "00000000-0000-0000-0000-000000000000");

          // Insert new batches
          if (penerima.length > 0) await supabase.from("penerima_blt").insert(penerima);
          if (penyaluran.length > 0) await supabase.from("penyaluran_blt").insert(penyaluran);
        } catch (err) {
          console.warn("[WARN] Failed syncing import batch to Supabase:", err);
        }
      }

      res.json({ success: true, message: "Restorasi basis data berhasil disinkronkan!" });
    } else {
      res.status(400).json({ error: "Format berkas tidak valid" });
    }
  });

  // Reset to default seeds
  app.post("/api/reset", async (req, res) => {
    const initial = { penerima: SEED_PENERIMA, penyaluran: SEED_PENYALURAN };
    writeDb(initial);

    if (supabase) {
      try {
        await supabase.from("penyaluran_blt").delete().neq("id", "00000000-0000-0000-0000-000000000000");
        await supabase.from("penerima_blt").delete().neq("id", "00000000-0000-0000-0000-000000000000");
        
        await supabase.from("penerima_blt").insert(SEED_PENERIMA);
        await supabase.from("penyaluran_blt").insert(SEED_PENYALURAN);
      } catch (err) {
        console.warn("[WARN] Gagal melalukan factory reset Supabase:", err);
      }
    }

    res.json({ success: true, message: "Basis data didefaultkan ke setelan pabrik!" });
  });

  // --- Vite Dev Middleware or Serves Static files in production ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[OK] Server full-stack berjalan di http://0.0.0.0:${PORT}`);
  });
}

startServer();
