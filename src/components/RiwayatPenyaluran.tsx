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

// Generates a single F4 page for a given Penyaluran item
const generatePDFPage = (doc: jsPDF, item: PenyaluranBlt, penerima: PenerimaBlt[], pageNum?: number, totalPages?: number) => {
  const marginX = 15;
  const widthTotal = 215; // F4 Width in mm
  const widthPrintable = widthTotal - (marginX * 2); // 185mm

  // 1. KOP SURAT (Pemerintah Desa)
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('PEMERINTAH KABUPATEN BANDUNG', widthTotal / 2, 18, { align: 'center' });

  doc.setFontSize(13);
  doc.text('KECAMATAN ARJASARI', widthTotal / 2, 24, { align: 'center' });

  doc.setFontSize(15);
  doc.text('PEMERINTAH DESA WARGALUYU', widthTotal / 2, 31, { align: 'center' });

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Alamat: Jalan Desa Wargaluyu, Kecamatan Arjasari, Kabupaten Bandung, Jawa Barat', widthTotal / 2, 37, { align: 'center' });

  // Double horizontal header lines
  doc.setLineWidth(0.8);
  doc.line(marginX, 41, widthTotal - marginX, 41);
  doc.setLineWidth(0.2);
  doc.line(marginX, 42.2, widthTotal - marginX, 42.2);

  // Document Title
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('LEMBAR SELEKSI & DOKUMENTASI PENERIMA MANFAAT', widthTotal / 2, 51, { align: 'center' });

  // 2. Data Penerima Border Box
  const dataYStart = 58;
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('I. IDENTITAS PENERIMA MANFAAT', marginX, dataYStart);

  doc.setLineWidth(0.3);
  doc.setDrawColor(120, 120, 120);
  doc.rect(marginX, dataYStart + 3, widthPrintable, 22);

  // Rows of data (ONLY NIK and NAMA as requested!)
  doc.setFontSize(9.5);
  
  // Row 1: Nama
  doc.setFont('Helvetica', 'bold');
  doc.text('NAMA LENGKAP', marginX + 6, dataYStart + 11);
  doc.text(':', marginX + 46, dataYStart + 11);
  doc.setFont('Helvetica', 'normal');
  doc.text(item.nama.toUpperCase(), marginX + 50, dataYStart + 11);

  // Row 2: NIK
  doc.setFont('Helvetica', 'bold');
  doc.text('NIK (NO. KTP)', marginX + 6, dataYStart + 18);
  doc.text(':', marginX + 46, dataYStart + 18);
  doc.setFont('Helvetica', 'normal');
  doc.text(item.nik, marginX + 50, dataYStart + 18);

  // 3. Documentation Section (Photos Stacked / Side-by-side)
  const docYStart = 94;
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('II. DOKUMENTASI BUKTI FISIK', marginX, docYStart);

  const boxWidth = 88;
  const boxHeight = 105;
  const gap = widthPrintable - (boxWidth * 2); // 9mm

  // Box positions
  const leftBoxX = marginX;
  const rightBoxX = marginX + boxWidth + gap;
  const boxY = docYStart + 8;

  // Let's print Labels above the boxes
  doc.setFontSize(9);
  doc.setFont('Helvetica', 'bold');
  doc.text('FOTO KARTU TANDA PENDUDUK (KTP)', leftBoxX + (boxWidth / 2), boxY - 3, { align: 'center' });
  doc.text('FOTO PENERIMA MANFAAT', rightBoxX + (boxWidth / 2), boxY - 3, { align: 'center' });

  // Draw photo frames
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.25);
  doc.rect(leftBoxX, boxY, boxWidth, boxHeight);
  doc.rect(rightBoxX, boxY, boxWidth, boxHeight);

  // Center placeholders if image is missing, or draw image inside
  // Left Box: Foto KTP
  if (item.foto_ktp) {
    try {
      doc.addImage(item.foto_ktp, 'JPEG', leftBoxX + 1.5, boxY + 1.5, boxWidth - 3, boxHeight - 3);
    } catch (e) {
      console.warn('Failed embedding Foto KTP in PDF:', e);
      doc.setFont('Helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('(Format foto tidak kompatibel)', leftBoxX + (boxWidth / 2), boxY + (boxHeight / 2), { align: 'center' });
    }
  } else {
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(155, 155, 155);
    doc.text('[Tidak Ada Dokumentasi KTP]', leftBoxX + (boxWidth / 2), boxY + (boxHeight / 2), { align: 'center' });
  }

  // Right Box: Foto Penerima
  if (item.foto_penerima) {
    try {
      doc.addImage(item.foto_penerima, 'JPEG', rightBoxX + 1.5, boxY + 1.5, boxWidth - 3, boxHeight - 3);
    } catch (e) {
      console.warn('Failed embedding Foto Penerima in PDF:', e);
      doc.setFont('Helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('(Format foto tidak kompatibel)', rightBoxX + (boxWidth / 2), boxY + (boxHeight / 2), { align: 'center' });
    }
  } else {
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(155, 155, 155);
    doc.text('[Tidak Ada Dokumentasi Penerima]', rightBoxX + (boxWidth / 2), boxY + (boxHeight / 2), { align: 'center' });
  }

  // Reset text color for subsequent sections
  doc.setTextColor(0, 0, 0);

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

// Main Export functions
export const exportSinglePenyaluranF4 = (item: PenyaluranBlt, penerima: PenerimaBlt[]) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [215, 330] // F4 size: 215mm x 330mm
  });

  generatePDFPage(doc, item, penerima);

  const sanitizedNama = item.nama.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`RESI_BLT_F4_${sanitizedNama}_${item.nik}.pdf`);
};

export const exportBatchPenyaluranF4 = (items: PenyaluranBlt[], penerima: PenerimaBlt[]) => {
  if (items.length === 0) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [215, 330] // F4 size: 215mm x 330mm
  });

  items.forEach((item, idx) => {
    if (idx > 0) {
      doc.addPage();
    }
    generatePDFPage(doc, item, penerima, idx + 1, items.length);
  });

  doc.save(`REKAP_BLT_DESA_F4_TOTAL_${items.length}_KPM.pdf`);
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

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-extrabold tracking-tight text-slate-950 dark:text-white flex items-center gap-2">
            Riwayat Penyaluran BLT (Audit Trail)
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Jejak audit digital penyaluran dana desa. Dilengkapi dengan dokumentasi foto KTP dan foto penerima manfaat.
          </p>
        </div>
        {filteredList.length > 0 && (
          <button
            onClick={() => exportBatchPenyaluranF4(filteredList, penerima)}
            type="button"
            className="flex items-center gap-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer inline-flex"
            title="Satu file PDF PDF berisi banyak halaman (Satu halaman per KPM)"
          >
            <FileDown className="w-4 h-4" /> Cetak Lembaran F4 ({filteredList.length} KPM)
          </button>
        )}
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
