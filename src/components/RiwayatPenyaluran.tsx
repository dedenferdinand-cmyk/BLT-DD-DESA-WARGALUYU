import React, { useState } from 'react';
import { PenerimaBlt, PenyaluranBlt } from '../types';
import { Search, Calendar, Clock, Image as ImageIcon, Eye, X, Contact2, Printer, FileText, FileDown } from 'lucide-react';
import { jsPDF } from 'jspdf';

// Helper to format date in Indonesian locale
const formatDateIndo = (dateStr: string) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch (e) {
    return dateStr;
  }
};

// Generates Kop Surat & Header for a page
const generateKopAndHeader = (doc: jsPDF, pageNum?: number, totalPages?: number, periode?: string) => {
  const marginX = 15;
  const widthTotal = 215; // F4 Width in mm

  // 1. KOP SURAT (Pemerintah Desa)
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('PEMERINTAH KABUPATEN BANDUNG', widthTotal / 2, 16, { align: 'center' });

  doc.setFontSize(12);
  doc.text('KECAMATAN ARJASARI', widthTotal / 2, 22, { align: 'center' });

  doc.setFontSize(15);
  doc.text('DESA WARGALUYU', widthTotal / 2, 29, { align: 'center' });

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Alamat: Jl. M.Adhikarta No. 86 Email: Wargaluyu@bandungkab.go.id Kodepos 40379', widthTotal / 2, 35, { align: 'center' });

  // Double horizontal header lines
  doc.setLineWidth(0.8);
  doc.line(marginX, 38, widthTotal - marginX, 38);
  doc.setLineWidth(0.2);
  doc.line(marginX, 39.2, widthTotal - marginX, 39.2);

  // Document Title
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('PENERIMA MANFAAT BLT DD', widthTotal / 2, 45, { align: 'center' });
  
  const displayPeriod = periode || 'Januari - Februari - Maret 2026';
  doc.text(displayPeriod.toUpperCase(), widthTotal / 2, 50, { align: 'center' });

  // Footer page label
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(120, 120, 120);
  doc.text('Dokumen arsip digital penyerahan bantuan Desa Wargaluyu, Kecamatan Arjasari, Kabupaten Bandung.', marginX, 318);
  if (pageNum && totalPages) {
    doc.text(`Halaman ${pageNum} dari ${totalPages}`, widthTotal - marginX, 318, { align: 'right' });
  } else {
    doc.text('Halaman 1 dari 1', widthTotal - marginX, 318, { align: 'right' });
  }
  doc.setTextColor(0, 0, 0); // reset
};

// Draws a compact KPM row/card block inside F4 page
const drawKpmBlock = (doc: jsPDF, item: PenyaluranBlt, yOffset: number) => {
  const marginX = 15;
  const widthTotal = 215;
  const widthPrintable = widthTotal - (marginX * 2); // 185mm

  // Outer container box with soft light fill
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.25);
  doc.setFillColor(252, 252, 252);
  doc.rect(marginX, yOffset, widthPrintable, 46, 'DF');

  // Text details on the left (Nama & NIK)
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('NAMA PENERIMA:', marginX + 4, yOffset + 6);

  // Client name
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42); // slate-900 color
  const nameChunks = doc.splitTextToSize(item.nama.toUpperCase(), 50);
  doc.text(nameChunks, marginX + 4, yOffset + 12);

  // Client NIK
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('NIK / NO. KTP:', marginX + 4, yOffset + 30);
  
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(item.nik, marginX + 4, yOffset + 36);

  // Reset text color for general
  doc.setTextColor(0, 0, 0);

  // Photo dimensions & positions
  const ktpX = marginX + 58;
  const colWidthKtp = 56; // Standard aspect ratio (~1.58 ratio)
  const colHeightKtp = 34.8;

  const penerimaX = marginX + 118;
  const colWidthPenerima = 47; // standard vertical portrait or slightly square representation
  const colHeightPenerima = 34.8; // Align tops and bases perfectly

  // Tiny top labels
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(110, 110, 110);
  doc.text('FOTO KARTU TANDA PENDUDUK (KTP)', ktpX + (colWidthKtp / 2), yOffset + 5, { align: 'center' });
  doc.text('FOTO DOKUMENTASI PENERIMA', penerimaX + (colWidthPenerima / 2), yOffset + 5, { align: 'center' });

  // Photo frames
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.rect(ktpX, yOffset + 7, colWidthKtp, colHeightKtp);
  doc.rect(penerimaX, yOffset + 7, colWidthPenerima, colHeightPenerima);

  // Photo KTP Image drawing
  if (item.foto_ktp) {
    try {
      doc.addImage(item.foto_ktp, 'JPEG', ktpX + 1, yOffset + 8, colWidthKtp - 2, colHeightKtp - 2);
    } catch (e) {
      doc.setFont('Helvetica', 'italic');
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text('(Format tidak didukung)', ktpX + (colWidthKtp / 2), yOffset + 24, { align: 'center' });
    }
  } else {
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(150, 150, 150);
    doc.text('[Tidak ada foto]', ktpX + (colWidthKtp / 2), yOffset + 24, { align: 'center' });
  }

  // Photo Penerima Image drawing
  if (item.foto_penerima) {
    try {
      doc.addImage(item.foto_penerima, 'JPEG', penerimaX + 1, yOffset + 8, colWidthPenerima - 2, colHeightPenerima - 2);
    } catch (e) {
      doc.setFont('Helvetica', 'italic');
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text('(Format tidak didukung)', penerimaX + (colWidthPenerima / 2), yOffset + 24, { align: 'center' });
    }
  } else {
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(150, 150, 150);
    doc.text('[Tidak ada foto]', penerimaX + (colWidthPenerima / 2), yOffset + 24, { align: 'center' });
  }
};

// Main Export functions
export const exportSinglePenyaluranF4 = (item: PenyaluranBlt, penerima: PenerimaBlt[]) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [215, 330] // F4 size: 215mm x 330mm
  });

  generateKopAndHeader(doc, 1, 1, item.periode);
  drawKpmBlock(doc, item, 53);

  const sanitizedNama = item.nama.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`RESI_BLT_F4_${sanitizedNama}_${item.nik}.pdf`);
};

export const exportBatchPenyaluranF4 = (items: PenyaluranBlt[], penerima: PenerimaBlt[], customLabel?: string) => {
  if (items.length === 0) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [215, 330] // F4 size: 215mm x 330mm
  });

  const itemsPerPage = 5;
  const totalPages = Math.ceil(items.length / itemsPerPage);

  items.forEach((item, idx) => {
    const pageNum = Math.floor(idx / itemsPerPage) + 1;
    const indexOnPage = idx % itemsPerPage;

    if (idx > 0 && indexOnPage === 0) {
      doc.addPage();
    }

    if (indexOnPage === 0) {
      generateKopAndHeader(doc, pageNum, totalPages, item.periode);
    }

    const yOffset = 53 + indexOnPage * 50;
    drawKpmBlock(doc, item, yOffset);
  });

  const suffix = customLabel ? customLabel.toUpperCase().replace(/\s+/g, '_') : 'TOTAL';
  doc.save(`REKAP_BLT_DESA_F4_${suffix}_${items.length}_KPM.pdf`);
};

interface RiwayatPenyaluranProps {
  penyaluran: PenyaluranBlt[];
  penerima: PenerimaBlt[];
}

export default function RiwayatPenyaluran({ penyaluran, penerima }: RiwayatPenyaluranProps) {
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

  const listJanMar = filteredList.filter(
    (item) => !item.periode || item.periode === 'Januari - Februari - Maret 2026'
  );
  const listAprJun = filteredList.filter(
    (item) => item.periode === 'April - Mei - Juni 2026'
  );

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-lg font-extrabold tracking-tight text-slate-950 dark:text-white flex items-center gap-2">
            Riwayat Penyaluran BLT (Audit Trail)
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Jejak audit digital penyaluran dana desa. Dilengkapi dengan dokumentasi foto KTP dan foto penerima manfaat.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:self-start md:self-auto">
          <button
            onClick={() => {
              if (listJanMar.length > 0) {
                exportBatchPenyaluranF4(listJanMar, penerima, 'Jan_Feb_Mar_2026');
              }
            }}
            type="button"
            disabled={listJanMar.length === 0}
            className={`flex items-center gap-2 font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm ${
              listJanMar.length > 0
                ? "bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white cursor-pointer"
                : "bg-slate-100 dark:bg-slate-850 text-slate-400 dark:text-slate-600 cursor-not-allowed"
            }`}
            title="Cetak PDF Rekap KPM Periode Januari - Februari - Maret 2026"
          >
            <FileDown className="w-4 h-4" /> Cetak Jan-Feb-Maret ({listJanMar.length} KPM)
          </button>

          <button
            onClick={() => {
              if (listAprJun.length > 0) {
                exportBatchPenyaluranF4(listAprJun, penerima, 'Apr_Mei_Jun_2026');
              }
            }}
            type="button"
            disabled={listAprJun.length === 0}
            className={`flex items-center gap-2 font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm ${
              listAprJun.length > 0
                ? "bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white cursor-pointer"
                : "bg-slate-100 dark:bg-slate-850 text-slate-400 dark:text-slate-600 cursor-not-allowed"
            }`}
            title="Cetak PDF Rekap KPM Periode April - Mei - Juni 2026"
          >
            <FileDown className="w-4 h-4" /> Cetak Apr-Mei-Juni ({listAprJun.length} KPM)
          </button>
        </div>
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
                <th className="py-4 px-6 text-center">Cetak F4</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs text-slate-800 dark:text-slate-200">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
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
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 mt-1">
                        <span className="text-[10px] text-slate-400 font-mono">{item.nik}</span>
                        {item.periode && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/35">
                            {item.periode}
                          </span>
                        )}
                      </div>
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

                    {/* Cetak F4 PDF Action cell */}
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => exportSinglePenyaluranF4(item, penerima)}
                        type="button"
                        className="inline-flex items-center justify-center gap-1.5 bg-rose-50 hover:bg-rose-100 hover:text-rose-900 text-rose-800 dark:bg-rose-950/40 dark:hover:bg-rose-955 dark:text-rose-400 text-[11px] font-bold px-3 py-1.5 rounded-lg border border-rose-200/50 dark:border-rose-900/40 cursor-pointer transition-all"
                        title="Ekspor tanda bukti penyaluran ukuran F4"
                      >
                        <FileText className="w-3.5 h-3.5 text-rose-600" /> PDF F4
                      </button>
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
