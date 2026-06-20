import React, { useState } from 'react';
import { PenerimaBlt, PenyaluranBlt } from '../types';
import { Search, UserCheck } from 'lucide-react';
import ScanningPanel from './ScanningPanel';

interface ManualSearchProps {
  penerima: PenerimaBlt[];
  penyaluran?: PenyaluranBlt[];
  currentUser: { nama: string };
  onSalurkan: (data: Omit<PenyaluranBlt, 'id' | 'status'>) => Promise<void>;
}

export default function ManualSearch({ penerima, penyaluran = [], currentUser, onSalurkan }: ManualSearchProps) {
  const [searchWord, setSearchWord] = useState('');
  const [filterRt, setFilterRt] = useState('');
  const [filterRw, setFilterRw] = useState('');
  const [selectedKpm, setSelectedKpm] = useState<PenerimaBlt | null>(null);

  // Filter list matching NIK or Name
  const results = penerima.filter((p) => {
    const matchesSearch =
      p.nama.toLowerCase().includes(searchWord.toLowerCase()) ||
      p.nik.includes(searchWord);
    
    const matchesRt = filterRt === '' || p.rt === filterRt;
    const matchesRw = filterRw === '' || p.rw === filterRw;

    return matchesSearch && matchesRt && matchesRw;
  });

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
        <h2 className="text-lg font-extrabold tracking-tight text-slate-950 dark:text-white flex items-center gap-2">
          Pencarian Penerima Manual
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Gunakan fitur ini jika QR Code di kartu penerima rusak, basah, atau kamera HP petugas mengalami kendala.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left: Search result list (takes 5 columns) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 lg:col-span-5 space-y-4 shadow-sm">
          <h3 className="font-bold text-xs uppercase text-slate-800 dark:text-slate-200 tracking-wider">Database KPM</h3>
          
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchWord}
                onChange={(e) => setSearchWord(e.target.value)}
                placeholder="Ketik NIK atau Nama Penerima..."
                className="w-full bg-slate-50 dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-100 pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-255 dark:border-slate-800 focus:outline-none focus:border-emerald-650 font-sans"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={filterRt}
                onChange={(e) => setFilterRt(e.target.value)}
                placeholder="RT (Angka)"
                className="w-full bg-slate-50 dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-100 px-3.5 py-2.5 rounded-xl border border-slate-255 dark:border-slate-800 focus:outline-none focus:border-emerald-655"
              />
              <input
                type="text"
                value={filterRw}
                onChange={(e) => setFilterRw(e.target.value)}
                placeholder="RW (Angka)"
                className="w-full bg-slate-50 dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-100 px-3.5 py-2.5 rounded-xl border border-slate-255 dark:border-slate-800 focus:outline-none focus:border-emerald-655"
              />
            </div>
          </div>

          <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
            {results.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-6">KPM tidak ditemukan</p>
            ) : (
              results.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedKpm(item)}
                  type="button"
                  className={`w-full text-left p-3 rounded-lg border transition-all duration-150 flex items-center justify-between gap-2.5 cursor-pointer ${
                    selectedKpm?.id === item.id
                      ? 'bg-emerald-50/50 border-emerald-500/80 dark:bg-emerald-950/20'
                      : 'bg-white border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                      {item.nama}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                      NIK: {item.nik} | RT {item.rt} / RW {item.rw}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                    item.status === 'Sudah Disalurkan'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  }`}>
                    {item.status === 'Sudah Disalurkan' ? 'Salur' : 'Antri'}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right: Selected KPM disburse panel */}
        <div className="lg:col-span-7">
          {selectedKpm ? (
            <ScanningPanel 
              penerima={[selectedKpm]} 
              penyaluran={penyaluran}
              currentUser={currentUser} 
              onSalurkan={async (data) => {
                await onSalurkan(data);
                // Update local list state
                setSelectedKpm(prev => prev ? { ...prev, status: 'Sudah Disalurkan' } : null);
              }}
            />
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-400 shadow-sm min-h-[300px] flex flex-col items-center justify-center">
              <UserCheck className="w-12 h-12 stroke-1 text-slate-300 mb-3 animate-pulse" />
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Verifikasi Petugas Desa</h3>
              <p className="text-xs text-slate-500 mt-1.5 max-w-sm leading-relaxed">Pilih nama kepala keluarga dari panel daftar pencarian manual untuk membuka form audit foto, tanda tangan petugas, dan pencairan BLT.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
