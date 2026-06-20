import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  PenerimaBlt, 
  PenyaluranBlt, 
  AppUser, 
  UserRole 
} from './types';
import { DataService, isSupabaseConfigured } from './supabaseClient';
import StatsDashboard from './components/StatsDashboard';
import InputPenerima from './components/InputPenerima';
import ScanningPanel from './components/ScanningPanel';
import ManualSearch from './components/ManualSearch';
import RiwayatPenyaluran from './components/RiwayatPenyaluran';
import DbBackupRestore from './components/DbBackupRestore';
import SupabaseConfigModal from './components/SupabaseConfigModal';

import { 
  Users, 
  CheckCircle, 
  QrCode, 
  Search, 
  History, 
  Settings, 
  LogOut, 
  Sun, 
  Moon, 
  Database, 
  Lock, 
  ShieldAlert, 
  Terminal,
  Clock,
  Menu,
  X,
  Compass
} from 'lucide-react';

// Live Time Checker helper
const getFormattedTime = () => {
  return new Date().toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }) + ' WIB';
};

export default function App() {
  // App Core States
  const [penerima, setPenerima] = useState<PenerimaBlt[]>([]);
  const [penyaluran, setPenyaluran] = useState<PenyaluranBlt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);

  // Login PIN states
  const [selectedRoleForPin, setSelectedRoleForPin] = useState<UserRole | null>(null);
  const [pinCode, setPinCode] = useState<string>('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Layout and Display Settings
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('blt_dark_mode') === 'true');
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Live clock
  const [liveTime, setLiveTime] = useState(getFormattedTime());

  // Connection Indicator
  const [isDbActive, setIsDbActive] = useState(isSupabaseConfigured());
  const [dbStatus, setDbStatus] = useState<{ connected: boolean; details: string; supabase_url?: string; last_penerima_error?: string; last_penyaluran_error?: string } | null>(null);

  // Inactivity timeout reference (30 minutes)
  const inactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Dynamic Floating Toast Notifications State
  const [toasts, setToasts] = useState<Array<{ id: string; text: string; type: 'success' | 'err' | 'info' }>>([]);

  const triggerToast = useCallback((text: string, type: 'success' | 'err' | 'info' = 'success') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  // Update Clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveTime(getFormattedTime());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 1. Theme Configuration
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('blt_dark_mode', 'true');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('blt_dark_mode', 'false');
    }
  }, [darkMode]);

  // 2. Fetch Data from Database Service
  const loadDatabase = useCallback(async () => {
    setIsLoading(true);
    try {
      const pmList = await DataService.getPenerima();
      const psList = await DataService.getPenyaluran();
      setPenerima(pmList);
      setPenyaluran(psList);

      // Check server DB connection status
      fetch('/api/db-status')
        .then(r => r.json())
        .then(status => {
          setDbStatus(status);
          setIsDbActive(status.connected);
        })
        .catch(err => console.warn('Gagal memuat status DB dari server', err));
    } catch (err: any) {
      triggerToast('Gagal memuat database: ' + err.message, 'err');
    } finally {
      setIsLoading(false);
    }
  }, [triggerToast]);

  // Load initially and poll in the background every 10 seconds for real-time online syncing
  useEffect(() => {
    loadDatabase();

    const interval = setInterval(() => {
      // Fetch quietly in the background without setting the full loading spinner screen
      DataService.getPenerima().then(pmList => {
        setPenerima(pmList);
      }).catch(err => console.debug('Quiet sync fail', err));

      DataService.getPenyaluran().then(psList => {
        setPenyaluran(psList);
      }).catch(err => console.debug('Quiet sync fail', err));

      fetch('/api/db-status')
        .then(r => r.json())
        .then(status => {
          setDbStatus(status);
          setIsDbActive(status.connected);
        })
        .catch(err => console.warn('Quiet db status check failed', err));
    }, 10000);

    return () => clearInterval(interval);
  }, [loadDatabase]);

  // 3. User Inactivity Auto-Logout Handler (30 minutes timer)
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
    }

    if (currentUser) {
      inactivityTimeoutRef.current = setTimeout(() => {
        handleLogout('Sesi Anda telah berakhir secara otomatis karena tidak aktif selama 30 menit.');
      }, 30 * 60 * 1000); // 30 minutes in milliseconds
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    // Listen to user operations
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    const updateHandler = () => resetInactivityTimer();

    events.forEach(event => window.addEventListener(event, updateHandler));
    resetInactivityTimer(); // Initial boot

    return () => {
      if (inactivityTimeoutRef.current) clearTimeout(inactivityTimeoutRef.current);
      events.forEach(event => window.removeEventListener(event, updateHandler));
    };
  }, [currentUser, resetInactivityTimer]);

  // Core Login & PIN verification
  const handleLoginStart = (role: UserRole) => {
    setSelectedRoleForPin(role);
    setPinCode('');
    setLoginError(null);
  };

  const handleVerifyPinAndLogin = (pinToSubmit?: string) => {
    const pin = pinToSubmit !== undefined ? pinToSubmit : pinCode;
    if (!selectedRoleForPin) return;

    const expectedPin = selectedRoleForPin === 'Admin' ? '9999' : '1234';
    if (pin === expectedPin) {
      const role = selectedRoleForPin;
      const user: AppUser = {
        id: role === 'Admin' ? 'usr_admin' : 'usr_petugas',
        email: role === 'Admin' ? 'admin@wargaluyu.desa.id' : 'petugas@wargaluyu.desa.id',
        role,
        nama: role === 'Admin' ? 'Kebijakan Admin' : 'Petugas Lapangan'
      };
      setCurrentUser(user);
      // Set landing page based on Role
      setActiveTab(role === 'Admin' ? 'dashboard' : 'scan-qr');
      triggerToast(`Sambut ${role === 'Admin' ? 'Administrator' : 'Petugas Lapangan'}: ${user.nama}!`, 'success');
      
      // Clear PIN state
      setSelectedRoleForPin(null);
      setPinCode('');
      setLoginError(null);
    } else {
      setLoginError('Kode PIN Keamanan salah! Silakan periksa kembali.');
      triggerToast('Gagal Login: Kode PIN tidak cocok!', 'err');
    }
  };

  const handleLogout = (message = 'Anda telah logout dengan aman.') => {
    setCurrentUser(null);
    setSelectedRoleForPin(null);
    setPinCode('');
    setLoginError(null);
    if (inactivityTimeoutRef.current) clearTimeout(inactivityTimeoutRef.current);
    triggerToast(message, 'info');
  };

  // Database mutations wrapped with state triggers
  const handleAddKpm = async (payload: Omit<PenerimaBlt, 'id' | 'status'>) => {
    await DataService.addPenerima(payload);
    await loadDatabase();
    triggerToast('Data KPM baru berhasil dimasukkan ke Data Terpadu!', 'success');
  };

  const handleEditKpm = async (id: string, updates: Partial<PenerimaBlt>) => {
    await DataService.updatePenerima(id, updates);
    await loadDatabase();
    triggerToast('Perubahan data KPM disimpan!', 'success');
  };

  const handleDeleteKpm = async (id: string) => {
    await DataService.deletePenerima(id);
    await loadDatabase();
    triggerToast('Data KPM berhasil dihapus dari sistem.', 'info');
  };

  const handleDistributeBLT = async (payload: Omit<PenyaluranBlt, 'id' | 'status'>) => {
    // Audit check preventing duplicate
    const checkDup = penyaluran.some(p => p.nik === payload.nik);
    if (checkDup) {
      throw new Error('Penerima sudah terekam menerima dana BLT periode ini!');
    }

    // Photo uploads handling
    const onlineUrlKtp = await DataService.uploadPhoto('blt-photos', 'ktp', payload.foto_ktp);
    const onlineUrlPenerima = await DataService.uploadPhoto('blt-photos', 'penerima', payload.foto_penerima);

    const mergedPayload = {
      ...payload,
      foto_ktp: onlineUrlKtp,
      foto_penerima: onlineUrlPenerima
    };

    await DataService.addPenyaluran(mergedPayload);
    await loadDatabase();
    triggerToast(`Penyaluran Sukses! Dana BLT dicairkan ke KPM ${payload.nama}.`, 'success');
  };

  const handleImportBackup = (kpmList: PenerimaBlt[], hisList: PenyaluranBlt[]) => {
    DataService.restoreAllData(kpmList, hisList);
    loadDatabase();
    triggerToast('Arsip excel berhasil di-restore!', 'success');
  };

  const handleResetToDefaults = () => {
    DataService.resetAllData();
    loadDatabase();
    triggerToast('Semua database di-reset ke nilai default.', 'info');
  };

  const reloadDbCredentials = (url: string, key: string) => {
    setIsDbModalOpen(false);
    setIsDbActive(isSupabaseConfigured());
    triggerToast(
      isSupabaseConfigured() 
        ? 'Terhubung dengan database Supabase online!' 
        : 'Kembali menggunakan Database Sandbox Offline.', 
      'info'
    );
  };

  const printAreaView = activeTab === 'input-kpm' || activeTab === 'administrasi';

  return (
    <div className={`min-h-screen text-slate-900 transition-colors duration-200 ${darkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50'}`}>
      
      {/* Toast floating notify container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-2 px-5 py-4 rounded-2xl shadow-xl border text-xs font-semibold animate-in slide-in-from-right-10 duration-200 ${
              toast.type === 'success' 
                ? 'bg-emerald-50 dark:bg-emerald-950/90 text-emerald-800 dark:text-emerald-400 border-emerald-200' 
                : toast.type === 'err'
                  ? 'bg-red-50 dark:bg-red-950/90 text-red-800 dark:text-red-400 border-red-200'
                  : 'bg-indigo-50 dark:bg-indigo-950/90 text-indigo-800 dark:text-indigo-400 border-indigo-200'
            }`}
          >
            <span className="text-sm">
              {toast.type === 'success' ? '⚡' : toast.type === 'err' ? '⚠️' : 'ℹ️'}
            </span>
            <p>{toast.text}</p>
          </div>
        ))}
      </div>

      {/* 4. Login Gate View screen */}
      {!currentUser ? (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-slate-900">
          {/* Ambient background rings */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brands bg-teal-500/5 rounded-full blur-3xl"></div>

          <div className="w-full max-w-md bg-white/5 dark:bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-[36px] p-6 sm:p-10 shadow-2xl relative z-10 text-center space-y-6 text-white card font-sans">
            <div>
              <span className="inline-flex px-3 m-auto py-1 rounded-full text-[9px] font-bold tracking-widest uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/35 mb-2">
                PEMERINTAH KABUPATEN BANDUNG
              </span>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                BLT DANA DESA <br />
                <span className="text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full text-glow">DESA WARGALUYU</span>
              </h1>
              <p className="text-slate-400 text-xs mt-3 leading-relaxed">
                Kecamatan Arjasari, Kabupaten Bandung. Portal terpadu penyaluran stimulus dana desa secara kredibel dan tepat sasaran.
              </p>
            </div>

            {selectedRoleForPin ? (
              <div className="space-y-4 py-2 text-left">
                <div className="bg-emerald-500/10 rounded-2xl p-4 border border-emerald-500/20">
                  <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">
                    PIN SECURITY ACCESS
                  </span>
                  <h3 className="font-extrabold text-sm mt-1">
                    Akses {selectedRoleForPin === 'Admin' ? 'Admin Kantor Desa' : 'Petugas Salur Lapangan'}
                  </h3>
                  <p className="text-slate-400 text-[10px] mt-0.5 leading-normal">
                    Silakan masukkan PIN pengaman ({selectedRoleForPin === 'Admin' ? 'PIN: 9999' : 'PIN: 1234'}) untuk membuka gerbang data lokal.
                  </p>
                </div>

                {loginError && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-xs text-center font-bold">
                    {loginError}
                  </div>
                )}

                {/* PIN Display Indicators */}
                <div className="grid grid-cols-4 gap-3 bg-black/40 p-4 rounded-2xl border border-white/5 text-center font-mono">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-10 border-b-2 border-slate-700 flex items-center justify-center text-xl font-bold text-emerald-450">
                      {pinCode[i] ? '●' : ' '}
                    </div>
                  ))}
                </div>

                {/* PIN Numeric Dialer Panel */}
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => {
                        if (pinCode.length < 4) {
                          const newVal = pinCode + num;
                          setPinCode(newVal);
                          setLoginError(null);
                          if (newVal.length === 4) {
                            setTimeout(() => handleVerifyPinAndLogin(newVal), 200);
                          }
                        }
                      }}
                      className="py-3 bg-white/5 hover:bg-white/10 active:scale-95 text-white rounded-xl font-bold text-base border border-white/5 transition-all text-center"
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setPinCode('');
                      setLoginError(null);
                    }}
                    className="py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl font-bold text-xs active:scale-95 transition-all text-center"
                  >
                    HAPUS
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (pinCode.length < 4) {
                        const newVal = pinCode + '0';
                        setPinCode(newVal);
                        setLoginError(null);
                        if (newVal.length === 4) {
                          setTimeout(() => handleVerifyPinAndLogin(newVal), 200);
                        }
                      }
                    }}
                    className="py-3 bg-white/5 hover:bg-white/10 active:scale-95 text-white rounded-xl font-bold text-base border border-white/5 transition-all text-center"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRoleForPin(null);
                      setPinCode('');
                      setLoginError(null);
                    }}
                    className="py-3 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl font-bold text-xs active:scale-95 transition-all text-center border border-slate-705"
                  >
                    BATAL
                  </button>
                </div>

                <button
                  type="button"
                  disabled={pinCode.length !== 4}
                  onClick={() => handleVerifyPinAndLogin()}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl transition-all shadow-sm active:scale-95 mt-2 flex items-center justify-center gap-1 cursor-pointer text-xs"
                >
                  Verifikasi PIN & Masuk
                </button>
              </div>
            ) : (
              /* Quick pre-configured roles selector */
              <div className="space-y-3.5 py-2">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-left">PILIH IDENTITAS LOGIN PETUGAS:</h4>
                
                {/* Option A: Admin */}
                <button
                  type="button"
                  onClick={() => handleLoginStart('Admin')}
                  className="w-full relative overflow-hidden group text-left px-5 py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-lg active:scale-95 transition-all flex items-center justify-between cursor-pointer border border-emerald-500/30"
                >
                  <div className="min-w-0">
                    <span className="text-[8px] font-extrabold uppercase bg-black/20 text-emerald-200 px-2 py-0.5 rounded tracking-wider">ADMIN KANTOR DESA</span>
                    <h3 className="font-bold text-sm mt-1 leading-none">Admin Kantor Desa</h3>
                    <p className="text-[10px] text-white/70 mt-1 font-mono">ID: admin@wargaluyu.desa.id (PIN: 9999)</p>
                  </div>
                  <div className="bg-white/15 p-2 rounded-xl group-hover:bg-white/20 transition-colors">
                    <Terminal className="w-5 h-5 text-emerald-100" />
                  </div>
                </button>

                {/* Option B: Field Officer / Petugas */}
                <button
                  type="button"
                  onClick={() => handleLoginStart('Petugas')}
                  className="w-full relative overflow-hidden group text-left px-5 py-4 rounded-2xl bg-slate-800 text-white shadow-md active:scale-95 transition-all flex items-center justify-between cursor-pointer border border-slate-700"
                >
                  <div className="min-w-0">
                    <span className="text-[8px] font-extrabold uppercase bg-white/10 text-slate-300 px-2 py-0.5 rounded tracking-wider">PETUGAS SALUR LAPANGAN</span>
                    <h3 className="font-bold text-sm mt-1 leading-none">Petugas Salur Lapangan</h3>
                    <p className="text-[10px] text-white/50 mt-1 font-mono">ID: petugas@wargaluyu.desa.id (PIN: 1234)</p>
                  </div>
                  <div className="bg-white/5 p-2 rounded-xl group-hover:bg-white/10 transition-colors">
                    <QrCode className="w-5 h-5 text-slate-300" />
                  </div>
                </button>
              </div>
            )}

            <div className="text-[9px] text-slate-500 font-mono text-center border-t border-white/5 pt-4 flex justify-between">
              <span>ACTIVE: 2026/06/17</span>
              <span>DESA_WARGALUYU_SECURE_NODE</span>
            </div>
          </div>
        </div>
      ) : (
        /* 5. Actual Application Scaffold Workspace */
        <div className="flex flex-col min-h-screen">
          
          {/* Main Top Header Block */}
          <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-100 dark:border-slate-800/80 px-4 sm:px-6 py-4 flex items-center justify-between transition-colors">
            <div className="flex items-center gap-3">
              {/* App launcher logo icon */}
              <span className="h-10 w-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-extrabold tracking-tighter text-sm shadow-lg shadow-emerald-500/20">
                BLT
              </span>
              <div>
                <h1 className="font-extrabold tracking-tight text-xs sm:text-sm text-slate-900 dark:text-white leading-none">
                  BLT DESA WARGALUYU
                </h1>
                <p className="text-[10px] sm:text-xs text-emerald-600 dark:text-emerald-400 font-semibold tracking-wider uppercase mt-1 leading-none">
                  Penyaluran BLT Dana Desa Wargaluyu
                </p>
              </div>
            </div>

            {/* Quick Header status information bar indicators */}
            <div className="flex items-center gap-3.5">
              
              {/* Current Active User Profile Badge */}
              <div className="hidden md:flex items-center gap-2.5 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                <span className="inline-block w-20 truncate text-xs text-right font-semibold text-slate-700 dark:text-slate-300">
                  {currentUser.role}
                </span>
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs text-slate-400 font-mono text-nowrap">{liveTime}</span>
              </div>

              {/* Database Active Mode Indicator */}
              <button
                onClick={() => setIsDbModalOpen(true)}
                title="Tekan untuk ganti database"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-[10px] font-bold tracking-wider uppercase border transition-all cursor-pointer ${
                  isDbActive 
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-400' 
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/10 dark:text-emerald-400'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isDbActive ? 'REAL SUPABASE ONLINE' : 'LOCAL MODE (SANDBOX)'}</span>
              </button>

              {/* Dark mode button */}
              <button
                onClick={() => setDarkMode(prev => !prev)}
                className="p-2.5 text-slate-400 bg-slate-50 dark:bg-slate-900/50 hover:text-slate-800 dark:hover:text-white border border-slate-100 rounded-xl cursor-pointer"
              >
                {darkMode ? <Sun className="w-4 h-4 text-emerald-400" /> : <Moon className="w-4 h-4" />}
              </button>

              {/* Mobile menu button */}
              <button
                onClick={() => setIsMobileMenuOpen(prev => !prev)}
                className="p-2.5 md:hidden text-slate-40s bg-slate-50 dark:bg-slate-900/50 border border-slate-150 rounded-xl cursor-pointer"
              >
                {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>

              {/* Logout button */}
              <button
                onClick={() => handleLogout()}
                title="Keluar Log Sistem"
                className="p-2.5 text-red-500 bg-red-50 hover:bg-red-100 border border-red-100 rounded-xl cursor-pointer transition-all"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* Sub Navigation Bar Tab Buttons */}
          <div className={`bg-slate-100/65 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-850 ${isMobileMenuOpen ? 'block' : 'hidden'} md:block md:p-3 transition-all duration-300`}>
            <div className={`max-w-7xl mx-auto flex flex-col md:flex-row gap-2 ${isMobileMenuOpen ? 'p-4' : ''}`}>
              
              {/* Button 1: Statistics Dashboard */}
              <button
                onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }}
                className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl cursor-pointer transition-all ${
                  activeTab === 'dashboard'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-705 dark:text-slate-300 hover:bg-slate-50'
                }`}
              >
                <Users className="w-4 h-4" /> DASHBOARD
              </button>

              {/* Button 2: Scan QR Code */}
              <button
                onClick={() => { setActiveTab('scan-qr'); setIsMobileMenuOpen(false); }}
                className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl cursor-pointer transition-all ${
                  activeTab === 'scan-qr'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-705 dark:text-slate-300 hover:bg-slate-50'
                }`}
              >
                <QrCode className="w-4 h-4" /> PINDAI QR CODE
              </button>

              {/* Button 3: Manual Search */}
              <button
                onClick={() => { setActiveTab('manual-search'); setIsMobileMenuOpen(false); }}
                className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl cursor-pointer transition-all  ${
                  activeTab === 'manual-search'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-705 dark:text-slate-300 hover:bg-slate-50'
                }`}
              >
                <Search className="w-4 h-4" /> CARI MANUALLY
              </button>

              {/* Button 4: Riwayat Penyaluran */}
              <button
                onClick={() => { setActiveTab('riwayat'); setIsMobileMenuOpen(false); }}
                className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl cursor-pointer transition-all ${
                  activeTab === 'riwayat'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-705 dark:text-slate-300 hover:bg-slate-50'
                }`}
              >
                <History className="w-4 h-4" /> RIWAYAT DANA
              </button>

              {/* Button 5: Input Penerima */}
              {currentUser.role === 'Admin' ? (
                <button
                  onClick={() => { setActiveTab('input-kpm'); setIsMobileMenuOpen(false); }}
                  className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl cursor-pointer transition-all ${
                    activeTab === 'input-kpm'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-705 dark:text-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <Compass className="w-4 h-4" /> INPUT DATA (ADMIN)
                </button>
              ) : (
                <button
                  disabled
                  title="Fungsi terkunci untuk Petugas Lapangan"
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-600 cursor-not-allowed border border-slate-200 dark:border-slate-800"
                >
                  <Lock className="w-3.5 h-3.5 opacity-40" /> INPUT DATA (DIKUNCI)
                </button>
              )}

              {/* Button 6: Backup / Restore */}
              {currentUser.role === 'Admin' ? (
                <button
                  onClick={() => { setActiveTab('administrasi'); setIsMobileMenuOpen(false); }}
                  className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl cursor-pointer transition-all ${
                    activeTab === 'administrasi'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-705 dark:text-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <Settings className="w-4 h-4" /> BACKUP & EXCEL (ADMIN)
                </button>
              ) : (
                <button
                  disabled
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-600 cursor-not-allowed border border-slate-200 dark:border-slate-800"
                >
                  <Lock className="w-3.5 h-3.5 opacity-40" /> BACKUP & EXCEL (DIKUNCI)
                </button>
              )}

            </div>
          </div>

          {/* Core Body viewport window layout (Main Worksite) */}
          <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
            
            {/* Loading Spinner Skeleton */}
            {isLoading ? (
              <div className="py-24 space-y-4 max-w-md mx-auto text-center">
                <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <div className="space-y-2">
                  <h3 className="font-bold text-slate-900 text-sm animate-pulse">Menghubungkan Database Lapangan...</h3>
                  <p className="text-xs text-slate-400">Sinkronisasi DTKS, tabel penerima_blt, dan penyaluran_blt. Harap tunggu sebentar.</p>
                </div>
              </div>
            ) : (
              <div className="animate-in fade-in duration-200">
                {/* Supabase Diagnostics Warning Banner */}
                {dbStatus && !dbStatus.connected && (
                  <div className="mb-6 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-300 flex flex-col sm:flex-row gap-4 items-start animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-400 shrink-0">
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <h4 className="font-bold text-xs sm:text-sm">DATA BELUM SINKRON ANTAR PERANGKAT (LAPTOP & HP)</h4>
                      <p className="text-[11px] sm:text-xs text-amber-750 dark:text-amber-400 leading-relaxed">
                        Aplikasi saat ini berjalan dalam <strong>Mode Sandbox Lokal (Luring)</strong> karena server tidak terhubung ke database online Supabase Anda. Selama masalah ini belum diatasi, data baru tidak akan tersinkronisasi antar perangkat (Laptop & HP)!
                      </p>
                      <div className="p-2.5 mt-2 bg-white/70 dark:bg-black/35 rounded-lg text-[10px] sm:text-xs font-mono break-all border border-amber-250/60 dark:border-amber-900/40">
                        <span className="font-bold text-amber-950 dark:text-amber-305 block mb-0.5">Detail Kendala Server:</span>
                        {dbStatus.details}
                        {dbStatus.last_penerima_error && <p className="mt-1 text-red-650 dark:text-red-400 font-semibold">Tabel Penerima: {dbStatus.last_penerima_error}</p>}
                        {dbStatus.last_penyaluran_error && <p className="mt-1 text-red-650 dark:text-red-400 font-semibold">Tabel Penyaluran: {dbStatus.last_penyaluran_error}</p>}
                      </div>
                      <p className="text-[10px] text-amber-600 dark:text-amber-450 mt-2">
                        💡 <strong>Solusi Mudah:</strong> Pastikan Anda telah membuat tabel-tabel Supabase sesuai dengan SQL Setup. Klik opsi <strong>LOCAL MODE (SANDBOX)</strong> di menu atas untuk menyalin kueri SQL Setup dan menempelkannya di dashboard Supabase SQL Editor Anda!
                      </p>
                    </div>
                  </div>
                )}

                {/* Core tab layout selection */}
                {activeTab === 'dashboard' && (
                  <StatsDashboard penerima={penerima} penyaluran={penyaluran} />
                )}

                {activeTab === 'scan-qr' && (
                  <ScanningPanel 
                    penerima={penerima} 
                    currentUser={currentUser} 
                    onSalurkan={handleDistributeBLT} 
                  />
                )}

                {activeTab === 'manual-search' && (
                  <ManualSearch 
                    penerima={penerima} 
                    currentUser={currentUser} 
                    onSalurkan={handleDistributeBLT} 
                  />
                )}

                {activeTab === 'riwayat' && (
                  <RiwayatPenyaluran penyaluran={penyaluran} penerima={penerima} />
                )}

                {activeTab === 'input-kpm' && currentUser.role === 'Admin' && (
                  <InputPenerima 
                    penerima={penerima} 
                    onAdd={handleAddKpm} 
                    onEdit={handleEditKpm} 
                    onDelete={handleDeleteKpm} 
                  />
                )}

                {activeTab === 'administrasi' && currentUser.role === 'Admin' && (
                  <DbBackupRestore
                    penerima={penerima}
                    penyaluran={penyaluran}
                    onImportData={handleImportBackup}
                    onResetToDefaults={handleResetToDefaults}
                  />
                )}
                
                {/* Fallback Viewport Security constraint checks */}
                {((activeTab === 'input-kpm' || activeTab === 'administrasi') && currentUser.role !== 'Admin') && (
                  <div className="bg-red-50 dark:bg-slate-900 border border-red-250 rounded-3xl p-10 text-center max-w-md mx-auto space-y-3.5 my-12">
                    <ShieldAlert className="w-16 h-16 text-red-500 mx-auto" />
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">Akses Khusus Admin Dilarang!</h3>
                      <p className="text-xs text-slate-500 mt-1">Anda saat ini sedang login sebagai Petugas Lapangan. Hanya level Admin Kantor Desa yang dapat menambah KPM DTKS baru atau mengunggah backup data.</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('scan-qr')}
                      className="bg-red-600 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow cursor-pointer mx-auto block"
                    >
                      Kembali ke Pemindaian QR
                    </button>
                  </div>
                )}
              </div>
            )}

          </main>

          {/* Footer credentials tag info lines */}
          <footer className="py-4 border-t border-slate-100 dark:border-slate-800 text-center text-[10px] sm:text-xs text-slate-400 font-mono flex flex-col sm:flex-row justify-between px-6 gap-2">
            <span>SISTEM PENYALURAN BLT WARGALUYU © 2026</span>
            <span>PEMERINTAH KABUPATEN BANDUNG - PROVINSI JAWA BARAT</span>
          </footer>

          {/* Dynamic Supabase Credentials Settings Modal */}
          {isDbModalOpen && (
            <SupabaseConfigModal 
              isOpen={isDbModalOpen} 
              onClose={() => setIsDbModalOpen(false)} 
              onSave={reloadDbCredentials} 
            />
          )}

        </div>
      )}

    </div>
  );
}
