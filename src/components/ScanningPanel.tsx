import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
import { PenerimaBlt, PenyaluranBlt } from '../types';
import { QrCode, Camera, FileImage, CheckCircle, AlertTriangle, User, Smile, MapPin, Check, RefreshCw } from 'lucide-react';
import confetti from 'canvas-confetti';

interface ScanningPanelProps {
  penerima: PenerimaBlt[];
  currentUser: { nama: string };
  onSalurkan: (data: Omit<PenyaluranBlt, 'id' | 'status'>) => Promise<void>;
  onManualNikScan?: (nik: string) => void;
}

export default function ScanningPanel({ penerima, currentUser, onSalurkan }: ScanningPanelProps) {
  // Scanner state
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [matchedKpm, setMatchedKpm] = useState<PenerimaBlt | null>(null);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  // Manual NIK search inside scanner as a shortcut
  const [manualNikInput, setManualNikInput] = useState('');

  // Photos state
  const [fotoKtp, setFotoKtp] = useState<string | null>(null);
  const [fotoPenerima, setFotoPenerima] = useState<string | null>(null);
  const [isCapturingKtp, setIsCapturingKtp] = useState(false);
  const [isCapturingPenerima, setIsCapturingPenerima] = useState(false);

  // Loading states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successConfetti, setSuccessConfetti] = useState(false);

  // Video streams refs for direct snapshots
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Scanner container ID
  const scannerId = "qrcode-reader-element";
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);

  // Effect to handle matched KPM lookup when scanResult updates
  useEffect(() => {
    if (scanResult) {
      const match = penerima.find(
        (p) => p.nik.trim() === scanResult.trim() || p.nik.replace(/\s/g, '') === scanResult.replace(/\s/g, '')
      );
      if (match) {
        setMatchedKpm(match);
        setScannerError(null);
        // Stop scanning to focus on the form
        stopQrScanner();
      } else {
        setMatchedKpm(null);
        setScannerError(`NIK "${scanResult}" tidak terdaftar dalam DTKS Wargaluyu!`);
      }
    }
  }, [scanResult, penerima]);

  // Cleanup QR Scanner on unmount
  useEffect(() => {
    return () => {
      stopQrScanner();
      stopWebcam();
    };
  }, []);

  // START CAMERA SCANNING
  const startQrScanner = () => {
    setScannerError(null);
    setScanResult(null);
    setMatchedKpm(null);
    setIsScanning(true);

    // Give react time to render the element
    setTimeout(() => {
      try {
        const html5Qrcode = new Html5Qrcode(scannerId);
        html5QrcodeRef.current = html5Qrcode;

        html5Qrcode.start(
          { facingMode: "environment" }, // Prefer rear camera
          {
            fps: 10,
            qrbox: { width: 250, height: 250 }
          },
          (decodedText) => {
            setScanResult(decodedText);
            stopQrScanner();
          },
          (errorMessage) => {
            // silent scan failure logs
          }
        ).catch(err => {
          console.error("Camera scan error init:", err);
          setScannerError("Gagal mengakses kamera belakang. Periksa izin kamera browser atau gunakan Pencarian Manual di bawah.");
          setIsScanning(false);
        });
      } catch (err) {
        console.error("Scanner exception:", err);
        setScannerError("Exception saat memulai scanner.");
        setIsScanning(false);
      }
    }, 100);
  };

  const stopQrScanner = () => {
    if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
      html5QrcodeRef.current.stop().then(() => {
        setIsScanning(false);
        html5QrcodeRef.current = null;
      }).catch(err => console.error("Error stopping scanner:", err));
    } else {
      setIsScanning(false);
    }
  };

  // ==========================================================
  // DIRECT WEBCAM SNAPSHOT MODULE
  // ==========================================================
  const startWebcam = async (forKtp: boolean) => {
    stopWebcam(); // clear existing
    if (forKtp) {
      setIsCapturingKtp(true);
      setIsCapturingPenerima(false);
    } else {
      setIsCapturingPenerima(true);
      setIsCapturingKtp(false);
    }

    setTimeout(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: forKtp ? "environment" : "user" },
          audio: false
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      } catch (err) {
        console.warn("Could not start inline camera stream. Using mock/file fallback:", err);
        // We will show a file upload option as primary fallback if real stream fails
      }
    }, 100);
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCapturingKtp(false);
    setIsCapturingPenerima(false);
  };

  const takeSnapshot = (forKtp: boolean) => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (context) {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // draw timestamp watermark
        context.font = "14px monospace";
        context.fillStyle = "#10b981";
        context.fillText(`BLT Wargaluyu - ${new Date().toLocaleString('id-ID')}`, 20, canvas.height - 20);

        const dataUrl = canvas.toDataURL('image/png');
        if (forKtp) {
          setFotoKtp(dataUrl);
        } else {
          setFotoPenerima(dataUrl);
        }
        stopWebcam();
      }
    } else {
      // Mock photo generator fallback if stream was disabled or iframe denies permission
      generateMockPhoto(forKtp);
    }
  };

  const generateMockPhoto = (forKtp: boolean) => {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    if (ctx && matchedKpm) {
      // create background gradient
      const grad = ctx.createLinearGradient(0, 0, 400, 300);
      grad.addColorStop(0, forKtp ? '#1e293b' : '#047857');
      grad.addColorStop(1, forKtp ? '#0f172a' : '#065f46');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 400, 300);

      // outer card boundaries
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 4;
      ctx.strokeRect(10, 10, 380, 280);

      // Icon placeholder
      ctx.fillStyle = '#ffffff';
      ctx.font = '24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(forKtp ? '📸 FOTO DUMMY KTP' : '👨 FOTO DUMMY PENERIMA', 200, 100);
      
      // details
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px monospace';
      ctx.fillText(`KPM NIK: ${matchedKpm.nik}`, 200, 140);
      ctx.fillText(`NAMA: ${matchedKpm.nama}`, 200, 165);
      ctx.fillText(`PETUGAS: ${currentUser.nama}`, 200, 190);
      ctx.fillText(`TANGGAL: ${new Date().toISOString().split('T')[0]}`, 200, 215);
      ctx.fillStyle = '#10b981';
      ctx.fillText("VALID DAN TERSIMPAN", 200, 250);

      const base64 = canvas.toDataURL('image/png');
      if (forKtp) {
        setFotoKtp(base64);
      } else {
        setFotoPenerima(base64);
      }
      stopWebcam();
    }
  };

  // Upload/Manual crop fallback
  const handleLocalFileSelect = (e: React.ChangeEvent<HTMLInputElement>, forKtp: boolean) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          if (forKtp) {
            setFotoKtp(reader.result);
          } else {
            setFotoPenerima(reader.result);
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // EXECUTE DISBURSEMENT TO SUPABASE
  const handleProcessDisbursement = async () => {
    if (!matchedKpm) return;
    if (matchedKpm.status === 'Sudah Disalurkan') {
      alert('KPM ini sudah mendapatkan bantuan BLT sebelumnya. Penyaluran dibatalkan.');
      return;
    }
    if (!fotoKtp) {
      alert('Harap lampirkan atau ambil Foto KTP penerima!');
      return;
    }
    if (!fotoPenerima) {
      alert('Harap lampirkan atau ambil Foto Penerima saat memegang bantuan!');
      return;
    }

    setIsSubmitting(true);
    const rightNow = new Date();
    const indonesianDate = rightNow.toISOString().split('T')[0]; // YYYY-MM-DD
    const indonesianTime = rightNow.toTimeString().split(' ')[0]; // HH:MM:SS

    const rawPayload: Omit<PenyaluranBlt, 'id' | 'status'> = {
      penerima_id: matchedKpm.id,
      nik: matchedKpm.nik,
      nama: matchedKpm.nama,
      alamat: matchedKpm.alamat,
      rt: matchedKpm.rt,
      rw: matchedKpm.rw,
      nominal: matchedKpm.nominal,
      tanggal: indonesianDate,
      jam: indonesianTime,
      petugas: currentUser.nama,
      foto_ktp: fotoKtp, // Real base64 string
      foto_penerima: fotoPenerima,
    };

    try {
      await onSalurkan(rawPayload);

      // Trigger high fidelity party confetti!
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#10b981', '#34d399', '#059669', '#ffffff']
      });

      setSuccessConfetti(true);
      
      // Update local state copy status to immediately reflect in current scan view
      setMatchedKpm(prev => prev ? { ...prev, status: 'Sudah Disalurkan' } : null);
      
      // Delayed reset
      setTimeout(() => {
        setSuccessConfetti(false);
      }, 5000);

    } catch (err: any) {
      alert('Terjadi kesalahan saat menyimpan transaksi penyaluran: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShortcutSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualNikInput.trim()) {
      setScanResult(manualNikInput.trim());
      setManualNikInput('');
    }
  };

  const handleResetScanner = () => {
    setMatchedKpm(null);
    setScanResult(null);
    setScannerError(null);
    setFotoKtp(null);
    setFotoPenerima(null);
    stopWebcam();
  };

  return (
    <div className="space-y-6">
      {/* Upper header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
        <h2 className="text-lg font-extrabold tracking-tight text-slate-950 dark:text-white flex items-center gap-2">
          QR Scanner & Penyaluran BLT Instan
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Pindai kartu penerima QR Code, lakukan audit foto, dan cairkan bantuan dana desa secara cepat dan akuntabel.
        </p>
      </div>

      {/* Grid container layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left pane: Scanner interface & shortcuts (takes 5 cols) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm lg:col-span-5 space-y-5">
          <h3 className="font-bold text-slate-950 text-xs dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100 dark:border-slate-800">
            <QrCode className="w-4 h-4 text-emerald-600" /> Sensor Pemindai QR
          </h3>

          {/* Core interactive HTML5 Qr Scanner UI */}
          <div className="relative">
            {isScanning ? (
              <div className="space-y-4">
                <div 
                  id={scannerId} 
                  className="rounded-xl overflow-hidden bg-slate-950 text-white min-h-[250px] border border-slate-800 flex items-center justify-center relative"
                >
                  {/* Glowing camera scanning indicator guides */}
                  <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-0.5 bg-emerald-500 animate-bounce blur-xs"></div>
                </div>
                <button
                  onClick={stopQrScanner}
                  type="button"
                  className="w-full py-2.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-xs font-bold rounded-xl cursor-pointer transition-colors"
                >
                  Matikan Pemindai Kamera
                </button>
              </div>
            ) : (
              <div className="border border-dashed border-slate-200 dark:border-slate-800/80 rounded-xl p-8 text-center bg-slate-50 dark:bg-slate-950/50 space-y-4">
                <QrCode className="w-12 h-12 mx-auto stroke-1 text-slate-400 dark:text-slate-600" />
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Gunakan Kamera Belakang</p>
                  <p className="text-[10px] text-slate-500 mt-1 max-w-[220px] mx-auto">Arahkan kamera ke QR Code yang tercetak di kartu KPM untuk pencarian otomatis.</p>
                </div>
                <button
                  onClick={startQrScanner}
                  type="button"
                  className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-sm cursor-pointer transition-colors"
                >
                  <Camera className="w-3.5 h-3.5" /> Buka Kamera QR
                </button>
              </div>
            )}
          </div>

          {/* Quick manual shortcut within scanner tab */}
          <div className="border-t border-slate-100 dark:border-slate-850 pt-4">
            <form onSubmit={handleShortcutSearch} className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Atau Masukkan NIK Manual:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={16}
                  placeholder="Masukkan 16 digit NIK..."
                  value={manualNikInput}
                  onChange={(e) => setManualNikInput(e.target.value.replace(/\D/g, ''))}
                  className="flex-1 bg-slate-50 dark:bg-slate-950 dark:text-slate-100 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:border-emerald-600 font-mono"
                />
                <button 
                  type="submit" 
                  className="bg-slate-950 hover:bg-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer transition-colors"
                >
                  Cari
                </button>
              </div>
            </form>
          </div>

          {scannerError && (
            <div className="bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-400 p-3.5 rounded-xl text-xs space-y-1 border border-amber-200 dark:border-amber-900/40">
              <div className="flex gap-1.5 font-bold items-center">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Pencarian Bermasalah</span>
              </div>
              <p className="text-[11px]">{scannerError}</p>
            </div>
          )}
        </div>

        {/* Right pane: Active scanned item, verification and dispatch (takes 7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {matchedKpm ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
              
              {/* Header result row */}
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-4">
                <div className="flex gap-3">
                  <span className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-lg text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 h-10 w-10 flex items-center justify-center">
                    <User className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="font-extrabold text-slate-900 dark:text-white leading-none text-sm sm:text-base">{matchedKpm.nama}</h3>
                    <p className="text-[11px] font-mono text-slate-550 mt-1">NIK: {matchedKpm.nik}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Alamat: {matchedKpm.alamat}</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-450 block uppercase font-mono tracking-wider">Nominal</span>
                  <p className="text-sm sm:text-base font-extrabold text-emerald-700 dark:text-emerald-400">IDR {matchedKpm.nominal.toLocaleString('id-ID')}</p>
                  <p className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">t.a {matchedKpm.tahun} • {matchedKpm.tahap}</p>
                </div>
              </div>

              {/* Status constraints badge and check */}
              {matchedKpm.status === 'Sudah Disalurkan' ? (
                <div className="bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 p-4 rounded-xl border border-red-200 dark:border-red-900/50 flex flex-col sm:flex-row items-center gap-3">
                  <span className="text-2xl">⚠️</span>
                  <div className="text-center sm:text-left">
                    <h4 className="font-bold text-xs uppercase tracking-wider">BLT Sudah Disalurkan</h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">Kepala keluarga ({matchedKpm.nama}) telah menerima dana BLT senilai IDR {matchedKpm.nominal.toLocaleString('id-ID')} sebelumnya. Tombol penyaluran dikunci otomatis untuk mencegah double disbursement.</p>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 p-3 rounded-xl border border-emerald-200 dark:border-emerald-905 flex items-center gap-2 text-xs">
                  <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <p><b>KPM Terverifikasi Valid!</b> KPM tercatat mengantri menyalurkan dana bantuan periode ini.</p>
                </div>
              )}

              {/* Real camera snapshots snapshot grid (ONLY active when status = Belum Disalurkan) */}
              {matchedKpm.status !== 'Sudah Disalurkan' && (
                <div className="space-y-4">
                  <h4 className="text-[11px] font-bold text-slate-550 dark:text-slate-400 uppercase tracking-widest pb-1 border-b border-slate-100 dark:border-slate-850">Lampiran Audit Lapangan (Wajib)</h4>
                  
                  {/* Twin visual items columns */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    
                    {/* Item A: Photo KTP */}
                    <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-center space-y-3">
                      <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">1. Foto KTP Penerima</span>
                      
                      {fotoKtp ? (
                        <div className="relative rounded-lg overflow-hidden aspect-video border border-slate-200">
                          <img src={fotoKtp} alt="Foto KTP" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          <button 
                            type="button"
                            onClick={() => setFotoKtp(null)}
                            className="absolute right-2 top-2 bg-red-650 text-white p-1 rounded-full text-xs hover:bg-red-700 transition-colors"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-lg p-5 bg-white dark:bg-slate-900 flex flex-col items-center justify-center min-h-[120px]">
                          <Camera className="w-6 h-6 text-slate-400 mb-1" />
                          <p className="text-[10px] text-slate-500 mb-2">Ambil foto KTP fisik langsung</p>
                          
                          <div className="flex gap-2">
                            <label className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-705 text-slate-800 dark:text-slate-200 text-[10px] font-bold px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors border border-slate-200 dark:border-slate-700">
                              <FileImage className="w-3 h-3 inline mr-1" /> Cari Berkas
                              <input 
                                type="file" 
                                accept="image/*" 
                                onChange={(e) => handleLocalFileSelect(e, true)} 
                                className="hidden" 
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => startWebcam(true)}
                              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 text-[10px] font-bold px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors border border-emerald-200/50 dark:border-emerald-900/40"
                            >
                              Kamera HP
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Item B: Photo Penerima beserta Bantuan */}
                    <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-center space-y-3">
                      <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">2. Foto Penyerahan Dana</span>
                      
                      {fotoPenerima ? (
                        <div className="relative rounded-lg overflow-hidden aspect-video border border-slate-200">
                          <img src={fotoPenerima} alt="Foto Penerima" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          <button 
                            type="button"
                            onClick={() => setFotoPenerima(null)}
                            className="absolute right-2 top-2 bg-red-650 text-white p-1 rounded-full text-xs hover:bg-red-700 transition-colors"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-lg p-5 bg-white dark:bg-slate-900 flex flex-col items-center justify-center min-h-[120px]">
                          <Smile className="w-6 h-6 text-slate-400 mb-1" />
                          <p className="text-[10px] text-slate-500 mb-2">Ambil dokumentasi penyaluran</p>
                          
                          <div className="flex gap-2">
                            <label className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-705 text-slate-800 dark:text-slate-200 text-[10px] font-bold px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors border border-slate-200 dark:border-slate-700">
                              <FileImage className="w-3 h-3 inline mr-1" /> Cari Berkas
                              <input 
                                type="file" 
                                accept="image/*" 
                                onChange={(e) => handleLocalFileSelect(e, false)} 
                                className="hidden" 
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => startWebcam(false)}
                              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 text-[10px] font-bold px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors border border-emerald-200/50 dark:border-emerald-900/40"
                            >
                              Kamera HP
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* LIVE WEBCAM DIALOG / VIEWPORT CAPTURING */}
                  {(isCapturingKtp || isCapturingPenerima) && (
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 text-center">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Kamera Aktif: {isCapturingKtp ? "Ambil Foto KTP" : "Ambil Foto Penyerahan"}
                        </span>
                        <button 
                          onClick={stopWebcam} 
                          className="text-xs text-red-500 font-bold uppercase hover:text-red-400 transition-colors"
                        >
                          Tutup
                        </button>
                      </div>

                      {/* Video capture wrapper box */}
                      <div className="relative rounded-lg overflow-hidden aspect-video bg-slate-900 border border-slate-800 flex items-center justify-center">
                        <video 
                          ref={videoRef} 
                          className="w-full h-full object-cover" 
                          playsInline 
                          muted 
                        />
                        <div className="absolute inset-4 border border-emerald-500/20 border-dashed pointer-events-none rounded-lg flex items-center justify-center">
                          <p className="text-[9px] text-emerald-400/60 font-mono">Posisikan Objek di Sini</p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => takeSnapshot(isCapturingKtp)}
                          className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer transition-colors"
                        >
                          Capture Snapshot
                        </button>
                        <button
                          type="button"
                          onClick={() => generateMockPhoto(isCapturingKtp)}
                          className="py-3 px-4 bg-slate-900 hover:bg-slate-850 text-slate-400 text-xs font-bold rounded-lg cursor-pointer transition-colors"
                          title="Gunakan Mock Otomatis jika Kamera error"
                        >
                          Mock Cam
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Invisible working canvas used to capture pixels */}
                  <canvas ref={canvasRef} className="hidden" />

                </div>
              )}

              {/* Large, comfortable disbursement button */}
              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={handleResetScanner}
                  className="px-4 py-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition duration-150 cursor-pointer border border-slate-200 dark:border-slate-700"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>

                {matchedKpm.status === 'Sudah Disalurkan' ? (
                  <button
                    disabled
                    type="button"
                    className="flex-1 py-4 bg-slate-100 dark:bg-slate-850 text-slate-400 dark:text-slate-600 text-xs sm:text-xs tracking-wider font-extrabold uppercase rounded-xl cursor-not-allowed border border-slate-200 dark:border-slate-800"
                  >
                    Bantuan KPM Terdistribusi
                  </button>
                ) : (
                  <button
                    onClick={handleProcessDisbursement}
                    disabled={isSubmitting}
                    type="button"
                    className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-xs font-extrabold tracking-wider uppercase rounded-xl cursor-pointer shadow-sm transition-all text-center flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-1.5 font-sans font-medium text-xs">
                        <span className="animate-spin text-lg">⚙️</span> Memproses Transaksi...
                      </span>
                    ) : (
                      <>
                        <Check className="w-4 h-4 flex-shrink-0" /> Salurkan BLT Sekarang
                      </>
                    )}
                  </button>
                )}
              </div>

            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-400 shadow-sm min-h-[300px] flex flex-col items-center justify-center">
              <QrCode className="w-12 h-12 stroke-1 text-slate-300 dark:text-slate-700 mb-3" />
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Disparitas Pencairan Bantuan</h3>
              <p className="text-xs text-slate-500 mt-1.5 max-w-sm leading-relaxed">Silakan gunakan kamera scanner di sebelah kiri untuk membaca kartu fisik, atau gunakan input manual NIK untuk menarik profile digital kepala keluarga.</p>
            </div>
          )}

          {/* Success Confetti notice overlay panel */}
          {successConfetti && (
            <div className="bg-emerald-600 text-white rounded-xl p-5 shadow-lg flex items-center justify-between gap-3 animate-in slide-in-from-bottom duration-300">
              <div className="flex gap-2.5 items-center">
                <span className="text-2xl">🎉</span>
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wider leading-none">Penyaluran BLT Selesai Realisasi</h4>
                  <p className="text-[11px] text-emerald-150 mt-1">Status database KPM berhasil diubah menjadi Sudah Disalurkan.</p>
                </div>
              </div>
              <button 
                onClick={() => setSuccessConfetti(false)}
                type="button"
                className="bg-white/15 px-3 py-1.5 hover:bg-white/20 rounded text-xs cursor-pointer font-bold transition-colors"
              >
                OKE
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
