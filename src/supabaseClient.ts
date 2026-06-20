import { createClient } from '@supabase/supabase-js';
import { PenerimaBlt, PenyaluranBlt } from './types';

// Let's check environment or local storage for Supabase keys
const getSupabaseConfig = () => {
  const metaEnv = (import.meta as any).env || {};
  const envUrl = metaEnv.VITE_SUPABASE_URL || '';
  const envKey = metaEnv.VITE_SUPABASE_ANON_KEY || '';
  
  const localUrl = localStorage.getItem('blt_supabase_url') || '';
  const localKey = localStorage.getItem('blt_supabase_anon_key') || '';
  
  return {
    url: localUrl || envUrl,
    key: localKey || envKey,
    isCustom: !!(localUrl && localKey)
  };
};

export const config = getSupabaseConfig();

export const isSupabaseConfigured = () => {
  return !!config.url && !!config.key;
};

// Initialize the real Supabase client if configured
export const supabase = isSupabaseConfigured() 
  ? createClient(config.url, config.key) 
  : null;

// The SQL initialization code which the user can copy
export const SUPABASE_SQL_SETUP = `-- 1. Table: penerima_blt
CREATE TABLE IF NOT EXISTS public.penerima_blt (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nik VARCHAR(16) UNIQUE NOT NULL,
    no_kk VARCHAR(16) NOT NULL,
    nama VARCHAR(255) NOT NULL,
    jenis_kelamin VARCHAR(20) NOT NULL CHECK (jenis_kelamin IN ('Laki-laki', 'Perempuan')),
    alamat TEXT NOT NULL,
    rt VARCHAR(10) NOT NULL,
    rw VARCHAR(10) NOT NULL,
    nominal NUMERIC NOT NULL,
    tahun VARCHAR(4) NOT NULL,
    tahap VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'Belum Disalurkan' CHECK (status IN ('Belum Disalurkan', 'Sudah Disalurkan')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Table: penyaluran_blt
CREATE TABLE IF NOT EXISTS public.penyaluran_blt (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    penerima_id UUID REFERENCES public.penerima_blt(id) ON DELETE CASCADE,
    nik VARCHAR(16) NOT NULL,
    nama VARCHAR(255) NOT NULL,
    alamat TEXT NOT NULL,
    rt VARCHAR(10) NOT NULL,
    rw VARCHAR(10) NOT NULL,
    nominal NUMERIC NOT NULL,
    tanggal DATE DEFAULT CURRENT_DATE NOT NULL,
    jam TIME DEFAULT CURRENT_TIME NOT NULL,
    petugas VARCHAR(100) NOT NULL,
    foto_ktp TEXT, -- Berisi base64 atau URL storage
    foto_penerima TEXT, -- Berisi base64 atau URL storage
    status VARCHAR(20) DEFAULT 'Sudah Disalurkan' CHECK (status IN ('Sudah Disalurkan')),
    periode VARCHAR(50) DEFAULT 'Januari - Februari - Maret 2026',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Upgrade script if table already existed (to add missing columns)
ALTER TABLE public.penyaluran_blt ADD COLUMN IF NOT EXISTS periode VARCHAR(50) DEFAULT 'Januari - Februari - Maret 2026';

-- Enable Row Level Security (RLS)
ALTER TABLE public.penerima_blt ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.penyaluran_blt ENABLE ROW LEVEL SECURITY;

-- Create Policies for public anonymous read/write (since this is an internal officer app)
CREATE POLICY "Allow public read-write for penerima" ON public.penerima_blt FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for penyaluran" ON public.penyaluran_blt FOR ALL USING (true) WITH CHECK (true);

-- 3. Storage Bucket: Create 'blt-photos' bucket in Supabase storage for photos
-- Anda juga bisa mengunggah file foto sebagai base64 langsung ke tabel atau bucket 'blt-photos'`;

// ==========================================================
// ROBUST SANDBOX FALLBACK (Local Storage Database)
// ==========================================================
class SandboxDatabase {
  private getPenerima(): PenerimaBlt[] {
    const raw = localStorage.getItem('blt_sandbox_penerima');
    if (!raw) {
      // Seed initial highly detailed Indonesia-matched mock data so it doesn't look empty
      const initial: PenerimaBlt[] = [
        {
          id: 'p1',
          nik: '3205011212890001',
          no_kk: '3205012503140003',
          nama: 'Ahmad Dahlan',
          jenis_kelamin: 'Laki-laki',
          alamat: 'Jl. Wargaluyu Indah No. 42',
          rt: '001',
          rw: '003',
          nominal: 300000,
          tahun: '2026',
          tahap: 'Tahap 1',
          status: 'Belum Disalurkan',
        },
        {
          id: 'p2',
          nik: '3205015505920005',
          no_kk: '3205012503140011',
          nama: 'Siti Rahmaawati',
          jenis_kelamin: 'Perempuan',
          alamat: 'Kampung Siliwangi Rt 02',
          rt: '002',
          rw: '003',
          nominal: 300000,
          tahun: '2026',
          tahap: 'Tahap 1',
          status: 'Sudah Disalurkan',
        },
        {
          id: 'p3',
          nik: '3205011708780002',
          no_kk: '3205012211150009',
          nama: 'Budi Santoso',
          jenis_kelamin: 'Laki-laki',
          alamat: 'Dusun Caringin Kulon',
          rt: '003',
          rw: '004',
          nominal: 300000,
          tahun: '2026',
          tahap: 'Tahap 1',
          status: 'Belum Disalurkan',
        },
        {
          id: 'p4',
          nik: '3205014309850004',
          no_kk: '3205012211150015',
          nama: 'Dewi Lestari',
          jenis_kelamin: 'Perempuan',
          alamat: 'Kampung Sukasari RT 01',
          rt: '001',
          rw: '004',
          nominal: 300000,
          tahun: '2026',
          tahap: 'Tahap 1',
          status: 'Belum Disalurkan',
        }
      ];
      localStorage.setItem('blt_sandbox_penerima', JSON.stringify(initial));
      
      // Also seed a distribution history sync
      const initialPenyaluran: PenyaluranBlt[] = [
        {
          id: 's1',
          penerima_id: 'p2',
          nik: '3205015505920005',
          nama: 'Siti Rahmaawati',
          alamat: 'Kampung Siliwangi Rt 02',
          rt: '002',
          rw: '003',
          nominal: 300000,
          tanggal: '2026-06-15',
          jam: '09:45:00',
          petugas: 'Admin Kantor Desa',
          foto_ktp: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', // tiny 1px white dot placeholder
          foto_penerima: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
          status: 'Sudah Disalurkan'
        }
      ];
      localStorage.setItem('blt_sandbox_penyaluran', JSON.stringify(initialPenyaluran));
      return initial;
    }
    return JSON.parse(raw);
  }

  private savePenerima(list: PenerimaBlt[]) {
    localStorage.setItem('blt_sandbox_penerima', JSON.stringify(list));
  }

  private getPenyaluran(): PenyaluranBlt[] {
    const raw = localStorage.getItem('blt_sandbox_penyaluran');
    return raw ? JSON.parse(raw) : [];
  }

  private savePenyaluran(list: PenyaluranBlt[]) {
    localStorage.setItem('blt_sandbox_penyaluran', JSON.stringify(list));
  }

  // API wrappers
  async getPenerimaList(): Promise<PenerimaBlt[]> {
    return this.getPenerima();
  }

  async addPenerima(data: Omit<PenerimaBlt, 'id'>): Promise<PenerimaBlt> {
    const list = this.getPenerima();
    const newItem: PenerimaBlt = {
      ...data,
      id: 'p_' + Date.now() + Math.random().toString(36).substr(2, 4),
      status: 'Belum Disalurkan'
    };
    list.push(newItem);
    this.savePenerima(list);
    return newItem;
  }

  async updatePenerima(id: string, data: Partial<PenerimaBlt>): Promise<PenerimaBlt> {
    const list = this.getPenerima();
    const index = list.findIndex(p => p.id === id);
    if (index === -1) throw new Error('Data penerima tidak ditemukan');
    const updated = { ...list[index], ...data };
    list[index] = updated;
    this.savePenerima(list);
    return updated;
  }

  async deletePenerima(id: string): Promise<boolean> {
    const list = this.getPenerima();
    const updated = list.filter(p => p.id !== id);
    this.savePenerima(updated);
    
    // update penyaluran to delete correlated entries as well
    const penyaluran = this.getPenyaluran();
    const penyaluranUpdated = penyaluran.filter(p => p.penerima_id !== id);
    this.savePenyaluran(penyaluranUpdated);
    
    return true;
  }

  async getPenyaluranList(): Promise<PenyaluranBlt[]> {
    return this.getPenyaluran();
  }

  async addPenyaluran(data: Omit<PenyaluranBlt, 'id'>): Promise<PenyaluranBlt> {
    const pList = this.getPenerima();
    const pIndex = pList.findIndex(p => p.id === data.penerima_id || p.nik === data.nik);
    if (pIndex !== -1) {
      pList[pIndex].status = 'Sudah Disalurkan';
      this.savePenerima(pList);
    }

    const list = this.getPenyaluran();
    const newItem: PenyaluranBlt = {
      ...data,
      id: 's_' + Date.now() + Math.random().toString(36).substr(2, 4),
      status: 'Sudah Disalurkan'
    };
    list.push(newItem);
    this.savePenyaluran(list);
    return newItem;
  }

  resetAll() {
    localStorage.removeItem('blt_sandbox_penerima');
    localStorage.removeItem('blt_sandbox_penyaluran');
    this.getPenerima(); // triggers seed
  }

  importBackup(penerima: PenerimaBlt[], penyaluran: PenyaluranBlt[]) {
    this.savePenerima(penerima);
    this.savePenyaluran(penyaluran);
  }
}

// Helper UUID generators and sanitizers for Postgres Compatibility
const isUuid = (str: string) => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
};

const generateUuid = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const toDeterministicUuid = (str: string) => {
  if (!str) return '00000000-0000-0000-0000-000000000000';
  if (isUuid(str)) return str.toLowerCase();
  
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0') + 'abcdefabcdefabcdefabcdef'.slice(0, 24);
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    '4' + hex.slice(13, 16),
    '8' + hex.slice(17, 20),
    hex.slice(20, 32)
  ].join('-');
};

export const sandboxDb = new SandboxDatabase();

// ==========================================================
// UNIFIED DATA SERVICE (AUTO SWITCH SUPABASE VS SANDBOX)
// ==========================================================
export const DataService = {
  isUsingSupabase: () => isSupabaseConfigured(),

  getPenerima: async (): Promise<PenerimaBlt[]> => {
    try {
      const res = await fetch('/api/penerima');
      if (res.ok) {
        return await res.json() as PenerimaBlt[];
      }
    } catch (err) {
      console.warn('API error, falling back to direct Supabase:', err);
    }

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('penerima_blt')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data) {
          return data as PenerimaBlt[];
        }
        console.warn('Supabase direct query failed:', error);
      } catch (e) {
        console.warn('Supabase raw query exception:', e);
      }
    }

    return sandboxDb.getPenerimaList();
  },

  addPenerima: async (item: Omit<PenerimaBlt, 'id' | 'status'>): Promise<PenerimaBlt> => {
    const generatedId = generateUuid();
    const newItem: PenerimaBlt = {
      ...item,
      id: generatedId,
      status: 'Belum Disalurkan',
      created_at: new Date().toISOString()
    };

    try {
      const res = await fetch('/api/penerima', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });
      if (res.ok) {
        return await res.json() as PenerimaBlt;
      }
    } catch (err) {
      console.warn('API error, falling back to direct Supabase:', err);
    }

    if (supabase) {
      try {
        const mapped = {
          ...newItem,
          id: toDeterministicUuid(newItem.id)
        };
        const { error } = await supabase.from('penerima_blt').insert([mapped]);
        if (!error) {
          return newItem;
        }
        console.warn('Supabase direct insert failed:', error);
      } catch (e) {
        console.warn('Supabase raw insert exception:', e);
      }
    }

    const fallbackPayload = {
      ...item,
      status: 'Belum Disalurkan' as const
    };
    return sandboxDb.addPenerima(fallbackPayload);
  },

  updatePenerima: async (id: string, updates: Partial<PenerimaBlt>): Promise<PenerimaBlt> => {
    try {
      const res = await fetch(`/api/penerima/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        return await res.json() as PenerimaBlt;
      }
    } catch (err) {
      console.warn('API error, falling back to direct Supabase:', err);
    }

    if (supabase) {
      try {
        const uId = toDeterministicUuid(id);
        const { error } = await supabase
          .from('penerima_blt')
          .update(updates)
          .or(`id.eq.${uId},nik.eq.${id}`);
        if (!error) {
          return { ...updates, id } as any;
        }
        console.warn('Supabase direct update failed:', error);
      } catch (e) {
        console.warn('Supabase raw update exception:', e);
      }
    }

    return sandboxDb.updatePenerima(id, updates);
  },

  deletePenerima: async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/penerima/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        return true;
      }
    } catch (err) {
      console.warn('API error, falling back to direct Supabase:', err);
    }

    if (supabase) {
      try {
        const uId = toDeterministicUuid(id);
        const { error } = await supabase
          .from('penerima_blt')
          .delete()
          .or(`id.eq.${uId},nik.eq.${id}`);
        if (!error) {
          return true;
        }
        console.warn('Supabase direct delete failed:', error);
      } catch (e) {
        console.warn('Supabase raw delete exception:', e);
      }
    }

    return sandboxDb.deletePenerima(id);
  },

  getPenyaluran: async (): Promise<PenyaluranBlt[]> => {
    try {
      const res = await fetch('/api/penyaluran');
      if (res.ok) {
        return await res.json() as PenyaluranBlt[];
      }
    } catch (err) {
      console.warn('API error, falling back to direct Supabase:', err);
    }

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('penyaluran_blt')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data) {
          return data as PenyaluranBlt[];
        }
        console.warn('Supabase direct history failed:', error);
      } catch (e) {
        console.warn('Supabase history query exception:', e);
      }
    }

    return sandboxDb.getPenyaluranList();
  },

  addPenyaluran: async (item: Omit<PenyaluranBlt, 'id' | 'status'>): Promise<PenyaluranBlt> => {
    const generatedId = generateUuid();
    const newItem: PenyaluranBlt = {
      ...item,
      id: generatedId,
      status: 'Sudah Disalurkan',
      created_at: new Date().toISOString()
    };

    try {
      const res = await fetch('/api/penyaluran', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });
      if (res.ok) {
        return await res.json() as PenyaluranBlt;
      }
    } catch (err) {
      console.warn('API error, falling back to direct Supabase:', err);
    }

    if (supabase) {
      try {
        const mapped = {
          ...newItem,
          id: toDeterministicUuid(newItem.id),
          penerima_id: toDeterministicUuid(newItem.penerima_id)
        };
        const { error: err1 } = await supabase.from('penyaluran_blt').insert([mapped]);
        if (!err1) {
          const pUuid = toDeterministicUuid(newItem.penerima_id);
          await supabase
            .from('penerima_blt')
            .update({ status: 'Sudah Disalurkan' })
            .or(`id.eq.${pUuid},nik.eq.${newItem.nik}`);
          return newItem;
        }
        console.warn('Supabase direct penyaluran failed:', err1);
      } catch (e) {
        console.warn('Supabase raw penyaluran exception:', e);
      }
    }

    const fallbackPayload = {
      ...item,
      status: 'Sudah Disalurkan' as const
    };
    return sandboxDb.addPenyaluran(fallbackPayload);
  },

  // Upload Photo returns base64 directly since our server stores it inside JSON beautifully
  uploadPhoto: async (bucket: string, filePrefix: string, base64Data: string): Promise<string> => {
    return base64Data;
  },

  // Backup and restore data support
  restoreAllData: async (penerima: PenerimaBlt[], penyaluran: PenyaluranBlt[]) => {
    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ penerima, penyaluran })
      });
      if (res.ok) return;
    } catch (err) {
      console.warn('API error, restoring to Supabase:', err);
    }

    if (supabase) {
      try {
        await supabase.from('penyaluran_blt').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('penerima_blt').delete().neq('id', '00000000-0000-0000-0000-000000000000');

        if (penerima.length > 0) {
          const mappedPenerima = penerima.map(p => ({
            ...p,
            id: toDeterministicUuid(p.id)
          }));
          await supabase.from('penerima_blt').insert(mappedPenerima);
        }

        if (penyaluran.length > 0) {
          const mappedPenyaluran = penyaluran.map(s => ({
            ...s,
            id: toDeterministicUuid(s.id),
            penerima_id: toDeterministicUuid(s.penerima_id)
          }));
          await supabase.from('penyaluran_blt').insert(mappedPenyaluran);
        }
        return;
      } catch (e) {
        console.warn('Direct Supabase restore exception:', e);
      }
    }

    sandboxDb.importBackup(penerima, penyaluran);
  },

  resetAllData: async () => {
    try {
      const res = await fetch('/api/reset', {
        method: 'POST'
      });
      if (res.ok) return;
    } catch (err) {
      console.warn('API error, resetting Sandbox:', err);
    }

    if (supabase) {
      try {
        await supabase.from('penyaluran_blt').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('penerima_blt').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        
        const initialPenerima = [
          { id: 'p1', nik: '3205011212890001', no_kk: '3205012503140003', nama: 'Ahmad Dahlan', jenis_kelamin: 'Laki-laki', alamat: 'Jl. Wargaluyu Indah No. 42', rt: '001', rw: '003', nominal: 300000, tahun: '2026', tahap: 'Tahap 1', status: 'Belum Disalurkan' },
          { id: 'p2', nik: '3205015505920005', no_kk: '3205012503140011', nama: 'Siti Rahmaawati', jenis_kelamin: 'Perempuan', alamat: 'Kampung Siliwangi Rt 02', rt: '002', rw: '003', nominal: 300000, tahun: '2026', tahap: 'Tahap 1', status: 'Sudah Disalurkan' },
          { id: 'p3', nik: '3205011708780002', no_kk: '3205012211150009', nama: 'Budi Santoso', jenis_kelamin: 'Laki-laki', alamat: 'Dusun Caringin Kulon', rt: '003', rw: '004', nominal: 300000, tahun: '2026', tahap: 'Tahap 1', status: 'Belum Disalurkan' },
          { id: 'p4', nik: '3205014309850004', no_kk: '3205012211150015', nama: 'Dewi Lestari', jenis_kelamin: 'Perempuan', alamat: 'Kampung Sukasari RT 01', rt: '001', rw: '004', nominal: 300000, tahun: '2026', tahap: 'Tahap 1', status: 'Belum Disalurkan' }
        ].map(p => ({ ...p, id: toDeterministicUuid(p.id) }));

        await supabase.from('penerima_blt').insert(initialPenerima);

        const initialPenyaluran = [
          { id: 's1', penerima_id: 'p2', nik: '3205015505920005', nama: 'Siti Rahmaawati', alamat: 'Kampung Siliwangi Rt 02', rt: '002', rw: '003', nominal: 300000, tanggal: '2026-06-15', jam: '09:45:00', petugas: 'Admin Kantor Desa', status: 'Sudah Disalurkan' }
        ].map(s => ({ ...s, id: toDeterministicUuid(s.id), penerima_id: toDeterministicUuid(s.penerima_id) }));

        await supabase.from('penyaluran_blt').insert(initialPenyaluran);
        return;
      } catch (e) {
        console.warn('Direct Supabase reset exception:', e);
      }
    }

    sandboxDb.resetAll();
  }
};
