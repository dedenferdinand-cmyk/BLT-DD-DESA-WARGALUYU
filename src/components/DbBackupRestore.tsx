import React, { useState } from 'react';
import { PenerimaBlt, PenyaluranBlt } from '../types';
import { Download, Upload, Copy, RefreshCw, FileSpreadsheet, Check, Database } from 'lucide-react';
import * as XLSX from 'xlsx';
import { SUPABASE_SQL_SETUP } from '../supabaseClient';

interface DbBackupRestoreProps {
  penerima: PenerimaBlt[];
  penyaluran: PenyaluranBlt[];
  onImportData: (penerimaList: PenerimaBlt[], penyaluranList: PenyaluranBlt[]) => void;
  onResetToDefaults: () => void;
}

export default function DbBackupRestore({ penerima, penyaluran, onImportData, onResetToDefaults }: DbBackupRestoreProps) {
  const [copiedSql, setCopiedSql] = useState(false);
  const [importFeedback, setImportFeedback] = useState<string | null>(null);

  // 1. Export Excel function
  const handleExportExcel = () => {
    const sortedPenyaluran = [...penyaluran].sort((a, b) => b.tanggal.localeCompare(a.tanggal));
    const processedList = sortedPenyaluran.map((item, index) => {
      return {
        'No': index + 1,
        'NIK': item.nik,
        'Nama': item.nama,
        'Alamat': item.alamat,
        'RT': item.rt,
        'RW': item.rw,
        'Nominal': item.nominal,
        'Tanggal': item.tanggal,
        'Jam': item.jam,
        'Petugas': item.petugas,
        'Status': item.status,
        'Foto KTP (Base64/Link)': item.foto_ktp ? item.foto_ktp.substring(0, 100) + '...' : 'Tidak ada',
        'Foto Penerima (Base64/Link)': item.foto_penerima ? item.foto_penerima.substring(0, 100) + '...' : 'Tidak ada'
      };
    });

    const processedKpm = penerima.map((item, index) => {
      return {
        'No': index + 1,
        'NIK': item.nik,
        'No KK': item.no_kk,
        'Nama Lengkap': item.nama,
        'Jenis Kelamin': item.jenis_kelamin,
        'Alamat': item.alamat,
        'RT': item.rt,
        'RW': item.rw,
        'Nominal BLT': item.nominal,
        'Tahun': item.tahun,
        'Tahap': item.tahap,
        'Status Penyaluran': item.status
      };
    });

    const workbook = XLSX.utils.book_new();
    
    const sheet1 = XLSX.utils.json_to_sheet(processedList);
    XLSX.utils.book_append_sheet(workbook, sheet1, "Penyaluran BLT");

    const sheet2 = XLSX.utils.json_to_sheet(processedKpm);
    XLSX.utils.book_append_sheet(workbook, sheet2, "Daftar KPM DTKS");

    XLSX.writeFile(workbook, "Penyaluran_BLT_Desa_Wargaluyu.xlsx");
  };

  // 2. Import Excel function
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const binaryString = event.target?.result;
        const workbook = XLSX.read(binaryString, { type: 'binary' });

        let parsedPenerima: PenerimaBlt[] = [];
        let parsedPenyaluran: PenyaluranBlt[] = [];

        if (workbook.SheetNames.includes("Daftar KPM DTKS")) {
          const sheet = workbook.Sheets["Daftar KPM DTKS"];
          const json: any[] = XLSX.utils.sheet_to_json(sheet);
          
          parsedPenerima = json.map((row, idx) => ({
            id: 'imp_p_' + idx + '_' + Math.random().toString(36).substr(2, 4),
            nik: String(row['NIK'] || ''),
            no_kk: String(row['No KK'] || ''),
            nama: String(row['Nama Lengkap'] || ''),
            jenis_kelamin: row['Jenis Kelamin'] === 'Perempuan' ? 'Perempuan' : 'Laki-laki',
            alamat: String(row['Alamat'] || ''),
            rt: String(row['RT'] || '001').padStart(3, '0'),
            rw: String(row['RW'] || '001').padStart(3, '0'),
            nominal: Number(row['Nominal BLT'] || 300000),
            tahun: String(row['Tahun'] || '2026'),
            tahap: String(row['Tahap'] || 'Tahap 1'),
            status: row['Status Penyaluran'] === 'Sudah Disalurkan' ? 'Sudah Disalurkan' : 'Belum Disalurkan'
          }));
        }

        if (workbook.SheetNames.includes("Penyaluran BLT")) {
          const sheet = workbook.Sheets["Penyaluran BLT"];
          const json: any[] = XLSX.utils.sheet_to_json(sheet);
          
          parsedPenyaluran = json.map((row, idx) => ({
            id: 'imp_s_' + idx + '_' + Math.random().toString(36).substr(2, 4),
            penerima_id: '',
            nik: String(row['NIK'] || ''),
            nama: String(row['Nama'] || ''),
            alamat: String(row['Alamat'] || ''),
            rt: String(row['RT'] || '').padStart(3, '0'),
            rw: String(row['RW'] || '').padStart(3, '0'),
            nominal: Number(row['Nominal'] || 300000),
            tanggal: String(row['Tanggal'] || ''),
            jam: String(row['Jam'] || ''),
            petugas: String(row['Petugas'] || 'Petugas Kantor Desa'),
            foto_ktp: '',
            foto_penerima: '',
            status: 'Sudah Disalurkan'
          }));
        }

        if (parsedPenerima.length === 0 && parsedPenyaluran.length === 0) {
          throw new Error('Format sheet tidak sesuai atau tidak mengandung sheet "Daftar KPM DTKS" atau "Penyaluran BLT"!');
        }

        onImportData(
          parsedPenerima.length > 0 ? parsedPenerima : penerima,
          parsedPenyaluran.length > 0 ? parsedPenyaluran : penyaluran
        );

        setImportFeedback(`🎉 Sukses mengimpor ${parsedPenerima.length} KPM dan ${parsedPenyaluran.length} data riwayat transaksi dari Excel!`);
        setTimeout(() => setImportFeedback(null), 8000);
      } catch (err: any) {
        alert('Gagal mengurai file Excel: ' + err.message);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };



  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SETUP);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
        <h2 className="text-lg font-extrabold tracking-tight text-slate-950 dark:text-white flex items-center gap-2">
          Sistem Administrasi & Integrasi Data
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Ekspor laporan, sinkronisasi data lokal, pencetakan barcode kolektif, dan integrasi skema SQL Supabase cloud.
        </p>
      </div>

      {importFeedback && (
        <div className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 text-xs font-semibold p-4 rounded-xl flex items-center gap-2">
          <span>✔️</span> {importFeedback}
        </div>
      )}

      {/* Main Grid: Excel Controls (Left) and Supabase SQL Controls (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column: Excel & Database Controls */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <h3 className="font-bold text-slate-900 text-xs dark:text-slate-200 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Export, Import & Database Tools
          </h3>

          <div className="space-y-4">
            
            {/* Step 1: Export Row */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/30 p-4 rounded-xl border border-slate-100 dark:border-slate-900/40">
              <div className="max-w-xs">
                <h4 className="font-bold text-xs text-slate-900 dark:text-white">Ekspor Database ke Excel</h4>
                <p className="text-[10px] text-slate-500 mt-1">Unduh seluruh KPM terdaftar dan riwayat pembayaran terbaru dalam format spreadsheet XLSX.</p>
              </div>
              <button
                onClick={handleExportExcel}
                type="button"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-sm transition-all cursor-pointer text-nowrap"
              >
                <Download className="w-3.5 h-3.5" /> Unduh XLSX
              </button>
            </div>

            {/* Step 2: Import Row */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/30 p-4 rounded-xl border border-slate-100 dark:border-slate-900/40">
              <div className="max-w-xs">
                <h4 className="font-bold text-xs text-slate-900 dark:text-white">Impor / Restore dari Excel</h4>
                <p className="text-[10px] text-slate-500 mt-1">Unggah file Excel &quot;Penyaluran_BLT_Desa_Wargaluyu.xlsx&quot; untuk restore atau migrasi massal dari arsip excel.</p>
              </div>
              <label className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-850 text-white text-xs font-bold px-3 py-2 rounded-lg transition-all cursor-pointer text-nowrap text-center">
                <Upload className="w-3.5 h-3.5" /> Unggah XLSX
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleImportExcel}
                  className="hidden"
                />
              </label>
            </div>

            {/* Step 3: Hard Reset */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-red-50/20 dark:bg-red-950/5 p-4 rounded-xl border border-red-100 dark:border-red-950/20">
              <div className="max-w-xs">
                <h4 className="font-bold text-xs text-red-700 dark:text-red-400">Arsipkan & Kosongkan Data</h4>
                <p className="text-[10px] text-red-650/80 dark:text-red-400/85 mt-1">Kembalikan aplikasi ke dataset awal dan kosongkan riwayat penyaluran. Tindakan ini permanen.</p>
              </div>
              <button
                onClick={() => {
                  if (confirm('Apakah Anda yakin ingin menghapus seluruh database data lapangan untuk kembali ke data demo default?')) {
                    onResetToDefaults();
                    alert('Database telah di-reset ke nilai demo default.');
                  }
                }}
                type="button"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 bg-red-650 hover:bg-red-700 text-white text-xs font-bold px-3 py-2 rounded-lg transition-all cursor-pointer text-nowrap"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reset Database
              </button>
            </div>

          </div>
        </div>

        {/* Right Column: Supabase Setup Wizard Schema */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-xs dark:text-slate-200 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Database className="w-4 h-4 text-emerald-600" /> PostgreSQL / Supabase Integration
          </h3>
          
          <p className="text-xs text-slate-500 leading-relaxed">
            Sistem terintegrasi dengan **Supabase Real-time Sync**! Anda dapat menghubungkan server database awan Anda dengan memasukkan token kredensial melalui panel **Database Host** di atas layar.
          </p>

          <p className="text-xs font-bold text-slate-850 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-150 dark:border-slate-800 leading-relaxed">
            Panduan migrasi tabel Supabase:
            <span className="block font-normal text-slate-500 dark:text-slate-400 mt-1">
              1. Buka dashboard Cloud Console Supabase Anda.<br />
              2. Masuk ke tab **SQL Editor** & paste skema SQL di bawah ini.<br />
              3. Tekan tombol **Run Query**.<br />
              4. Buat Storage Bucket bernama **blt-photos** dengan visibilitas public access.
            </span>
          </p>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <span>SQL Skema Script</span>
              <button
                onClick={copySqlToClipboard}
                type="button"
                className="inline-flex items-center gap-1 text-emerald-750 hover:text-emerald-805 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded transition-colors"
              >
                {copiedSql ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copiedSql ? 'Disalin' : 'Salin SQL'}
              </button>
            </div>

            <pre className="w-full bg-slate-950 text-emerald-400 rounded-xl p-4 text-[10px] font-mono h-24 overflow-y-auto border border-slate-900 text-left select-all">
              {SUPABASE_SQL_SETUP}
            </pre>
          </div>
        </div>
      </div>

    </div>
  );
}
