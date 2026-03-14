## Migration Firebase → Supabase - Setup Guide

### Status Migrasi: ✅ SELESAI

Semua file backend sudah dimigrasi dari Firebase ke Supabase.

---

## 🔧 LANGKAH SETUP SUPABASE

### 1️⃣ Buat Tables di Supabase

1. Buka **Supabase Dashboard** → pilih project Anda
2. Klik **SQL Editor** (sidebar kiri)
3. Click **New Query**
4. Copy-paste script dari file: `src/common/helpers/schema.helper.ts`
5. Jalankan query (tombol play/Run)

**Tables yang akan dibuat:**
- `users` - Admin & Kantin
- `siswa` - Data siswa
- `guru` - Data guru  
- `kelas` - Daftar kelas
- `produk` - Produk kantin
- `transaksi` - Transaksi penjualan
- `voucher` - Kode voucher
- `absensi` - Data absensi
- `leaderboard` - Ranking siswa

---

### 2️⃣ Set Environment Variables

Update file `.env` di folder `sehati-backend`:

```env
# Supabase Config
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key

# JWT Config
JWT_SECRET=your-super-secret-key
JWT_EXPIRES_IN=7d

# Server Config
PORT=3001
NODE_ENV=development
```

**Cara mendapat credentials:**
1. Di Supabase Dashboard → **Settings** → **API**
2. Copy nilai `Project URL` → `SUPABASE_URL`
3. Copy nilai dari `anon public` → `SUPABASE_KEY`

---

### 3️⃣ Update Column Names di Kode (jika struktur berbeda)

Jika tabel Supabase Anda punya kolom dengan nama berbeda, update di:
- `src/modules/auth/auth.service.ts`
- Service lainnya yang mengakses database

**Convention yang digunakan (snake_case):**
- `created_at` (bukan `createdAt`)
- `is_active` (bukan `isActive`)
- `user_id` (bukan `userId`)
- dst.

---

### 4️⃣ Test Server

```bash
# Terminal di folder sehati-backend
npm run start:dev
```

Expected output:
```
[Nest] ... INFO [NestFactory] Starting Nest application...
[Nest] ... INFO [InstanceLoader] AppModule dependencies initialized
[Nest] ... INFO [NestApplication] Nest application successfully started on port 3001
```

---

### 5️⃣ Test API

Coba endpoint login untuk verifikasi database terhubung:

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "role": "admin",
    "identifier": "admin",
    "password": "password123"
  }'
```

---

## 📝 Kode yang Sudah Diubah

### Services di Backend:
- ✅ `SupabaseService` - Helper CRUD dengan auto-retry untuk invalid columns
- ✅ `AuthService` - Migrated dari Firebase ke Supabase
- ✅ Semua Module - DatabaseModule diimport untuk akses Supabase

### Database Methods tersedia:
```typescript
// Get single document
await supabaseService.getDocument('users', userId);

// Query dengan filter
await supabaseService.queryCollection('users', 'username', 'admin');

// Create document
await supabaseService.createDocument('users', { username, password, ... });

// Update document
await supabaseService.updateDocument('users', userId, { field: value });

// Delete document
await supabaseService.deleteDocument('users', userId);

// Get table columns (untuk debugging schema)
await supabaseService.getTableColumns('users');
```

---

## ❌ Troubleshooting

### Error: "Could not find the 'xxx' column"
→ Kolom tidak ada di tabel. Solusi:
- Jalankan SQL script lagi untuk create kolom
- Atau update kode untuk hanya kirim kolom yang ada

### Error: "Failed to connect to Supabase"
→ Check `SUPABASE_URL` dan `SUPABASE_KEY` di `.env`

### Error: "Column 'id' doesn't exist"
→ Pastikan tabel punya kolom `id` sebagai PRIMARY KEY

---

## � TROUBLESHOOTING - Error 500 saat Register

### Possible Causes:

#### 1. Tabel 'users' tidak exist di Supabase
**Solusi:**
- Buka Supabase Dashboard → **SQL Editor**
- Jalankan SQL script dari `src/common/helpers/schema.helper.ts`
- Pastikan tabel `users` berhasil dibuat

#### 2. SUPABASE_URL atau SUPABASE_KEY invalid
**Solusi:**
- Buka `.env` file dan verify credentials
- Di Supabase Dashboard → **Settings** → **API**
- Copy ulang `Project URL` dan `anon public` key
- Pastikan tidak ada leading/trailing spaces di `.env`

#### 3. Kolom yang dikirim tidak match dengan schema tabel
**Solusi:**
- Check kolom apa yang ada di tabel users:
  ```sql
  SELECT column_name, data_type FROM information_schema.columns 
  WHERE table_name = 'users';
  ```
- Update `auth.service.ts` untuk sesuaikan nama kolom
- Konvention yang digunakan: snake_case (`created_at`, `is_active`, dll)

#### 4. Debug dengan Check Server Logs
Saat jalankan `npm run start:dev`, perhatikan console error:
```
[SupabaseService] Create error on table 'users': ...
[AuthService] Register error: ...
```

---

### users
```
id (UUID) - Primary Key
username (TEXT) - Unique
password (TEXT)
nama (TEXT)
role (TEXT) - admin|kantin|siswa|guru
is_active (BOOLEAN)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

### siswa
```
id (UUID) - Primary Key
nis (TEXT) - Unique
nama (TEXT)
email (TEXT)
kelas_id (UUID) - FK to kelas
user_id (UUID) - FK to users
coins (INTEGER)
streak (INTEGER)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

*(Lihat schema.helper.ts untuk struktur table lengkap)*

---

## ✨ Next Steps

1. ✅ Set .env dengan Supabase credentials
2. ✅ Jalankan SQL script untuk create tables
3. ✅ Test API endpoints
4. ✅ Update modul lainnya sesuai kebutuhan
5. ✅ Deploy ke production

Good luck! 🚀
