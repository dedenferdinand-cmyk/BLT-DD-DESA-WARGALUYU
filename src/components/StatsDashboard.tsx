import React, { useMemo } from 'react';
import { PenerimaBlt, PenyaluranBlt } from '../types';
import { Users, CheckCircle, Clock, Percent, ShieldCheck, MapPin, BarChart3, TrendingUp } from 'lucide-react';

interface StatsDashboardProps {
  penerima: PenerimaBlt[];
  penyaluran: PenyaluranBlt[];
}

export default function StatsDashboard({ penerima, penyaluran }: StatsDashboardProps) {
  // Compute Stats
  const totalKpm = penerima.length;
  const sudahDisalurkan = penerima.filter((p) => p.status === 'Sudah Disalurkan').length;
  const belumDisalurkan = totalKpm - sudahDisalurkan;
  const persentasePenyaluran = totalKpm > 0 ? Math.round((sudahDisalurkan / totalKpm) * 100) : 0;
  
  const totalDana = penerima.reduce((sum, p) => sum + p.nominal, 0);
  const danaDisalurkan = penerima
    .filter((p) => p.status === 'Sudah Disalurkan')
    .reduce((sum, p) => sum + p.nominal, 0);
  const sisaDana = totalDana - danaDisalurkan;
  
  // Group by RT/RW for distribution breakdown
  const rtBreakdown = useMemo(() => {
    const map: Record<string, { total: number; sudah: number }> = {};
    penerima.forEach((p) => {
      const key = `RT ${p.rt} / RW ${p.rw}`;
      if (!map[key]) {
        map[key] = { total: 0, sudah: 0 };
      }
      map[key].total += 1;
      if (p.status === 'Sudah Disalurkan') {
        map[key].sudah += 1;
      }
    });

    return Object.entries(map).map(([name, val]) => {
      const pct = val.total > 0 ? Math.round((val.sudah / val.total) * 100) : 0;
      return { name, total: val.total, sudah: val.sudah, pct };
    }).sort((a, b) => b.pct - a.pct); // Sort by highest percentage
  }, [penerima]);

  // Formatter for Currency IDR
  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* Welcome Hero Dashboard */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 mb-3">
            <ShieldCheck className="w-3 h-3 inline mr-0.5" /> Dashboard Ops Desa Wargaluyu
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-950 dark:text-white">
            Monitoring Penyaluran <span className="text-emerald-700 dark:text-emerald-400">BLT Dana Desa</span>
          </h1>
          <p className="mt-1.5 text-slate-600 dark:text-slate-400 text-xs sm:text-sm leading-relaxed">
            Sistem validasi, pencatatan transaksi, dan audit lapangan penyaluran dana BLT berbasis QR Code & Geolocation Desa Wargaluyu.
          </p>
        </div>
      </div>

      {/* Stats Cards Grid (Clean Minimalist styled) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total KPM */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Total KPM</span>
            <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {totalKpm}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 uppercase font-medium tracking-wide">Keluarga Penerima</p>
          </div>
        </div>

        {/* Card 2: Sudah Disalurkan */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Disalurkan</span>
            <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-extrabold tracking-tight text-emerald-700 dark:text-emerald-400">
              {sudahDisalurkan}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 uppercase font-medium tracking-wide">Penerima telah cair</p>
          </div>
        </div>

        {/* Card 3: Belum Disalurkan */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Sisa KPM</span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {belumDisalurkan}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 uppercase font-medium tracking-wide">Mengantri salur</p>
          </div>
        </div>

        {/* Card 4: Persentase */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest">Dana Keluar</span>
            <Percent className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {persentasePenyaluran}%
            </h3>
            {/* Smooth Progress Bar */}
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1 mt-3.5 overflow-hidden">
              <div 
                className="bg-emerald-600 h-full rounded-full transition-all duration-1000"
                style={{ width: `${persentasePenyaluran}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Finance Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Rencana Dana */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Total Alokasi Rencana Dana</p>
            <h4 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
              {formatIDR(totalDana)}
            </h4>
          </div>
          <span className="text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1 rounded font-bold tracking-wider uppercase">
            100% Rencana
          </span>
        </div>

        {/* Anggaran Realisasi */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Total Anggaran Terealisasi</p>
            <h4 className="text-xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">
              {formatIDR(danaDisalurkan)}
            </h4>
          </div>
          <span className="text-[11px] bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-400 px-3 py-1 rounded font-bold tracking-wider uppercase">
            {totalDana > 0 ? Math.round((danaDisalurkan / totalDana) * 100) : 0}% Realisasi
          </span>
        </div>

        {/* Sisa Alokasi Anggaran (Secara Otomatis Berkurang) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-850 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-amber-500 dark:text-amber-400 uppercase tracking-widest">Sisa Alokasi Dana (Belum Salur)</p>
            <h4 className="text-xl font-bold text-amber-600 dark:text-amber-500 mt-1">
              {formatIDR(sisaDana)}
            </h4>
          </div>
          <span className="text-[11px] bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-400 px-3 py-1 rounded font-bold tracking-wider uppercase">
            {totalDana > 0 ? Math.round((sisaDana / totalDana) * 100) : 0}% Berkurang
          </span>
        </div>
      </div>

      {/* Visual Charts & RT RW Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Custom representation of target stages & performance */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-slate-50 dark:bg-slate-950 rounded-lg text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                <BarChart3 className="w-4 h-4" />
              </span>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">Progres Perbandingan Wilayah</h3>
                <p className="text-[11px] text-slate-400">Persentase data penyaluran per RT/RW</p>
              </div>
            </div>
            <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded uppercase tracking-wider">
              Aktif
            </span>
          </div>

          {/* Custom Interactive Graphic Bar Layout */}
          <div className="space-y-4 pt-1">
            {rtBreakdown.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                Belum ada data wilayah RT/RW untuk ditampilkan.
              </div>
            ) : (
              rtBreakdown.slice(0, 5).map((item, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" /> {item.name}
                    </span>
                    <span className="text-slate-600 dark:text-slate-400 font-mono">
                      {item.sudah} / {item.total} KPM <span className="text-emerald-700 dark:text-emerald-400 font-bold">({item.pct}%)</span>
                    </span>
                  </div>
                  <div className="relative w-full h-2 bg-slate-100 dark:bg-slate-850 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${
                        item.pct === 100 
                          ? 'bg-emerald-600' 
                          : item.pct > 50 
                            ? 'bg-emerald-500'
                            : 'bg-emerald-400'
                      }`}
                      style={{ width: `${item.pct}%` }}
                    ></div>
                  </div>
                </div>
              ))
            )}
            
            {rtBreakdown.length > 5 && (
              <p className="text-[11px] text-center text-slate-400 italic pt-2">
                Menampilkan 5 wilayah teratas. Total {rtBreakdown.length} wilayah terdaftar dalam DTKS Desa.
              </p>
            )}
          </div>
        </div>

        {/* Right: Gender distribution and active status */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
            <span className="p-1.5 bg-slate-50 dark:bg-slate-950 rounded-lg text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
              <TrendingUp className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Statistik Demografis</h3>
              <p className="text-[11px] text-slate-400">Komposisi Profil KPM Desa</p>
            </div>
          </div>

          {/* Demographics Calculations */}
          {useMemo(() => {
            const laki = penerima.filter(p => p.jenis_kelamin === 'Laki-laki').length;
            const perempuan = penerima.filter(p => p.jenis_kelamin === 'Perempuan').length;
            const pmTotal = laki + perempuan || 1;
            const pctLaki = Math.round((laki / pmTotal) * 100);
            const pctPerempuan = Math.round((perempuan / pmTotal) * 100);

            return (
              <div className="space-y-6 pt-1">
                {/* Gender visual bar representation */}
                <div className="space-y-2.5">
                  <div className="flex justify-between text-[11px] uppercase tracking-wider font-bold text-slate-400">
                    <span className="text-slate-700 dark:text-slate-300">Laki-laki ({laki})</span>
                    <span className="text-emerald-700 dark:text-emerald-400">Perempuan ({perempuan})</span>
                  </div>
                  <div className="flex w-full h-2 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <div className="bg-slate-400 dark:bg-slate-500 h-full" style={{ width: `${pctLaki}%` }}></div>
                    <div className="bg-emerald-600 h-full" style={{ width: `${pctPerempuan}%` }}></div>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                    <span>{pctLaki}% KK Laki-laki</span>
                    <span>{pctPerempuan}% KK Perempuan</span>
                  </div>
                </div>

                {/* Tahap representation card block */}
                <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl space-y-2.5 border border-slate-200 dark:border-slate-800/80">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">SISTEM INTEGRITAS DATA</h4>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Tahun Aktif:</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">2026</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Tahap Distribusi:</span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-450">Tahap 1</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Verifikasi Petugas:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">100% Validated</span>
                  </div>
                </div>
              </div>
            );
          }, [penerima])}
        </div>
      </div>
    </div>
  );
}
