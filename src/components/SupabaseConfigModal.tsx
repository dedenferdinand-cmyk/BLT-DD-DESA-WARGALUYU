import React, { useState } from 'react';
import { Database, X, Check } from 'lucide-react';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (url: string, key: string) => void;
}

export default function SupabaseConfigModal({ isOpen, onClose, onSave }: SupabaseConfigModalProps) {
  const [url, setUrl] = useState(localStorage.getItem('blt_supabase_url') || '');
  const [key, setKey] = useState(localStorage.getItem('blt_supabase_anon_key') || '');
  const [isSaved, setIsSaved] = useState(false);

  if (!isOpen) return null;

  const handleClearKeys = () => {
    localStorage.removeItem('blt_supabase_url');
    localStorage.removeItem('blt_supabase_anon_key');
    setUrl('');
    setKey('');
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onSave('', '');
    }, 1000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('blt_supabase_url', url.trim());
    localStorage.setItem('blt_supabase_anon_key', key.trim());
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onSave(url.trim(), key.trim());
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-xl border border-slate-205 dark:border-slate-800 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header toolbar */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-slate-900 dark:text-white">
          <h3 className="font-extrabold text-sm sm:text-base flex items-center gap-1.5">
            <Database className="w-4 h-4 text-emerald-600" />
            Konfigurasi Supabase DB
          </h3>
          <button
            onClick={onClose}
            type="button"
            className="text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 p-1 rounded-full cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Info label */}
        <div className="p-6 space-y-4">
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Secara default, aplikasi berjalan di **Mode Sandbox Lokal (Offline Browser)** agar dapat diuji instan. Masukkan kredensial API Supabase Anda jika ingin melakukan sinkronisasi global dengan server awan.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSaved && (
              <div className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-450 border border-emerald-200 dark:border-emerald-900 text-xs font-semibold p-3 rounded-xl flex items-center justify-center gap-1.5 animate-bounce">
                <Check className="w-4 h-4" /> Kredensial disimpan! Menyambung...
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Supabase URL Project</label>
              <input
                type="url"
                required={!!key}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://xyzcompany.supabase.co"
                className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-850 focus:border-emerald-600 focus:outline-none rounded-lg px-3 py-2 text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Supabase Anon Key (API Public Key)</label>
              <textarea
                rows={3}
                required={!!url}
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-850 focus:border-emerald-600 focus:outline-none rounded-lg px-3 py-2 text-xs font-mono"
              />
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleClearKeys}
                className="flex-1 py-2 bg-slate-50 hover:bg-slate-105 dark:bg-slate-850 dark:hover:bg-slate-800 text-red-650 text-xs font-bold rounded-lg transition-colors border border-slate-200 dark:border-slate-750 cursor-pointer"
              >
                Hapus & Re-Sandbox
              </button>
              
              <button
                type="submit"
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                Hubungkan DB
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
