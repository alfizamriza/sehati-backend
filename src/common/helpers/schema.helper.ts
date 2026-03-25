/**
 * Helper untuk check struktur tabel Supabase
 * Jalankan di app.service.ts atau create endpoint
 */

export const EXPECTED_TABLES = {
  users: {
    columns: ['id', 'username', 'password', 'nama', 'role', 'created_at', 'is_active'],
    description: 'Data user (admin, kantin)'
  },
  siswa: {
    columns: ['id', 'nis', 'nama', 'email', 'kelas_id', 'created_at', 'permissions'],
    description: 'Data siswa'
  },
  guru: {
    columns: ['id', 'nip', 'nama', 'email', 'created_at'],
    description: 'Data guru'
  },
  kelas: {
    columns: ['id', 'nama', 'tingkat', 'created_at'],
    description: 'Data kelas'
  },
  produk: {
    columns: ['id', 'nama', 'harga', 'stok', 'deskripsi', 'created_at'],
    description: 'Produk kantin'
  },
  transaksi: {
    columns: ['id', 'siswa_id', 'produk_id', 'jumlah', 'total_harga', 'tanggal', 'created_at'],
    description: 'Data transaksi'
  },
  voucher: {
    columns: ['id', 'kode', 'diskon', 'expired_at', 'is_used', 'created_at'],
    description: 'Data voucher'
  },
  absensi: {
    columns: ['id', 'siswa_id', 'tanggal', 'status', 'created_at'],
    description: 'Data absensi siswa'
  },
};

// SQL Script untuk create tables
export const CREATE_TABLES_SQL = `
-- Create Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  nama TEXT NOT NULL,
  role TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create Kelas table
CREATE TABLE IF NOT EXISTS kelas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama TEXT NOT NULL,
  tingkat INTEGER,
  guru_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create Siswa table
CREATE TABLE IF NOT EXISTS siswa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nis TEXT UNIQUE NOT NULL,
  nama TEXT NOT NULL,
  email TEXT,
  kelas_id UUID REFERENCES kelas(id),
  user_id UUID REFERENCES users(id),
  coins INTEGER DEFAULT 0,
  streak INTEGER DEFAULT 0,
  permissions TEXT[] DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create Guru table
CREATE TABLE IF NOT EXISTS guru (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nip TEXT UNIQUE NOT NULL,
  nama TEXT NOT NULL,
  email TEXT,
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create Produk table
CREATE TABLE IF NOT EXISTS produk (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama TEXT NOT NULL,
  harga DECIMAL(10,2) NOT NULL,
  stok INTEGER DEFAULT 0,
  deskripsi TEXT,
  gambar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create Transaksi table
CREATE TABLE IF NOT EXISTS transaksi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  siswa_id UUID REFERENCES siswa(id),
  produk_id UUID REFERENCES produk(id),
  jumlah INTEGER NOT NULL,
  total_harga DECIMAL(10,2) NOT NULL,
  tanggal TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create Voucher table
CREATE TABLE IF NOT EXISTS voucher (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode TEXT UNIQUE NOT NULL,
  diskon DECIMAL(5,2),
  expired_at TIMESTAMP,
  is_used BOOLEAN DEFAULT false,
  used_by UUID REFERENCES siswa(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create Absensi table
CREATE TABLE IF NOT EXISTS absensi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  siswa_id UUID REFERENCES siswa(id),
  tanggal DATE,
  status TEXT, -- 'HADIR', 'SAKIT', 'IZIN', 'ALFA'
  keterangan TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create Leaderboard table
CREATE TABLE IF NOT EXISTS leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  siswa_id UUID UNIQUE REFERENCES siswa(id),
  total_coins INTEGER DEFAULT 0,
  rank INTEGER,
  streak INTEGER DEFAULT 0,
  last_updated TIMESTAMP DEFAULT NOW()
);

-- Create indices for better performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_siswa_kelas_id ON siswa(kelas_id);
CREATE INDEX IF NOT EXISTS idx_siswa_user_id ON siswa(user_id);
CREATE INDEX IF NOT EXISTS idx_guru_user_id ON guru(user_id);
CREATE INDEX IF NOT EXISTS idx_transaksi_siswa_id ON transaksi(siswa_id);
CREATE INDEX IF NOT EXISTS idx_transaksi_produk_id ON transaksi(produk_id);
CREATE INDEX IF NOT EXISTS idx_absensi_siswa_id ON absensi(siswa_id);
CREATE INDEX IF NOT EXISTS idx_voucher_kode ON voucher(kode);
`;
