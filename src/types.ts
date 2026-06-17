export interface PenerimaBlt {
  id: string;
  nik: string;
  no_kk: string;
  nama: string;
  jenis_kelamin: 'Laki-laki' | 'Perempuan';
  alamat: string;
  rt: string;
  rw: string;
  nominal: number;
  tahun: string;
  tahap: string;
  status: 'Belum Disalurkan' | 'Sudah Disalurkan';
  created_at?: string;
  qr_code?: string; // Cache base64 or generated URL
}

export interface PenyaluranBlt {
  id: string;
  penerima_id: string;
  nik: string;
  nama: string;
  alamat: string;
  rt: string;
  rw: string;
  nominal: number;
  tanggal: string; // YYYY-MM-DD
  jam: string; // HH:mm:ss
  petugas: string;
  foto_ktp: string; // base64 or storage URL
  foto_penerima: string; // base64 or storage URL
  status: 'Sudah Disalurkan';
  created_at?: string;
}

export type UserRole = 'Admin' | 'Petugas';

export interface AppUser {
  id: string;
  email: string;
  role: UserRole;
  nama: string;
}
