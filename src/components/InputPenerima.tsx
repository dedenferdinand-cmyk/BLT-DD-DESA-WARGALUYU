import React, { useState, useRef, useEffect } from 'react';
import { PenerimaBlt } from '../types';
import { Plus, Search, Edit2, Trash2, QrCode, Download, Printer, User, CreditCard, ShieldCheck, X, ChevronRight, Check } from 'lucide-react';
import QRCode from 'qrcode';

interface InputPenerimaProps {
  penerima: PenerimaBlt[];
  onAdd: (data: Omit<PenerimaBlt, 'id' | 'status'>) => Promise<void>;
  onEdit: (id: string, data: Partial<PenerimaBlt>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function InputPenerima({ penerima, onAdd, onEdit, onDelete }: InputPenerimaProps) {
  // States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRt, setFilterRt] = useState('');
  const [filterRw, setFilterRw] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PenerimaBlt | null>(null);

  // Form states
  const [nik, setNik] = useState('');
  const [noKk, setNoKk] = useState('');
  const [nama, setNama] = useState('');
  const [jenisKelamin, setJenisKelamin] = useState<'Laki-laki' | 'Perempuan'>('Laki-laki');
  const [alamat, setAlamat] = useState('');
  const [rt, setRt] = useState('');
  const [rw, setRw] = useState('');
  const [nominal, setNominal] = useState(300000);
  const [tahun, setTahun] = useState('2026');
  const [tahap, setTahap] = useState('Tahap 1');

  // Preview Card state
  const [selectedPenerima, setSelectedPenerima] = useState<PenerimaBlt | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Input validation assistance
  const [formError, setFormError] = useState('');

  // Handle QR code generation for preview card
  useEffect(() => {
    if (selectedPenerima) {
      // Generate QR Code as Base64/DataURL
      QRCode.toDataURL(
        selectedPenerima.nik,
        {
          width: 200,
          margin: 1.5,
          color: {
            dark: '#0f172a', // deep slate
            light: '#ffffff', // white
          },
        },
        (err, url) => {
          if (err) console.error(err);
          else setQrCodeUrl(url);
        }
      );
    } else {
      setQrCodeUrl('');
    }
  }, [selectedPenerima]);

  // Filtered lists
  const filteredPenerima = penerima.filter((item) => {
    const matchesSearch =
      item.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.nik.includes(searchQuery) ||
      item.no_kk.includes(searchQuery);
    
    const matchesRt = filterRt === '' || item.rt === filterRt;
    const matchesRw = filterRw === '' || item.rw === filterRw;

    return matchesSearch && matchesRt && matchesRw;
  });

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setNik('');
    setNoKk('');
    setNama('');
    setJenisKelamin('Laki-laki');
    setAlamat('');
    setRt('');
    setRw('');
    setNominal(300000);
    setTahun('2026');
    setTahap('Tahap 1');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: PenerimaBlt) => {
    setEditingItem(item);
    setNik(item.nik);
    setNoKk(item.no_kk);
    setNama(item.nama);
    setJenisKelamin(item.jenis_kelamin);
    setAlamat(item.alamat);
    setRt(item.rt);
    setRw(item.rw);
    setNominal(item.nominal);
    setTahun(item.tahun);
    setTahap(item.tahap);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    // NIK validation
    if (nik.length !== 16 || !/^\d+$/.test(nik)) {
      setFormError('NIK harus berupa 16 digit angka');
      return;
    }
    // KK validation
    if (noKk.length !== 16 || !/^\d+$/.test(noKk)) {
      setFormError('Nomor KK harus berupa 16 digit angka');
      return;
    }
    if (!nama.trim() || !alamat.trim() || !rt.trim() || !rw.trim()) {
      setFormError('Semua field wajib diisi');
      return;
    }

    const payload = {
      nik,
      no_kk: noKk,
      nama: nama.trim(),
      jenis_kelamin: jenisKelamin,
      alamat: alamat.trim(),
      rt: rt.padStart(3, '0'),
      rw: rw.padStart(3, '0'),
      nominal: Number(nominal),
      tahun,
      tahap,
    };

    try {
      if (editingItem) {
        await onEdit(editingItem.id, payload);
      } else {
        // Check if NIK duplicate
        const isDuplicate = penerima.some((p) => p.nik === nik);
        if (isDuplicate) {
          setFormError('NIK sudah terdaftar dalam sistem!');
          return;
        }
        await onAdd(payload);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Gagal menyimpan data.');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus Keluarga Penerima Manfaat (KPM) ini? Semua riwayat transaksi penyaluran orang ini juga akan ikut dihapus.')) {
      await onDelete(id);
      if (selectedPenerima?.id === id) {
        setSelectedPenerima(null);
      }
    }
  };

  const downloadQR = () => {
    if (!selectedPenerima || !qrCodeUrl) return;
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `QR_BLT_${selectedPenerima.nama.replace(/\s+/g, '_')}_${selectedPenerima.nik}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printCard = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-extrabold tracking-tight text-slate-950 dark:text-white flex items-center gap-2">
            Data Penerima KPM
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Kelola data Keluarga Penerima Manfaat (KPM) DTKS untuk wilayah Desa Wargaluyu.
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Tambah Penerima
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari NIK, Nama Lengkap, atau nomor KK..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 dark:text-slate-100 pl-10 pr-4 py-2.5 rounded-xl border border-slate-250 dark:border-slate-800 text-xs focus:outline-none focus:border-emerald-600"
          />
        </div>
        
        <div className="flex gap-2.5">
          <div className="w-24 sm:w-28">
            <input
              type="text"
              placeholder="RT"
              value={filterRt}
              onChange={(e) => setFilterRt(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 dark:text-slate-100 pl-3 pr-2 py-2.5 rounded-xl border border-slate-250 dark:border-slate-800 text-xs focus:outline-none focus:border-emerald-600"
            />
          </div>
          <div className="w-24 sm:w-28">
            <input
              type="text"
              placeholder="RW"
              value={filterRw}
              onChange={(e) => setFilterRw(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 dark:text-slate-100 pl-3 pr-2 py-2.5 rounded-xl border border-slate-250 dark:border-slate-800 text-xs focus:outline-none focus:border-emerald-600"
            />
          </div>
          {(filterRt || filterRw || searchQuery) && (
            <button
              onClick={() => { setFilterRt(''); setFilterRw(''); setSearchQuery(''); }}
              className="text-xs font-bold px-3 text-red-650 hover:text-red-750 bg-red-50 dark:bg-red-950/20 rounded-xl cursor-pointer transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area: Split List (Left) and Card Preview (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left List of KPM (takes 2 columns on large screen) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-bold text-slate-900 dark:text-slate-200 text-xs uppercase tracking-wider">
              Daftar Terdaftar <span className="text-emerald-700 dark:text-emerald-400">({filteredPenerima.length} KPM)</span>
            </h3>
            <span className="text-[10px] text-slate-400 uppercase tracking-wide">Pilih baris untuk detail lengkap</span>
          </div>

          <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
            {filteredPenerima.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 border border-dashed border-slate-200 dark:border-slate-850 text-center text-slate-400">
                <CreditCard className="w-10 h-10 mx-auto text-slate-300 stroke-1 mb-2 animate-pulse" />
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">KPM tidak ditemukan</p>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto mt-1">Sesuaikan kata kunci pencarian atau filter wilayah RT/RW Anda.</p>
              </div>
            ) : (
              filteredPenerima.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedPenerima(item)}
                  className={`group rounded-xl p-4 border transition-all duration-150 cursor-pointer flex items-center justify-between gap-3 text-left ${
                    selectedPenerima?.id === item.id
                      ? 'bg-emerald-50/50 border-emerald-500/80 dark:bg-emerald-950/20'
                      : 'bg-white border-slate-200 hover:border-slate-300 dark:bg-slate-900 dark:border-slate-800 dark:hover:border-slate-755'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 dark:text-white truncate text-sm group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                        {item.nama}
                      </h4>
                      <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                        item.status === 'Sudah Disalurkan'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        {item.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1.5 text-[11px] text-slate-500 dark:text-slate-450 font-mono">
                      <p className="truncate">NIK: {item.nik}</p>
                      <p className="truncate">KK: {item.no_kk}</p>
                      <p className="col-span-2 truncate font-sans text-slate-500 dark:text-slate-400 mt-0.5">
                        Alamat: {item.alamat} (RT {item.rt} / RW {item.rw})
                      </p>
                    </div>
                  </div>

                  {/* Actions column */}
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleOpenEditModal(item)}
                      title="Edit Penerima"
                      className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      title="Hapus Penerima"
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Preview Card (takes 1 column) */}
        <div>
          {selectedPenerima ? (
            <div className="sticky top-4 space-y-4">
              <div className="flex items-center justify-between px-1">
                <h3 className="font-bold text-slate-900 dark:text-slate-200 text-xs uppercase tracking-wider">Detail Informasi KPM</h3>
                <button
                  onClick={() => setSelectedPenerima(null)}
                  type="button"
                  className="text-xs font-semibold text-red-650 hover:text-red-700 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <X className="w-3.5 h-3.5" /> Tutup
                </button>
              </div>

              {/* Profile Details (Sleek Slate Container) */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5 text-left">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <span className="text-[10px] font-extrabold uppercase bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 px-2 py-0.5 rounded">
                    PROFIL AKTIF
                  </span>
                  <h4 className="font-extrabold text-slate-900 dark:text-white text-base mt-2 truncate leading-tight">
                    {selectedPenerima.nama}
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-1 uppercase font-semibold">Tahun Anggaran: {selectedPenerima.tahun} • {selectedPenerima.tahap}</p>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">Nomor Induk Kependudukan (NIK)</span>
                    <span className="font-mono text-slate-850 dark:text-slate-200 font-bold block mt-0.5 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-100 dark:border-slate-900/50">
                      {selectedPenerima.nik}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">Nomor Kartu Keluarga (KK)</span>
                    <span className="font-mono text-slate-850 dark:text-slate-200 font-bold block mt-0.5 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-100 dark:border-slate-900/50">
                      {selectedPenerima.no_kk}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">Jenis Kelamin</span>
                      <span className="font-semibold text-slate-850 dark:text-slate-200 block mt-0.5">{selectedPenerima.jenis_kelamin}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">Wilayah (RT / RW)</span>
                      <span className="font-mono font-semibold text-slate-850 dark:text-slate-200 block mt-0.5">RT {selectedPenerima.rt} / RW {selectedPenerima.rw}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">Alamat Rumah</span>
                    <span className="text-slate-700 dark:text-slate-300 block mt-0.5 leading-relaxed">{selectedPenerima.alamat}</span>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">Nominal Dana</span>
                      <span className="font-extrabold text-xs text-emerald-600 block mt-0.5">IDR {selectedPenerima.nominal.toLocaleString('id-ID')}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">Status</span>
                      <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider mt-1 ${
                        selectedPenerima.status === 'Sudah Disalurkan'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        {selectedPenerima.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-2xl p-6 text-center text-slate-400 select-none shadow-sm min-h-[300px] flex flex-col items-center justify-center">
              <User className="w-12 h-12 mx-auto stroke-1 text-slate-305 dark:text-slate-700 mb-3" />
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Detail Informasi KPM</p>
              <p className="text-[11px] text-slate-500 mt-1 max-w-[200px] mx-auto leading-relaxed">Pilih salah satu KPM dari daftar untuk menampilkan rincian data Keluarga Penerima Manfaat secara mendalam.</p>
            </div>
          )}
        </div>
      </div>

      {/* Insert and Edit Modal dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden transform transition-all animate-in fade-in zoom-in duration-150">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white flex items-center justify-between">
              <h3 className="font-extrabold text-sm sm:text-base flex items-center gap-2">
                <User className="w-4 h-4 text-emerald-600" />
                {editingItem ? 'Edit Data Penerima KPM' : 'Tambah Penerima KPM Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                type="button"
                className="text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 p-1 rounded-full cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 text-xs font-semibold p-3 rounded-xl flex items-center gap-1.5">
                  <span>⚠️</span> {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* NIK Field */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">NIK (Nomor Induk Kependudukan)</label>
                  <input
                    type="text"
                    maxLength={16}
                    required
                    value={nik}
                    onChange={(e) => setNik(e.target.value.replace(/\D/g, ''))}
                    placeholder="Masukkan 16 digit NIK..."
                    className="w-full bg-slate-50 dark:bg-slate-950 dark:text-slate-100 border border-slate-200 dark:border-slate-800 focus:border-emerald-600 focus:outline-none rounded-lg px-3 py-2 text-xs font-mono"
                  />
                </div>

                {/* KK Field */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Nomor Kartu Keluarga (KK)</label>
                  <input
                    type="text"
                    maxLength={16}
                    required
                    value={noKk}
                    onChange={(e) => setNoKk(e.target.value.replace(/\D/g, ''))}
                    placeholder="Masukkan 16 digit no KK..."
                    className="w-full bg-slate-50 dark:bg-slate-950 dark:text-slate-100 border border-slate-200 dark:border-slate-800 focus:border-emerald-600 focus:outline-none rounded-lg px-3 py-2 text-xs font-mono"
                  />
                </div>

                {/* Nama Lengkap */}
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Nama Lengkap Kepala Penerima</label>
                  <input
                    type="text"
                    required
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    placeholder="Nama lengkap sesuai KK atau KTP"
                    className="w-full bg-slate-50 dark:bg-slate-950 dark:text-slate-100 border border-slate-200 dark:border-slate-800 focus:border-emerald-600 focus:outline-none rounded-lg px-3 py-2 text-xs"
                  />
                </div>

                {/* Jenis Kelamin */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Jenis Kelamin</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setJenisKelamin('Laki-laki')}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border text-center transition-all cursor-pointer ${
                        jenisKelamin === 'Laki-laki'
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-450 dark:border-emerald-800'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600'
                      }`}
                    >
                      Laki-laki
                    </button>
                    <button
                      type="button"
                      onClick={() => setJenisKelamin('Perempuan')}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border text-center transition-all cursor-pointer ${
                        jenisKelamin === 'Perempuan'
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-450 dark:border-emerald-800'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600'
                      }`}
                    >
                      Perempuan
                    </button>
                  </div>
                </div>

                {/* Nominal BLT */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Nominal BLT (Rupiah)</label>
                  <input
                    type="number"
                    required
                    value={nominal}
                    onChange={(e) => setNominal(Number(e.target.value))}
                    placeholder="300000"
                    className="w-full bg-slate-50 dark:bg-slate-950 dark:text-slate-100 border border-slate-200 dark:border-slate-800 focus:border-emerald-600 focus:outline-none rounded-lg px-3 py-2 text-xs font-semibold"
                  />
                </div>

                {/* Alamat Lengkap */}
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Alamat Lengkap</label>
                  <input
                    type="text"
                    required
                    value={alamat}
                    onChange={(e) => setAlamat(e.target.value)}
                    placeholder="Nama Dusun, Jalan atau Kampung"
                    className="w-full bg-slate-50 dark:bg-slate-950 dark:text-slate-100 border border-slate-200 dark:border-slate-800 focus:border-emerald-600 focus:outline-none rounded-lg px-3 py-2 text-xs"
                  />
                </div>

                {/* RT & RW */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">RT</label>
                  <input
                    type="text"
                    required
                    maxLength={3}
                    value={rt}
                    onChange={(e) => setRt(e.target.value.replace(/\D/g, ''))}
                    placeholder="001"
                    className="w-full bg-slate-50 dark:bg-slate-950 dark:text-slate-100 border border-slate-200 dark:border-slate-800 focus:border-emerald-600 focus:outline-none rounded-lg px-3 py-2 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">RW</label>
                  <input
                    type="text"
                    required
                    maxLength={3}
                    value={rw}
                    onChange={(e) => setRw(e.target.value.replace(/\D/g, ''))}
                    placeholder="003"
                    className="w-full bg-slate-50 dark:bg-slate-950 dark:text-slate-100 border border-slate-200 dark:border-slate-800 focus:border-emerald-600 focus:outline-none rounded-lg px-3 py-2 text-xs font-semibold"
                  />
                </div>

                {/* Tahun & Tahap */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Tahun Anggaran</label>
                  <select
                    value={tahun}
                    onChange={(e) => setTahun(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 dark:text-slate-100 border border-slate-200 dark:border-slate-800 focus:border-emerald-600 focus:outline-none rounded-lg px-3 py-2 text-xs font-semibold"
                  >
                    <option value="2026">2026</option>
                    <option value="2025">2025</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Tahap Pembayaran</label>
                  <select
                    value={tahap}
                    onChange={(e) => setTahap(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 dark:text-slate-100 border border-slate-200 dark:border-slate-800 focus:border-emerald-600 focus:outline-none rounded-lg px-3 py-2 text-xs font-semibold"
                  >
                    <option value="Tahap 1">Tahap 1</option>
                    <option value="Tahap 2">Tahap 2</option>
                    <option value="Tahap 3">Tahap 3</option>
                    <option value="Tahap 4">Tahap 4</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-bold rounded-lg transition-colors border border-slate-200 dark:border-slate-750 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-center gap-1">
                    <ShieldCheck className="w-4 h-4" /> Simpan Data
                  </div>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
