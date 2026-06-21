import React, { useState, useEffect } from 'react';
import { PenerimaBlt } from '../types';
import { Search, Download, MailOpen, Check, Info, FileText, Settings, HelpCircle } from 'lucide-react';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';

interface UndanganPenyaluranProps {
  penerima: PenerimaBlt[];
}

export default function UndanganPenyaluran({ penerima }: UndanganPenyaluranProps) {
  // Navigation & selection state
  const [selectedKpmIds, setSelectedKpmIds] = useState<string[]>([]);
  const [searchWord, setSearchWord] = useState('');
  const [filterRt, setFilterRt] = useState('');
  const [filterRw, setFilterRw] = useState('');
  const [filterStatus, setFilterStatus] = useState<'Semua' | 'Belum Disalurkan'>('Belum Disalurkan');

  // Invitation customization states
  const [hari, setHari] = useState('Kamis');
  const [tanggal, setTanggal] = useState('25 Juni 2026');
  const [jam, setJam] = useState('09:00 WIB s/d Selesai');
  const [lokasi, setLokasi] = useState('Aula Kantor Desa Wargaluyu');
  const [nomorSurat, setNomorSurat] = useState('005/012/Ds-2026');
  const [kepalaDesa, setKepalaDesa] = useState('H. AMIN, S.IP.');
  const [bawaKtpArc, setBawaKtpArc] = useState(true);
  const [bawaKkArc, setBawaKkArc] = useState(true);
  const [bawaUndanganArc, setBawaUndanganArc] = useState(true);
  
  // Set default layout mode to '4-per-page' (Super Hemat) as requested
  const [layoutMode, setLayoutMode] = useState<'1-per-page' | '2-per-page' | '4-per-page'>('4-per-page');

  // Preview state
  const [previewKpm, setPreviewKpm] = useState<PenerimaBlt | null>(null);
  const [previewQrBase64, setPreviewQrBase64] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Filter KPM list
  const filteredKpms = penerima.filter((kpm) => {
    const matchesSearch =
      kpm.nama.toLowerCase().includes(searchWord.toLowerCase()) ||
      kpm.nik.includes(searchWord) ||
      kpm.no_kk.includes(searchWord);
    
    const matchesRt = filterRt === '' || kpm.rt === filterRt;
    const matchesRw = filterRw === '' || kpm.rw === filterRw;
    const matchesStatus = filterStatus === 'Semua' || kpm.status === 'Belum Disalurkan';
    
    return matchesSearch && matchesRt && matchesRw && matchesStatus;
  });

  // Handle auto preview for the first KPM matching filters
  useEffect(() => {
    if (filteredKpms.length > 0) {
      const bestPreview = filteredKpms.find(k => selectedKpmIds.includes(k.id)) || filteredKpms[0];
      setPreviewKpm(bestPreview);
    } else {
      setPreviewKpm(null);
    }
  }, [filteredKpms, selectedKpmIds]);

  // Handle generating QR Code for the preview card
  useEffect(() => {
    if (previewKpm) {
      QRCode.toDataURL(
        previewKpm.nik,
        {
          width: 150,
          margin: 1,
          color: {
            dark: '#1e293b', // slate-800
            light: '#ffffff'
          }
        },
        (err, url) => {
          if (!err) setPreviewQrBase64(url);
        }
      );
    } else {
      setPreviewQrBase64('');
    }
  }, [previewKpm]);

  // Toggle selection for single KPM
  const handleToggleKpm = (id: string) => {
    setSelectedKpmIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Toggle selection for all filtered KPMs
  const handleSelectAllFiltered = () => {
    const filteredIds = filteredKpms.map(k => k.id);
    const allAreSelected = filteredIds.every(id => selectedKpmIds.includes(id));

    if (allAreSelected) {
      setSelectedKpmIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      setSelectedKpmIds(prev => {
        const union = new Set([...prev, ...filteredIds]);
        return Array.from(union);
      });
    }
  };

  // Helper promise for QR base64 generation
  const generateQrPromise = (text: string): Promise<string> => {
    return new Promise((resolve) => {
      QRCode.toDataURL(
        text,
        {
          width: 100,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#ffffff'
          }
        },
        (err, url) => {
          if (err) resolve('');
          else resolve(url);
        }
      );
    });
  };

  // PDF Export handling
  const handleExportPdf = async () => {
    const kpmToPrint = penerima.filter(k => selectedKpmIds.includes(k.id));
    if (kpmToPrint.length === 0) {
      alert('Pilih minimal satu KPM untuk dicetak undangannya!');
      return;
    }

    setIsGenerating(true);

    try {
      // F4 Size in mm: 215mm width, 330mm height
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [215, 330]
      });

      // Generate base64 QR code for each KPM in advance
      const qrData: Record<string, string> = {};
      for (const k of kpmToPrint) {
        qrData[k.id] = await generateQrPromise(k.nik);
      }

      const totalItems = kpmToPrint.length;

      if (layoutMode === '4-per-page') {
        // --- 4 UNDANGAN PER HALAMAN (SUPER HEMAT, 1 LEMBAR MUAT 4 KPM) ---
        const totalPages = Math.ceil(totalItems / 4);

        for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
          if (pageIdx > 0) doc.addPage();

          // 4 regions inside 330mm tall F4 sheet:
          // Part 1: y=5, Part 2: y=86, Part 3: y=167, Part 4: y=248
          const offsetsY = [5, 86, 167, 248];

          for (let itemOffset = 0; itemOffset < 4; itemOffset++) {
            const currentItemIdx = pageIdx * 4 + itemOffset;
            if (currentItemIdx < totalItems) {
              const currentKpm = kpmToPrint[currentItemIdx];
              const currentQr = qrData[currentKpm.id];
              const yPos = offsetsY[itemOffset];
              
              drawCompactUndangan(doc, currentKpm, currentQr, yPos);

              // Draw dashed divider between slots if it's not the last slot on this page
              if (itemOffset < 3 && (currentItemIdx + 1) < totalItems) {
                const dividerY = yPos + 78.5; // halfway between offsets (86 - 5 = 81, so offset + 78 is perfect)
                doc.setDrawColor(180, 180, 180);
                doc.setLineWidth(0.2);
                doc.setLineDashPattern([2, 2], 0);
                doc.line(8, dividerY, 207, dividerY);
                doc.setLineDashPattern([], 0); // reset
              }
            }
          }
        }
      } else if (layoutMode === '2-per-page') {
        // --- 2 UNDANGAN PER HALAMAN ---
        const totalPages = Math.ceil(totalItems / 2);

        for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
          if (pageIdx > 0) doc.addPage();

          // Part 1 on Top Half
          const kpm1Idx = pageIdx * 2;
          const kpm1 = kpmToPrint[kpm1Idx];
          const qr1 = qrData[kpm1.id];
          drawMediumUndangan(doc, kpm1, qr1, 5, 150);

          // Divider
          doc.setDrawColor(180, 180, 180);
          doc.setLineWidth(0.3);
          doc.setLineDashPattern([2, 2], 0);
          doc.line(10, 165, 205, 165);
          doc.setLineDashPattern([], 0);

          // Part 2 on Bottom Half
          const kpm2Idx = pageIdx * 2 + 1;
          if (kpm2Idx < totalItems) {
            const kpm2 = kpmToPrint[kpm2Idx];
            const qr2 = qrData[kpm2.id];
            drawMediumUndangan(doc, kpm2, qr2, 170, 150);
          }
        }
      } else {
        // --- 1 UNDANGAN PER HALAMAN (PENUH) ---
        kpmToPrint.forEach((k, idx) => {
          if (idx > 0) doc.addPage();
          const curQr = qrData[k.id];
          drawFullUndangan(doc, k, curQr, 10, 310);
        });
      }

      const totalKpmPrinted = kpmToPrint.length;
      doc.save(`UNDANGAN_BLT_DD_SUPER_HEMAT_${totalKpmPrinted}_KPM.pdf`);
    } catch (e: any) {
      console.error(e);
      alert('Gagal menghasilkan file PDF undangan: ' + e.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // --- DRAW COMPACT UNDANGAN (FOR 4 PER SHEET) ---
  // A clean, beautiful slip which fits everything elegantly in exactly 76mm height.
  const drawCompactUndangan = (
    doc: jsPDF, 
    kpm: PenerimaBlt, 
    qrBase64: string, 
    yStart: number
  ) => {
    const marginX = 12;
    const widthTotal = 215;
    const wPrintable = widthTotal - (marginX * 2);

    // Outer boundary cutline
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.15);
    doc.rect(marginX - 2, yStart, wPrintable + 4, 76, 'S');

    // 1. Mini Header / Kop
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('PEMERINTAH DESA WARGALUYU - KECAMATAN ARJASARI', widthTotal / 2, yStart + 5.5, { align: 'center' });
    doc.setFontSize(7.5);
    doc.setFont('Helvetica', 'normal');
    doc.text('SURAT UNDANGAN PENYALURAN BANTUAN LANGSUNG TUNAI (BLT DANA DESA)', widthTotal / 2, yStart + 9, { align: 'center' });

    // Header Line
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.line(marginX, yStart + 11, widthTotal - marginX, yStart + 11);

    // Letter meta block & Recipient (Side-by-side)
    // Left: Meta agenda
    doc.setFontSize(8);
    doc.setFont('Helvetica', 'bold');
    doc.text('AGENDA PENYALURAN', marginX, yStart + 16);
    
    doc.setFont('Helvetica', 'normal');
    doc.text(`Hari, Tgl  : ${hari}, ${tanggal}`, marginX, yStart + 21);
    doc.text(`Waktu     : ${jam}`, marginX, yStart + 25);
    doc.text(`Lokasi     : ${lokasi}`, marginX, yStart + 29);

    // Right: Recipient Details
    const rightX = marginX + 102;
    doc.setFont('Helvetica', 'bold');
    doc.text('KEMENTERIAN SOSIAL / DESA (KPM)', rightX, yStart + 16);
    doc.setFillColor(252, 252, 252);
    doc.setDrawColor(220, 220, 220);
    doc.rect(rightX - 1, yStart + 18, 90, 13, 'F');
    
    doc.setFontSize(8.5);
    doc.setFont('Helvetica', 'bold');
    doc.text(`BPK/IBU : ${kpm.nama.toUpperCase()}`, rightX + 2, yStart + 22);
    
    doc.setFontSize(7.5);
    doc.setFont('Helvetica', 'normal');
    doc.text(`NIK: ${kpm.nik}  |  Alamat: RT ${kpm.rt} / RW ${kpm.rw}, Ds. Wargaluyu`, rightX + 2, yStart + 27);

    // Middle text block: Short simple instruction (Muat dalam 1 baris)
    doc.setFontSize(7.5);
    doc.setFont('Helvetica', 'normal');
    const contentText = `Mengharap kehadiran Bapak/Ibu di atas secara tertib sesuai tempat dan waktu yang ditentukan dengan mempersiapkan syarat berkas fisik di bawah ini.`;
    doc.text(contentText, marginX, yStart + 35);

    // Requirements & Notes
    const reqY = yStart + 40;
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(0, 0, 0);
    doc.text('PERSYARATAN DOKUMEN WAJIB (ASLI):', marginX, reqY);

    doc.setFont('Helvetica', 'normal');
    let reqStr = '';
    if (bawaKtpArc) reqStr += '- KTP Asli  ';
    if (bawaKkArc) reqStr += '- KK Asli  ';
    if (bawaUndanganArc) reqStr += '- Lembar Undangan ini';
    doc.text(reqStr, marginX + 4, reqY + 4.5);

    // Emphasized Strict Notes (Tidak Dapat Diwakilkan & Kunjungan Petugas seandainya sakit)
    doc.setFillColor(254, 242, 242); // very light red bg
    doc.setDrawColor(252, 165, 165);
    doc.rect(marginX, reqY + 7.5, wPrintable, 7, 'DF');

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(153, 27, 27); // Dark red
    doc.text('CATATAN: TIDAK DAPAT DIWAKILKAN TANPA KECUALI. Jika KPM sedang sakit / berhalangan hadir fisik, petugas desa akan mengantarkan bantuan langsung ke tempat tinggal (kunjungan rumah).', marginX + 2, reqY + 12);
    doc.setTextColor(0, 0, 0); // reset

    // Lower footer: Barcode left, Signature right
    const footY = reqY + 17;

    if (qrBase64) {
      try {
        doc.addImage(qrBase64, 'JPEG', marginX, footY, 13, 13);
      } catch (err) {
        doc.rect(marginX, footY, 13, 13);
      }
    }

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.text('KODE SCAN SALUR', marginX + 15, footY + 4);
    doc.setFont('Helvetica', 'normal');
    doc.text(`NIK: ${kpm.nik}`, marginX + 15, footY + 8.5);

    // Authorized Signature
    const sigX = widthTotal - marginX - 52;
    doc.setFontSize(7.5);
    doc.text('Pemerintah Desa Wargaluyu,', sigX, footY + 1);
    doc.setFont('Helvetica', 'bold');
    doc.text('Kepala Desa', sigX, footY + 4.5);
    doc.text(kepalaDesa, sigX, footY + 13);
  };

  // --- DRAW MEDIUM UNDANGAN (FOR 2 PER SHEET) ---
  const drawMediumUndangan = (
    doc: jsPDF, 
    kpm: PenerimaBlt, 
    qrBase64: string, 
    yStart: number,
    maxHeight: number
  ) => {
    const marginX = 14;
    const widthTotal = 215;
    const wPrintable = widthTotal - (marginX * 2);

    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.15);
    doc.rect(marginX - 2, yStart, wPrintable + 4, maxHeight, 'S');

    // Header
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('PEMERINTAH DESA WARGALUYU - KECAMATAN ARJASARI', widthTotal / 2, yStart + 8, { align: 'center' });
    doc.setFontSize(8.5);
    doc.setFont('Helvetica', 'normal');
    doc.text('SURAT UNDANGAN SECEPATNYA PENYALURAN BLT DANA DESA (BLT DD)', widthTotal / 2, yStart + 12, { align: 'center' });

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.4);
    doc.line(marginX, yStart + 15, widthTotal - marginX, yStart + 15);

    // Recipient Box
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('DIALAMATKAN KEPADA KELUARGA PENERIMA MANFAAT (KPM):', marginX, yStart + 21);
    
    doc.setFillColor(250, 250, 250);
    doc.rect(marginX, yStart + 23, wPrintable, 13, 'F');
    doc.setFontSize(9.5);
    doc.text(`NAMA: ${kpm.nama.toUpperCase()}`, marginX + 3, yStart + 28);
    doc.setFontSize(8);
    doc.setFont('Helvetica', 'normal');
    doc.text(`NIK: ${kpm.nik}  |  No. KK: ${kpm.no_kk}  |  Alamat: ${kpm.alamat}, RT ${kpm.rt} / RW ${kpm.rw}, Ds. Wargaluyu`, marginX + 3, yStart + 33);

    // Agenda Details
    const detailsY = yStart + 41;
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('WAKTU & TEMPAT PELAKSANAAN:', marginX, detailsY);

    doc.setFont('Helvetica', 'normal');
    doc.text(`- Hari & Tanggal Penyaluran : ${hari}, ${tanggal}`, marginX + 4, detailsY + 5);
    doc.text(`- Waktu / Jam Layanan       : ${jam}`, marginX + 4, detailsY + 9);
    doc.text(`- Tempat Kegiatan           : ${lokasi}`, marginX + 4, detailsY + 13);

    // Letter message
    doc.text('Bersama undangan sederhana ini, kami mengharap kehadiran penerima manfaat untuk tertib hadir di lokasi.', marginX, detailsY + 19);

    // Requirements
    const reqY = detailsY + 24;
    doc.setFont('Helvetica', 'bold');
    doc.text('PERSYARATAN WAJIB MEMBAWA DOKUMEN ASLI:', marginX, reqY);
    
    doc.setFont('Helvetica', 'normal');
    let reqs = [];
    if (bawaKtpArc) reqs.push('KTP Asli');
    if (bawaKkArc) reqs.push('Kartu Keluarga (KK) Asli');
    if (bawaUndanganArc) reqs.push('Lembar Undangan Fisik');
    doc.text(`* ${reqs.join('  |  * ')}`, marginX + 4, reqY + 4);

    // Strict caution notes
    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(252, 165, 165);
    doc.rect(marginX, reqY + 7, wPrintable, 9, 'DF');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(153, 27, 27);
    doc.text('CATATAN PENTING DESA: TIDAK DAPAT DIWAKILKAN TANPA KECUALI.', marginX + 2, reqY + 11);
    doc.text('Bila KPM terhalang sakit keras / disabilitas berat, tim petugas desa siap melakukan kunjungan rumah guna penyaluran bantuan langsung.', marginX + 2, reqY + 14.5);
    doc.setTextColor(0, 0, 0);

    // Footer signature and QR Code
    const footY = reqY + 20;
    if (qrBase64) {
      try {
        doc.addImage(qrBase64, 'JPEG', marginX, footY, 18, 18);
      } catch (e) {}
    }
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('KODE SCAN SALUR', marginX + 21, footY + 6);
    doc.setFont('Helvetica', 'normal');
    doc.text(`NIK: ${kpm.nik}`, marginX + 21, footY + 11);

    const sigX = widthTotal - marginX - 55;
    doc.setFontSize(8.5);
    doc.text('Kepala Desa Wargaluyu,', sigX, footY + 2);
    doc.setFont('Helvetica', 'bold');
    doc.text(kepalaDesa, sigX, footY + 14);
  };

  // --- DRAW FULL UNDANGAN (FOR 1 PER SHEET) ---
  const drawFullUndangan = (
    doc: jsPDF, 
    kpm: PenerimaBlt, 
    qrBase64: string, 
    yStart: number,
    maxHeight: number
  ) => {
    const marginX = 15;
    const widthTotal = 215;
    const wPrintable = widthTotal - (marginX * 2);

    doc.setDrawColor(210, 210, 210);
    doc.rect(marginX - 2, yStart, wPrintable + 4, maxHeight, 'S');

    // Kop
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('PEMERINTAH KABUPATEN BANDUNG', widthTotal / 2, yStart + 10, { align: 'center' });
    doc.text('KECAMATAN ARJASARI', widthTotal / 2, yStart + 15, { align: 'center' });
    doc.setFontSize(14);
    doc.text('DESA WARGALUYU', widthTotal / 2, yStart + 21, { align: 'center' });

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Alamat: Jl. M.Adhikarta No. 86 Email: Wargaluyu@bandungkab.go.id Kodepos 40379', widthTotal / 2, yStart + 25, { align: 'center' });

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(marginX, yStart + 27, widthTotal - marginX, yStart + 27);
    doc.setLineWidth(0.15);
    doc.line(marginX, yStart + 28, widthTotal - marginX, yStart + 28);

    doc.setFontSize(9);
    doc.text(`Nomor  : ${nomorSurat}`, marginX, yStart + 35);
    doc.text(`Sifat      : Penting`, marginX, yStart + 40);
    doc.text(`Lamp     : -`, marginX, yStart + 45);
    doc.text(`Hal        : Undangan Penyaluran BLT Dana Desa`, marginX, yStart + 50);

    doc.text(`Wargaluyu, ${tanggal}`, widthTotal - marginX - 45, yStart + 35);
    
    doc.text(`Kepada Yth. KPM Penerima BLT:`, marginX, yStart + 58);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text(`Bpk/Ibu: ${kpm.nama.toUpperCase()}`, marginX + 4, yStart + 63);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`NIK: ${kpm.nik} | KK: ${kpm.no_kk}`, marginX + 4, yStart + 68);
    doc.text(`Alamat: ${kpm.alamat}, RT ${kpm.rt} / RW ${kpm.rw}, Desa Wargaluyu`, marginX + 4, yStart + 73);

    doc.text('Dengan hormat,', marginX, yStart + 81);
    doc.text('Sehubungan dengan pelaksanaan Penyaluran Bantuan Langsung Tunai Dana Desa (BLT DD) Tahun Anggaran 2026, kami mengundang Bapak/Ibu Keluarga Penerima Manfaat (KPM) tersebut di atas untuk menghadiri loket pencairan pada:', marginX, yStart + 86);

    // Agenda Box
    doc.setFillColor(248, 248, 248);
    doc.rect(marginX, yStart + 92, wPrintable, 22, 'DF');
    doc.setFont('Helvetica', 'bold');
    doc.text('HARI / TANGGAL PENYALURAN', marginX + 4, yStart + 97);
    doc.text('JAM / WAKTU PENYALURAN', marginX + 4, yStart + 103);
    doc.text('LOKASI / TEMPAT KEGIATAN', marginX + 4, yStart + 110);

    doc.setFont('Helvetica', 'normal');
    doc.text(`: ${hari}, ${tanggal}`, marginX + 60, yStart + 97);
    doc.text(`: ${jam}`, marginX + 60, yStart + 103);
    doc.text(`: ${lokasi}`, marginX + 60, yStart + 110);

    // Requirements
    const reqY = yStart + 120;
    doc.setFont('Helvetica', 'bold');
    doc.text('PERSYARATAN DOKUMEN WAJIB YANG HARUS DIBAWA:', marginX, reqY);

    doc.setFont('Helvetica', 'normal');
    let offset = reqY + 5;
    if (bawaKtpArc) {
      doc.text('- Kartu Tanda Penduduk (KTP) Elektronik Asli', marginX + 4, offset);
      offset += 4.5;
    }
    if (bawaKkArc) {
      doc.text('- Kartu Keluarga (KK) Asli KPM', marginX + 4, offset);
      offset += 4.5;
    }
    if (bawaUndanganArc) {
      doc.text('- Lembar Undangan Asli ini untuk penyerahan barcode antrian', marginX + 4, offset);
      offset += 4.5;
    }

    // Emphasized Strict Notes (Tidak Dapat Diwakilkan & Kunjungan Petugas seandainya sakit)
    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(252, 165, 165);
    doc.rect(marginX, offset + 1, wPrintable, 13, 'DF');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(153, 27, 27);
    doc.text('CATATAN PENTING: PENERIMAAN BANTUAN INI TIDAK DAPAT DIWAKILKAN TANPA KECUALI.', marginX + 2, offset + 5);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('Apabila Keluarga Penerima Manfaat (KPM) berhalangan hadir dikarenakan Sakit Keras, Disabilitas, atau Usia Lanjut,', marginX + 2, offset + 8.5);
    doc.text('maka tidak perlu memaksakan diri hadir. Tim Petugas Desa akan melakukan Kunjungan Rumah langsung untuk menyerahkan dana.', marginX + 2, offset + 11.5);
    doc.setTextColor(0, 0, 0);

    // Footer signature and QR Code
    const footY = offset + 18;
    if (qrBase64) {
      doc.addImage(qrBase64, 'JPEG', marginX, footY, 22, 22);
    }
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('KODE SCAN SALUR', marginX + 25, footY + 7);
    doc.setFont('Helvetica', 'normal');
    doc.text(`NIK: ${kpm.nik}`, marginX + 25, footY + 12);

    const sigX = widthTotal - marginX - 55;
    doc.setFontSize(9);
    doc.text('Mengetahui,', sigX, footY + 2);
    doc.text('Kepala Desa Wargaluyu', sigX, footY + 6);
    doc.setFont('Helvetica', 'bold');
    doc.text(kepalaDesa, sigX, footY + 21);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* LEFT COLUMN: Setup Settings and List selection (Col: 7) */}
      <div className="lg:col-span-7 space-y-6">
        
        {/* Header Invitation custom values Panel */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-850">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 rounded-xl">
              <MailOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase">PENGATURAN SURAT UNDANGAN</h3>
              <p className="text-[11px] text-slate-400">Sesuaikan tanggal agenda, kop surat, dan format lembar untuk cetak mandiri.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Field 1: Layout Selection with 4-per-page option emphasized */}
            <div className="sm:col-span-2 space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">Format Kemasan Kertas</label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setLayoutMode('4-per-page')}
                  className={`px-3 py-2.5 text-[10px] font-bold border rounded-lg transition-all text-center flex flex-col justify-center items-center gap-1 ${
                    layoutMode === '4-per-page'
                      ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/10'
                      : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-850'
                  }`}
                >
                  <span className="text-sm">♻️ Super Hemat</span>
                  <span>1 Lembar = 4 KPM</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLayoutMode('2-per-page')}
                  className={`px-3 py-2.5 text-[10px] font-bold border rounded-lg transition-all text-center flex flex-col justify-center items-center gap-1 ${
                    layoutMode === '2-per-page'
                      ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-300'
                      : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-850'
                  }`}
                >
                  <span className="text-sm">✂️ Hemat Kertas</span>
                  <span>1 Lembar = 2 KPM</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLayoutMode('1-per-page')}
                  className={`px-3 py-2.5 text-[10px] font-bold border rounded-lg transition-all text-center flex flex-col justify-center items-center gap-1 ${
                    layoutMode === '1-per-page'
                      ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-300'
                      : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-850'
                  }`}
                >
                  <span className="text-sm">📄 Lembar Penuh</span>
                  <span>1 Lembar = 1 KPM</span>
                </button>
              </div>
            </div>

            {/* Field 2: Nomor Surat */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Nomor Surat Undangan</label>
              <input
                type="text"
                value={nomorSurat}
                onChange={(e) => setNomorSurat(e.target.value)}
                className="w-full text-xs bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-850 rounded-lg p-2.5 font-mono"
              />
            </div>

            {/* Field 3: Hari */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Hari Penyaluran</label>
              <select
                value={hari}
                onChange={(e) => setHari(e.target.value)}
                className="w-full text-xs bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-850 rounded-lg p-2.5 cursor-pointer"
              >
                <option value="Senin">Senin</option>
                <option value="Selasa">Selasa</option>
                <option value="Rabu">Rabu</option>
                <option value="Kamis">Kamis</option>
                <option value="Jumat">Jumat</option>
                <option value="Sabtu">Sabtu</option>
                <option value="Minggu">Minggu</option>
              </select>
            </div>

            {/* Field 4: Tanggal */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Tanggal Penyaluran</label>
              <input
                type="text"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="w-full text-xs bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-850 rounded-lg p-2.5"
                placeholder="Contoh: 25 Juni 2026"
              />
            </div>

            {/* Field 5: Jam */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Jam Penyaluran</label>
              <input
                type="text"
                value={jam}
                onChange={(e) => setJam(e.target.value)}
                className="w-full text-xs bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-850 rounded-lg p-2.5"
                placeholder="Contoh: 09:00 WIB s/d Selesai"
              />
            </div>

            {/* Field 6: Lokasi */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Lokasi / Tempat Temu</label>
              <input
                type="text"
                value={lokasi}
                onChange={(e) => setLokasi(e.target.value)}
                className="w-full text-xs bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-850 rounded-lg p-2.5"
                placeholder="Contoh: Aula Kantor Desa Wargaluyu"
              />
            </div>

            {/* Field 7: Nama Kades */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Nama Kepala Desa (Stempel)</label>
              <input
                type="text"
                value={kepalaDesa}
                onChange={(e) => setKepalaDesa(e.target.value)}
                className="w-full text-xs bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-850 rounded-lg p-2.5 font-semibold"
              />
            </div>
          </div>

          {/* Checklist bawaan */}
          <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-850">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Berkas Bawaan Wajib (KPM)</span>
            <div className="flex flex-wrap gap-4 text-xs font-semibold">
              <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={bawaKtpArc}
                  onChange={(e) => setBawaKtpArc(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                KTP Asli
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={bawaKkArc}
                  onChange={(e) => setBawaKkArc(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                KK Asli
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={bawaUndanganArc}
                  onChange={(e) => setBawaUndanganArc(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                Lembar Undangan Fisik
              </label>
            </div>
          </div>
        </div>

        {/* KPM Selection Database Panel */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-850">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                DAFTAR PENERIMA BLT (KPM)
                <span className="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-extrabold text-[10px] px-2 py-0.5 rounded-full">
                  {selectedKpmIds.length} Terpilih
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">Pilih KPM di bawah untuk dicetak lembar undangan fisiknya.</p>
            </div>

            <button
              type="button"
              onClick={handleSelectAllFiltered}
              className="text-xs font-bold text-emerald-650 dark:text-emerald-400 hover:underline self-start sm:self-auto cursor-pointer"
            >
              {filteredKpms.every(k => selectedKpmIds.includes(k.id)) ? 'Batal Pilih Semua' : 'Pilih Semua KPM Sesuai Filter'}
            </button>
          </div>

          {/* Filters controls row */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <div className="sm:col-span-2 relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Cari Nama / NIK KPM..."
                value={searchWord}
                onChange={(e) => setSearchWord(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl focus:border-emerald-500 focus:outline-none text-slate-800 dark:text-slate-100"
              />
            </div>

            <select
              value={filterRt}
              onChange={(e) => setFilterRt(e.target.value)}
              className="text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-2.5 cursor-pointer text-slate-800 dark:text-slate-200"
            >
              <option value="">Semua RT</option>
              {Array.from({ length: 14 }, (_, i) => {
                const rtVal = String(i + 1).padStart(3, '0');
                return <option key={rtVal} value={rtVal}>RT {rtVal}</option>;
              })}
            </select>

            <select
              value={filterRw}
              onChange={(e) => setFilterRw(e.target.value)}
              className="text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-2.5 cursor-pointer text-slate-800 dark:text-slate-200"
            >
              <option value="">Semua RW</option>
              {Array.from({ length: 10 }, (_, i) => {
                const rwVal = String(i + 1).padStart(3, '0');
                return <option key={rwVal} value={rwVal}>RW {rwVal}</option>;
              })}
            </select>
          </div>

          <div className="flex bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-850/50 justify-between items-center text-xs gap-4">
            <span className="text-slate-500 dark:text-slate-400 text-[11px] font-semibold">Tampilkan KPM berdasarkan status:</span>
            <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-0.5">
              <button
                type="button"
                onClick={() => setFilterStatus('Belum Disalurkan')}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all ${
                  filterStatus === 'Belum Disalurkan'
                    ? 'bg-amber-100 dark:bg-amber-950/20 text-amber-850 dark:text-amber-400'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Belum Disalurkan
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('Semua')}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all ${
                  filterStatus === 'Semua'
                    ? 'bg-slate-150 dark:bg-slate-800 text-slate-800 dark:text-slate-305'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Semua KPM
              </button>
            </div>
          </div>

          {/* KPM grid scroll area */}
          <div className="max-h-[310px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-850 border border-slate-100 dark:border-slate-850 rounded-xl">
            {filteredKpms.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <Info className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-400 font-bold">KPM tidak ditemukan</p>
                <p className="text-[10px] text-slate-500 max-w-xs mx-auto">Ubah filter pencarian, RT/RW, atau ubah status ke semua KPM.</p>
              </div>
            ) : (
              filteredKpms.map((k) => {
                const isSelected = selectedKpmIds.includes(k.id);
                return (
                  <div
                    key={k.id}
                    onClick={() => handleToggleKpm(k.id)}
                    className={`flex items-center justify-between p-3 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/10'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-950/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Checkbox state */}
                      <div className={`w-4.5 h-4.5 rounded-md border flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950'
                      }`}>
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-xs text-slate-900 dark:text-white uppercase">{k.nama}</h4>
                          {k.status === 'Sudah Disalurkan' ? (
                            <span className="text-[9px] bg-emerald-100 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-400 font-extrabold px-1.5 py-0.5 rounded">SUDAH</span>
                          ) : (
                            <span className="text-[9px] bg-amber-100 dark:bg-amber-950/30 text-amber-800 dark:text-amber-400 font-extrabold px-1.5 py-0.5 rounded">BELUM</span>
                          )}
                        </div>
                        <p className="font-mono text-[10px] text-slate-500">NIK: {k.nik}  |  Alamat: {k.alamat} (RT {k.rt} / RW {k.rw})</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block font-bold">Tahap {k.tahap} / {k.tahun}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Print trigger button */}
          <div className="pt-2">
            <button
              onClick={handleExportPdf}
              disabled={selectedKpmIds.length === 0 || isGenerating}
              type="button"
              className={`w-full inline-flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl font-bold text-xs shadow-sm transition-all ${
                selectedKpmIds.length > 0 && !isGenerating
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-[0.99]'
                  : 'bg-slate-100 dark:bg-slate-850 text-slate-400 dark:text-slate-600 cursor-not-allowed border border-slate-200/40'
              }`}
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Mengepak & Menghasilkan Cetak PDF...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  UNDUH PDF UNDANGAN ({selectedKpmIds.length} KPM TERPILIH)
                </>
              )}
            </button>
            <p className="text-center text-[10.5px] text-slate-400 mt-2">
              Undangan PDF secara otomatis disusun dalam format <b>{layoutMode === '4-per-page' ? 'Super Hemat (4 Undangan / Lembar F4)' : layoutMode === '2-per-page' ? 'Hemat (2 Undangan / Lembar F4)' : 'Penuh (1 Undangan / Lembar F4)'}</b> dengan barcode <b>Kode Scan Salur</b>.
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Interactive live mock-up rendering letter preview (Col: 5) */}
      <div className="lg:col-span-12 xl:col-span-5 space-y-4">
        <div className="sticky top-4">
          
          <div className="flex items-center justify-between px-2 pb-2">
            <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              PRATINJAU FISIK SURAT (SUPER HEMAT)
            </h4>
            <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/35 text-emerald-800 dark:text-emerald-400 font-extrabold px-2 py-0.5 rounded-md">
              Grid-Slot Mockup
            </span>
          </div>

          {previewKpm ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-350 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden text-[#0f172a] p-4 font-sans select-none relative max-h-[700px] overflow-y-auto">
              
              {/* Paper Grid pattern decoration */}
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#000000_1px,transparent_1px)] [background-size:12px_12px] dark:opacity-0"></div>

              {layoutMode === '4-per-page' ? (
                /* --- LIVE MOCKUP PREVIEW FOR 4-PER-PAGE (UPER HEMAT SLIP) --- */
                <div className="relative border border-dashed border-slate-300 dark:border-slate-700 p-4 space-y-4 rounded-xl bg-slate-50/20 text-xs">
                  
                  {/* Top Line Indicator */}
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-emerald-500 rounded-t-xl opacity-90"></div>

                  {/* Header */}
                  <div className="text-center border-b border-slate-400 pb-1.5 mt-2 space-y-0.5">
                    <h3 className="font-extrabold text-[10px] uppercase text-emerald-800 dark:text-emerald-500 tracking-wide text-center">PEMERINTAH DESA WARGALUYU</h3>
                    <p className="text-[8px] text-slate-500 text-center font-semibold">SURAT UNDANGAN PENYALURAN BLT &amp; DOKUMEN SALUR MANDIRI</p>
                  </div>

                  {/* Body details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 text-[10px] leading-relaxed">
                    
                    {/* Left: Schedule details */}
                    <div className="space-y-1.5 bg-slate-100/50 dark:bg-slate-950/40 p-2.5 rounded-lg border border-slate-200/50 dark:border-slate-850">
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">AGENDA PENYALURAN</span>
                      <p><b>Hari, Tanggal:</b> {hari}, {tanggal}</p>
                      <p><b>Waktu/Jam:</b> {jam}</p>
                      <p><b>Tempat Temu:</b> {lokasi}</p>
                    </div>

                    {/* Right: Recipient card */}
                    <div className="space-y-1 bg-white dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm leading-tight">
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">KPM PENERIMA</span>
                      <p className="font-extrabold text-slate-900 dark:text-white text-[11px] uppercase">{previewKpm.nama}</p>
                      <p className="text-[9px] text-slate-500 font-mono">NIK: {previewKpm.nik}</p>
                      <p className="text-[9px] text-slate-500">Alamat: RT {previewKpm.rt} / RW {previewKpm.rw}, Desa Wargaluyu</p>
                    </div>

                  </div>

                  {/* Center info */}
                  <p className="text-[9px] text-slate-500 font-medium leading-normal">
                    Mengharap kehadiran Bapak/Ibu Keluarga Penerima Manfaat (KPM) tersebut di atas secara tertib di pintu loket sesuai agenda.
                  </p>

                  {/* Requirements checkboxes and customized constraints */}
                  <div className="space-y-1 text-[9px]">
                    <span className="font-bold text-slate-400 block uppercase text-[8px] tracking-wide">PERSYARATAN DOKUMEN WAJIB (ASLI):</span>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-slate-700 dark:text-slate-200 font-semibold">
                      {bawaKtpArc && <span>• KTP-el Asli</span>}
                      {bawaKkArc && <span>• KK Asli</span>}
                      {bawaUndanganArc && <span>• Lembar Undangan ini</span>}
                    </div>
                  </div>

                  {/* STRICT CAUTION BOX NOTES */}
                  <div className="bg-red-50 dark:bg-red-950/15 border border-red-200 dark:border-red-900/30 rounded-lg p-2.5 space-y-1 text-[9px] text-red-800 dark:text-red-400 leading-normal font-medium">
                    <p className="font-extrabold uppercase text-[8px] tracking-wider text-red-700 dark:text-red-400">CATATAN PENTING / ATTENTION:</p>
                    <p className="font-bold underline">TIDAK DAPAT DIWAKILKAN TANPA KECUALI.</p>
                    <p>Apabila penerima manfaat berhalangan atau sedang sakit keras/lansia, bantuan akan diantarkan langsung oleh tim petugas desa ke rumah (kunjungan rumah).</p>
                  </div>

                  {/* Footer barcode/sign */}
                  <div className="flex justify-between items-end border-t border-slate-200 dark:border-slate-800 pt-3 gap-4">
                    
                    {/* Left: Scan Code */}
                    <div className="flex items-center gap-2.5">
                      {previewQrBase64 ? (
                        <img
                          src={previewQrBase64}
                          alt="Qrcode Salur"
                          className="w-12 h-12 bg-white border border-slate-200 dark:border-slate-800 p-1 rounded-md"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md animate-pulse"></div>
                      )}
                      <div className="space-y-0.5 leading-tight text-[9px]">
                        <span className="font-extrabold text-[8px] tracking-wider text-slate-400 block uppercase">KODE SCAN SALUR</span>
                        <p className="font-mono font-bold text-slate-800 dark:text-slate-200">{previewKpm.nik}</p>
                      </div>
                    </div>

                    {/* Right: Signature */}
                    <div className="text-right text-[9px] space-y-0.5 leading-tight">
                      <p className="text-slate-400">Pemerintah Desa Wargaluyu,</p>
                      <p className="font-bold">Kepala Desa</p>
                      <p className="h-4"></p> {/* stamp spot */}
                      <p className="font-bold text-slate-900 dark:text-white underline">{kepalaDesa}</p>
                    </div>

                  </div>

                </div>
              ) : (
                /* --- LIVE MOCKUP PREVIEW FOR 1-PER-PAGE & 2-PER-PAGE (TRADITIONAL) --- */
                <div className="relative border border-slate-100 dark:border-slate-850 p-6 space-y-5 rounded-xl bg-slate-50/25">
                  {/* Government letterhead */}
                  <div className="text-center border-b-2 border-slate-900 pb-2 space-y-0.5">
                    <h3 className="font-bold text-xs">PEMERINTAH KABUPATEN BANDUNG</h3>
                    <h3 className="font-bold text-xs uppercase text-slate-500">KECAMATAN ARJASARI</h3>
                    <h2 className="font-black text-sm text-emerald-800 dark:text-emerald-400">DESA WARGALUYU</h2>
                    <p className="text-[9px] text-slate-400 font-semibold">Alamat: Jl. M.Adhikarta No. 86 Email: Wargaluyu@bandungkab.go.id Kodepos 40379</p>
                  </div>

                  {/* Date & metadata */}
                  <div className="flex justify-between items-start gap-4 text-[10px]">
                    <div className="space-y-0.5">
                      <p><b>Nomor:</b> {nomorSurat}</p>
                      <p><b>Sifat:</b> Penting</p>
                      <p><b>Lamp:</b> -</p>
                      <p><b>Hal:</b> Undangan Penyaluran BLT Dana Desa</p>
                    </div>
                    <div className="text-right">
                      <p>Wargaluyu, {tanggal}</p>
                      <p className="mt-2 text-left">Kepada Yth.</p>
                      <div className="text-left bg-white dark:bg-slate-950 p-2 rounded-lg border border-slate-150 dark:border-slate-850 mt-1 shadow-sm leading-tight">
                        <p className="font-bold text-slate-900 dark:text-white uppercase text-[10px]">{previewKpm.nama}</p>
                        <p className="text-[8px] text-slate-500 font-mono">NIK: {previewKpm.nik}</p>
                        <p className="text-[8px] text-slate-500">Alamat: RT {previewKpm.rt} / RW {previewKpm.rw}, Ds. Wargaluyu</p>
                      </div>
                    </div>
                  </div>

                  {/* Opening letter salutation */}
                  <div className="text-[10px] space-y-2 leading-relaxed">
                    <p>Dengan hormat,</p>
                    <p>
                      Sehubungan dengan pelaksanaan Penyaluran Bantuan Langsung Tunai Dana Desa (BLT DD) Tahun Anggaran 2026, kami mengundang Bapak/Ibu Keluarga Penerima Manfaat (KPM) tersebut di atas untuk menghadiri loket pencairan secara tertib sesuai dengan ketetapan jadwal pada:
                    </p>
                  </div>

                  {/* Schedule details table representation */}
                  <div className="bg-white dark:bg-slate-950 border border-slate-250 dark:border-slate-805 rounded-xl p-3 shadow-inner space-y-1.5 text-[10px] leading-tight">
                    <div className="flex">
                      <span className="w-24 text-slate-400 font-bold block">HARI / TANGGAL</span>
                      <span className="flex-1 font-semibold text-slate-800 dark:text-slate-200">: {hari}, {tanggal}</span>
                    </div>
                    <div className="flex">
                      <span className="w-24 text-slate-400 font-bold block">Pukul / Jam</span>
                      <span className="flex-1 font-semibold text-slate-800 dark:text-slate-200">: {jam}</span>
                    </div>
                    <div className="flex">
                      <span className="w-24 text-slate-400 font-bold block">TEMPAT KEGIATAN</span>
                      <span className="flex-1 font-semibold text-slate-800 dark:text-slate-200">: {lokasi}</span>
                    </div>
                  </div>

                  {/* Requirements check list */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block font-semibold">PERSYARATAN WAJIB MEMBAWA DOKUMEN ORIGINAL (ASLI):</span>
                    <ul className="text-[9px] text-slate-600 dark:text-slate-400 space-y-1 list-disc pl-4 leading-normal font-medium">
                      {bawaKtpArc && <li>Kartu Tanda Penduduk (KTP) Elektronik penerima manfaat asli.</li>}
                      {bawaKkArc && <li>Kartu Keluarga (KK) Asli penerima manfaat selaku Kepala/Anggota Keluarga.</li>}
                      {bawaUndanganArc && <li>Lembar Undangan ini wajib diserahkan di pintu loket antrian.</li>}
                    </ul>
                  </div>

                  {/* STRICT CAUTION BOX NOTES */}
                  <div className="bg-red-50 dark:bg-red-950/15 border border-red-200 dark:border-red-900/30 rounded-lg p-2.5 space-y-1 text-[9px] text-red-800 dark:text-red-400 leading-normal font-medium">
                    <p className="font-extrabold uppercase text-[8px] tracking-wider text-red-700 dark:text-red-400">CATATAN PENTING / ATTENTION:</p>
                    <p className="font-bold underline">TIDAK DAPAT DIWAKILKAN TANPA KECUALI.</p>
                    <p>Apabila penerima manfaat berhalangan atau sedang sakit keras/lansia, bantuan akan diantarkan langsung oleh tim petugas desa ke rumah (kunjungan rumah).</p>
                  </div>

                  {/* Signature and Barcode representation */}
                  <div className="flex justify-between items-end pt-3 border-t border-slate-100 dark:border-slate-850 gap-4">
                    {/* QR code container */}
                    <div className="text-center space-y-1">
                      {previewQrBase64 ? (
                        <img
                          src={previewQrBase64}
                          alt="Qrcode Salur"
                          className="w-20 h-20 bg-white border border-slate-200 dark:border-slate-800 p-1.5 rounded-lg shadow-sm mx-auto object-contain"
                        />
                      ) : (
                        <div className="w-20 h-20 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg animate-pulse mx-auto"></div>
                      )}
                      <span className="text-[8px] font-bold text-slate-400 tracking-wide uppercase block">KODE SCAN SALUR</span>
                      <span className="text-[8px] font-mono font-bold text-slate-900 dark:text-white block">{previewKpm.nik}</span>
                    </div>

                    {/* Signature */}
                    <div className="text-right space-y-1">
                      <p className="text-[9px]">Mengetahui / Mengundang,</p>
                      <p className="text-[9px] font-bold">Kepala Desa Wargaluyu</p>
                      <div className="h-10"></div> {/* Blank for stamp */}
                      <p className="text-[9px] font-bold underline">{kepalaDesa}</p>
                      <p className="text-[8px] text-slate-400 font-semibold">NIP / Pangkat: Kepala Desa</p>
                    </div>
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-3">
              <MailOpen className="w-12 h-12 text-slate-300 mx-auto" />
              <div>
                <h4 className="font-bold text-xs text-slate-900 dark:text-white">Tidak ada KPM yang terpilih</h4>
                <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">Gunakan panel di sebelah kiri untuk memilih satu atau lebih KPM guna menampilkan pratinjau surat undangan fisik disini.</p>
              </div>
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
