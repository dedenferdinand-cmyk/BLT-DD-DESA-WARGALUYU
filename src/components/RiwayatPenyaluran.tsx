import React, { useState } from 'react';
import { PenyaluranBlt } from '../types';
import { Search, Calendar, Clock, Image as ImageIcon, Eye, X, Contact2 } from 'lucide-react';

interface RiwayatPenyaluranProps {
  penyaluran: PenyaluranBlt[];
}

export default function RiwayatPenyaluran({ penyaluran }: RiwayatPenyaluranProps) {
  // Filters
  const [searchWord, setSearchWord] = useState('');
  const [filterRt, setFilterRt] = useState('');
  const [filterRw, setFilterRw] = useState('');
  const [filterDate, setFilterDate] = useState('');

  // Selected photo for Modal view
  const [activePhoto, setActivePhoto] = useState<{ src: string; title: string } | null>(null);

  // Filtered array
  const filteredList = penyaluran.filter((item) => {
    const matchesSearch =
      item.nama.toLowerCase().includes(searchWord.toLowerCase()) ||
      item.nik.includes(searchWord) ||
      item.petugas.toLowerCase().includes(searchWord.toLowerCase());
    
    const matchesRt = filterRt === '' || item.rt === filterRt;
    const matchesRw = filterRw === '' || item.rw === filterRw;
    const matchesDate = filterDate === '' || item.tanggal === filterDate;

    return matchesSearch && matchesRt && matchesRw && matchesDate;
  });

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
        <h2 className="text-lg font-extrabold tracking-tight text-slate-950 dark:text-white flex items-center gap-2">
          Riwayat Penyaluran BLT (Audit Trail)
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Jejak audit digital penyaluran dana desa. Dilengkapi dengan dokumentasi foto KTP dan foto penerima manfaat.
        </p>
      </div>

      {/* Advanced Filter Box */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari NIK, Nama, Petugas..."
            value={searchWord}
            onChange={(e) => setSearchWord(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 text-xs pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-255 dark:border-slate-800 focus:outline-none focus:border-emerald-650"
          />
        </div>

        {/* RT Filter */}
        <div>
          <input
            type="text"
            placeholder="RT (Angka)"
            value={filterRt}
            onChange={(e) => setFilterRt(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 text-xs px-3.5 py-2.5 rounded-xl border border-slate-255 dark:border-slate-800 focus:outline-none focus:border-emerald-655"
          />
        </div>

        {/* RW Filter */}
        <div>
          <input
            type="text"
            placeholder="RW (Angka)"
            value={filterRw}
            onChange={(e) => setFilterRw(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 text-xs px-3.5 py-2.5 rounded-xl border border-slate-255 dark:border-slate-800 focus:outline-none focus:border-emerald-655"
          />
        </div>

        {/* Date Filter */}
        <div className="relative">
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 text-xs px-3.5 py-2.5 rounded-xl border border-slate-255 dark:border-slate-800 focus:outline-none focus:border-emerald-655 text-slate-650"
          />
        </div>

        {(searchWord || filterRt || filterRw || filterDate) && (
          <div className="md:col-span-4 text-right">
            <button
              onClick={() => { setSearchWord(''); setFilterRt(''); setFilterRw(''); setFilterDate(''); }}
              type="button"
              className="text-xs font-bold text-red-600 hover:text-red-750 cursor-pointer hover:underline transition-all"
            >
              Hapus Semua Filter ({filteredList.length} hasil)
            </button>
          </div>
        )}
      </div>

      {/* History table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/50 text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-850">
                <th className="py-4 px-6">Penerima & NIK</th>
                <th className="py-4 px-6">RT / RW</th>
                <th className="py-4 px-6">Waktu Cair</th>
                <th className="py-4 px-6 text-right">Nominal</th>
                <th className="py-4 px-6">Petugas</th>
                <th className="py-4 px-6 text-center">Foto KTP</th>
                <th className="py-4 px-6 text-center">Foto Penerima</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs text-slate-800 dark:text-slate-200">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Contact2 className="w-10 h-10 mx-auto text-slate-300 stroke-1 mb-2 animate-pulse" />
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Tidak ada riwayat penyaluran</p>
                    <p className="text-[11px] text-slate-500 mt-1">Belum ada penyaluran realisasi terdaftar matching kriteria pencarian Anda.</p>
                  </td>
                </tr>
              ) : (
                filteredList.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-colors">
                    {/* Receiver column */}
                    <td className="py-4 px-6">
                      <p className="font-extrabold text-slate-900 dark:text-white text-sm">{item.nama}</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">{item.nik}</p>
                    </td>

                    {/* Ward columns */}
                    <td className="py-4 px-6 text-xs text-slate-500 font-mono">
                      <span>RT {item.rt} / RW {item.rw}</span>
                    </td>

                    {/* Date Time column */}
                    <td className="py-4 px-6 space-y-0.5">
                      <p className="flex items-center gap-1 text-slate-705 dark:text-slate-300">
                        <Calendar className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                        <span>
                          {new Date(item.tanggal).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </span>
                      </p>
                      <p className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3 text-slate-400 flex-shrink-0" /> {item.jam} WIB
                      </p>
                    </td>

                    {/* Nominal column */}
                    <td className="py-4 px-6 text-right font-extrabold text-emerald-600">
                      {formatIDR(item.nominal)}
                    </td>

                    {/* Officer column */}
                    <td className="py-4 px-6 text-xs text-slate-500">
                      <p className="font-semibold text-slate-750 dark:text-slate-300">{item.petugas}</p>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Verifikator</p>
                    </td>

                    {/* Image KTP cell */}
                    <td className="py-4 px-6 text-center">
                      {item.foto_ktp ? (
                        <button
                          onClick={() => setActivePhoto({ src: item.foto_ktp, title: `Foto KTP: ${item.nama}` })}
                          type="button"
                          className="inline-flex items-center justify-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:hover:bg-emerald-950 dark:text-emerald-400 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-emerald-200/50 dark:border-emerald-900/30 transition-all cursor-pointer"
                        >
                          <Eye className="w-3 h-3" /> Lihat KTP
                        </button>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-700 text-xs italic">N/A</span>
                      )}
                    </td>

                    {/* Image Receiver cell */}
                    <td className="py-4 px-6 text-center">
                      {item.foto_penerima ? (
                        <button
                          onClick={() => setActivePhoto({ src: item.foto_penerima, title: `Foto Penyerahan: ${item.nama}` })}
                          type="button"
                          className="inline-flex items-center justify-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-750 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
                        >
                          <ImageIcon className="w-3 h-3" /> Lihat Foto
                        </button>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-700 text-xs italic">N/A</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Photo Viewer modal wrapper */}
      {activePhoto && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden max-w-lg w-full border border-slate-150 dark:border-slate-800 shadow-xl relative transition-all animate-in zoom-in-95 duration-150">
            <div className="p-4 bg-slate-950 text-white flex items-center justify-between">
              <h4 className="font-bold text-xs tracking-tight truncate uppercase tracking-widest text-slate-400">{activePhoto.title}</h4>
              <button
                onClick={() => setActivePhoto(null)}
                type="button"
                className="bg-white/10 hover:bg-white/20 p-1 rounded-full cursor-pointer transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
            <div className="p-4 bg-slate-950 flex justify-center items-center">
              <img
                src={activePhoto.src}
                alt="Bukti BLT"
                referrerPolicy="no-referrer"
                className="max-h-[50vh] rounded-xl object-contain shadow-sm border border-slate-800/80"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
