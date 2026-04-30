# Laporan Pengujian API Backend

Pengujian API dilakukan menggunakan Postman untuk memastikan setiap endpoint backend dapat menerima request dari client dan mengembalikan response yang sesuai. Tabel berikut memuat seluruh endpoint yang diuji, status kode HTTP yang diharapkan saat pengujian berhasil, dan bentuk respons secara umum.

Format respons sukses backend secara umum:

```json
{
  "success": true,
  "message": "Request successful",
  "data": {}
}
```

Format respons gagal backend secara umum:

```json
{
  "success": false,
  "message": "Error message",
  "error": {}
}
```

## Authentication

| No | API | Status Kode | Response |
|---|---|---|---|
| 1 | `POST /api/auth/login` | `200 OK` | `{"success":true,"message":"Login berhasil","data":{"user":{},"token":"..."}}` |
| 2 | `POST /api/auth/register/admin` | `201 Created` | `{"success":true,"message":"Admin berhasil didaftarkan","data":{}}` |
| 3 | `GET /api/auth/profile` | `200 OK` | `{"success":true,"message":"Data retrieved successfully","data":{"user":{}}}` |
| 4 | `POST /api/auth/logout` | `200 OK` | `{"success":true,"message":"Logout berhasil","data":{}}` |
| 5 | `GET /api/auth/login-logs` | `200 OK` | `{"success":true,"message":"Data retrieved successfully","data":[...]}` |

## Achievement

| No | API | Status Kode | Response |
|---|---|---|---|
| 1 | `GET /api/achievement/undisplayed` | `200 OK` | `{"success":true,"message":"Data retrieved successfully","data":[...]}` |
| 2 | `POST /api/achievement/mark-displayed` | `201 Created` | `{"success":true,"message":"Achievement marked as displayed"}` |
| 3 | `GET /api/achievement/unlocked` | `200 OK` | `{"success":true,"message":"Data retrieved successfully","data":[...]}` |
| 4 | `GET /api/achievement/showcase-options` | `200 OK` | `{"success":true,"message":"Data retrieved successfully","data":[...]}` |
| 5 | `GET /api/achievement/showcase-note` | `200 OK` | `{"success":true,"message":"Data retrieved successfully","data":{}}` |
| 6 | `POST /api/achievement/showcase-note` | `201 Created` | `{"success":true,"message":"Data created successfully","data":{}}` |
| 7 | `DELETE /api/achievement/showcase-note` | `200 OK` | `{"success":true,"message":"Data deleted successfully"}` |

## Siswa

| No | API | Status Kode | Response |
|---|---|---|---|
| 1 | `GET /api/siswa/import-template` | `200 OK` | `File template impor berhasil diunduh.` |
| 2 | `POST /api/siswa/import` | `201 Created` | `{"success":true,"message":"Data created successfully","data":{"imported":0}}` |
| 3 | `GET /api/siswa` | `200 OK` | `{"success":true,"message":"Data retrieved successfully","data":[...]}` |
| 4 | `POST /api/siswa` | `201 Created` | `{"success":true,"message":"Data created successfully","data":{"nis":"..."}}` |
| 5 | `GET /api/siswa/{nis}` | `200 OK` | `{"success":true,"message":"Data retrieved successfully","data":{"nis":"..."}}` |
| 6 | `PUT /api/siswa/{nis}` | `200 OK` | `{"success":true,"message":"Data updated successfully","data":{"nis":"..."}}` |
| 7 | `DELETE /api/siswa/{nis}` | `200 OK` | `{"success":true,"message":"Data deleted successfully"}` |

## Guru

| No | API | Status Kode | Response |
|---|---|---|---|
| 1 | `GET /api/guru/kelas-tersedia` | `200 OK` | `{"success":true,"message":"Data retrieved successfully","data":[...]}` |
| 2 | `GET /api/guru` | `200 OK` | `{"success":true,"message":"Data retrieved successfully","data":[...]}` |
| 3 | `POST /api/guru` | `201 Created` | `{"success":true,"message":"Data created successfully","data":{"nip":"..."}}` |
| 4 | `GET /api/guru/{nip}` | `200 OK` | `{"success":true,"message":"Data retrieved successfully","data":{"nip":"..."}}` |
| 5 | `PUT /api/guru/{nip}` | `200 OK` | `{"success":true,"message":"Data updated successfully","data":{"nip":"..."}}` |
| 6 | `DELETE /api/guru/{nip}` | `200 OK` | `{"success":true,"message":"Data deleted successfully"}` |
| 7 | `PATCH /api/guru/password` | `200 OK` | `{"success":true,"message":"Data updated successfully"}` |

## Kelas

| No | API | Status Kode | Response |
|---|---|---|---|
| 1 | `GET /api/kelas` | `200 OK` | `{"success":true,"message":"Data retrieved successfully","data":[...]}` |
| 2 | `POST /api/kelas` | `201 Created` | `{"success":true,"message":"Data created successfully","data":{"id":1}}` |
| 3 | `GET /api/kelas/{id}` | `200 OK` | `{"success":true,"message":"Data retrieved successfully","data":{"id":1}}` |
| 4 | `PUT /api/kelas/{id}` | `200 OK` | `{"success":true,"message":"Data updated successfully","data":{"id":1}}` |
| 5 | `DELETE /api/kelas/{id}` | `200 OK` | `{"success":true,"message":"Data deleted successfully"}` |

## Absensi

| No | API | Status Kode | Response |
|---|---|---|---|
| 1 | `POST /api/absensi/scan` | `201 Created` | `{"success":true,"message":"Data created successfully","data":{"status":"hadir"}}` |
| 2 | `POST /api/absensi/manual` | `201 Created` | `{"success":true,"message":"Data created successfully","data":{"status":"hadir"}}` |
| 3 | `POST /api/absensi/manual/bulk` | `201 Created` | `{"success":true,"message":"Data created successfully","data":{"processed":0}}` |
| 4 | `GET /api/absensi/kelas` | `200 OK` | `{"success":true,"message":"Data retrieved successfully","data":[...]}` |
| 5 | `GET /api/absensi/kelas/{kelasId}/siswa` | `200 OK` | `{"success":true,"message":"Data retrieved successfully","data":[...]}` |
| 6 | `GET /api/absensi/status/{nis}` | `200 OK` | `{"success":true,"message":"Data retrieved successfully","data":{"status":"..."}}` |
| 7 | `GET /api/absensi/riwayat/{nis}` | `200 OK` | `{"success":true,"message":"Data retrieved successfully","data":[...]}` |
| 8 | `GET /api/absensi/info-hari-ini` | `200 OK` | `{"success":true,"message":"Data retrieved successfully","data":{}}` |

## Produk

| No | API | Status Kode | Response |
|---|---|---|---|
| 1 | `GET /api/produk` | `200 OK` | `{"success":true,"data":[...]}` |
| 2 | `POST /api/produk` | `201 Created` | `{"success":true,"data":{"id":1}}` |
| 3 | `GET /api/produk/stats` | `200 OK` | `{"success":true,"data":{"total":0}}` |
| 4 | `GET /api/produk/kategori` | `200 OK` | `{"success":true,"data":[...]}` |
| 5 | `GET /api/produk/{id}` | `200 OK` | `{"success":true,"data":{"id":1}}` |
| 6 | `PATCH /api/produk/{id}` | `200 OK` | `{"success":true,"data":{"id":1}}` |
| 7 | `DELETE /api/produk/{id}` | `200 OK` | `{"success":true,"message":"Produk berhasil dinonaktifkan"}` |
| 8 | `PATCH /api/produk/{id}/stok` | `200 OK` | `{"success":true,"data":{"stok":0}}` |
| 9 | `PATCH /api/produk/{id}/reset-harian` | `200 OK` | `{"success":true,"data":{"stokHarian":0}}` |

## Transaksi

| No | API | Status Kode | Response |
|---|---|---|---|
| 1 | `GET /api/transaksi/siswa/list` | `200 OK` | `{"success":true,"data":[...]}` |
| 2 | `GET /api/transaksi/siswa` | `200 OK` | `{"success":true,"data":{"siswa":{},"voucher":[]}}` |
| 3 | `GET /api/transaksi/guru/list` | `200 OK` | `{"success":true,"data":[...]}` |
| 4 | `GET /api/transaksi/guru` | `200 OK` | `{"success":true,"data":{"guru":{}}}` |
| 5 | `GET /api/transaksi/voucher` | `200 OK` | `{"success":true,"data":{"valid":true}}` |
| 6 | `GET /api/transaksi/produk` | `200 OK` | `{"success":true,"data":[...]}` |
| 7 | `POST /api/transaksi` | `201 Created` | `{"success":true,"data":{"id":1,"total":0}}` |
| 8 | `GET /api/transaksi/kasbon` | `200 OK` | `{"success":true,"data":[...]}` |
| 9 | `POST /api/transaksi/kasbon/{id}/bayar` | `201 Created` | `{"success":true,"data":{"status":"lunas"}}` |

## Voucher

| No | API | Status Kode | Response |
|---|---|---|---|
| 1 | `GET /api/voucher/siswa-dropdown` | `200 OK` | `{"success":true,"message":"Data retrieved successfully","data":[...]}` |
| 2 | `GET /api/voucher` | `200 OK` | `{"success":true,"message":"Data retrieved successfully","data":[...]}` |
| 3 | `POST /api/voucher` | `201 Created` | `{"success":true,"message":"Data created successfully","data":{"id":1}}` |
| 4 | `GET /api/voucher/{id}` | `200 OK` | `{"success":true,"message":"Data retrieved successfully","data":{"id":1}}` |
| 5 | `PUT /api/voucher/{id}` | `200 OK` | `{"success":true,"message":"Data updated successfully","data":{"id":1}}` |
| 6 | `DELETE /api/voucher/{id}` | `200 OK` | `{"success":true,"message":"Data deleted successfully"}` |

## Leaderboard

| No | API | Status Kode | Response |
|---|---|---|---|
| 1 | `GET /api/leaderboard/kelas-saya` | `200 OK` | `{"success":true,"message":"Data retrieved successfully","data":[...]}` |
| 2 | `GET /api/leaderboard/antar-kelas` | `200 OK` | `{"success":true,"message":"Data retrieved successfully","data":[...]}` |
| 3 | `GET /api/leaderboard/sekolah` | `200 OK` | `{"success":true,"message":"Data retrieved successfully","data":[...]}` |
| 4 | `GET /api/leaderboard/antar-jenjang` | `200 OK` | `{"success":true,"message":"Data retrieved successfully","data":[...]}` |
| 5 | `GET /api/leaderboard/siswa-antar-jenjang` | `200 OK` | `{"success":true,"message":"Data retrieved successfully","data":[...]}` |
| 6 | `GET /api/leaderboard/export` | `200 OK` | `File PDF leaderboard berhasil diunduh.` |

## Pengaturan

| No | API | Status Kode | Response |
|---|---|---|---|
| 1 | `GET /api/pengaturan` | `200 OK` | `{"success":true,"message":"Data retrieved successfully","data":[...]}` |
| 2 | `PATCH /api/pengaturan` | `200 OK` | `{"success":true,"message":"Data updated successfully","data":[...]}` |
| 3 | `GET /api/pengaturan/{key}` | `200 OK` | `{"success":true,"message":"Data retrieved successfully","data":{"key":"..."}}` |
| 4 | `PATCH /api/pengaturan/{key}` | `200 OK` | `{"success":true,"message":"Data updated successfully","data":{"key":"..."}}` |
| 5 | `GET /api/pengaturan/libur/list` | `200 OK` | `{"success":true,"message":"Data retrieved successfully","data":[...]}` |
| 6 | `POST /api/pengaturan/libur` | `201 Created` | `{"success":true,"message":"Data created successfully","data":{"id":1}}` |
| 7 | `PATCH /api/pengaturan/libur/{id}` | `200 OK` | `{"success":true,"message":"Data updated successfully","data":{"id":1}}` |
| 8 | `DELETE /api/pengaturan/libur/{id}` | `200 OK` | `{"success":true,"message":"Data deleted successfully"}` |
| 9 | `PATCH /api/pengaturan/libur/{id}/toggle` | `200 OK` | `{"success":true,"message":"Data updated successfully","data":{"active":true}}` |
| 10 | `GET /api/pengaturan/pelanggaran/list` | `200 OK` | `{"success":true,"message":"Data retrieved successfully","data":[...]}` |
| 11 | `POST /api/pengaturan/pelanggaran` | `201 Created` | `{"success":true,"message":"Data created successfully","data":{"id":1}}` |
| 12 | `PATCH /api/pengaturan/pelanggaran/{id}` | `200 OK` | `{"success":true,"message":"Data updated successfully","data":{"id":1}}` |
| 13 | `DELETE /api/pengaturan/pelanggaran/{id}` | `200 OK` | `{"success":true,"message":"Data deleted successfully"}` |
| 14 | `PATCH /api/pengaturan/pelanggaran/{id}/toggle` | `200 OK` | `{"success":true,"message":"Data updated successfully","data":{"active":true}}` |
| 15 | `GET /api/pengaturan/achievement/list` | `200 OK` | `{"success":true,"message":"Data retrieved successfully","data":[...]}` |
| 16 | `POST /api/pengaturan/achievement` | `201 Created` | `{"success":true,"message":"Data created successfully","data":{"id":1}}` |
| 17 | `PATCH /api/pengaturan/achievement/{id}` | `200 OK` | `{"success":true,"message":"Data updated successfully","data":{"id":1}}` |
| 18 | `DELETE /api/pengaturan/achievement/{id}` | `200 OK` | `{"success":true,"message":"Data deleted successfully"}` |
| 19 | `PATCH /api/pengaturan/achievement/{id}/toggle` | `200 OK` | `{"success":true,"message":"Data updated successfully","data":{"active":true}}` |

## Pelanggaran

| No | API | Status Kode | Response |
|---|---|---|---|
| 1 | `GET /api/pelanggaran/kelas` | `200 OK` | `{"success":true,"message":"Data retrieved successfully","data":[...]}` |
| 2 | `GET /api/pelanggaran/kelas/{kelasId}/siswa` | `200 OK` | `{"success":true,"message":"Data retrieved successfully","data":[...]}` |
| 3 | `GET /api/pelanggaran/jenis` | `200 OK` | `{"success":true,"message":"Data retrieved successfully","data":[...]}` |
| 4 | `GET /api/pelanggaran/riwayat/saya` | `200 OK` | `{"success":true,"message":"Data retrieved successfully","data":[...]}` |
| 5 | `POST /api/pelanggaran` | `201 Created` | `{"success":true,"message":"Data created successfully","data":{"id":1}}` |
| 6 | `PATCH /api/pelanggaran/{id}/bukti` | `200 OK` | `{"success":true,"message":"Data updated successfully","data":{"id":1}}` |
| 7 | `PATCH /api/pelanggaran/{id}` | `200 OK` | `{"success":true,"message":"Data updated successfully","data":{"id":1}}` |
| 8 | `DELETE /api/pelanggaran/{id}` | `200 OK` | `{"success":true,"message":"Data deleted successfully"}` |

## Siswa Dashboard

| No | API | Status Kode | Response |
|---|---|---|---|
| 1 | `GET /api/dashboard/siswa` | `200 OK` | `{"success":true,"message":"Data retrieved successfully","data":{}}` |

## Guru Dashboard

| No | API | Status Kode | Response |
|---|---|---|---|
| 1 | `GET /api/guru/dashboard/profil` | `200 OK` | `{"success":true,"message":"Data retrieved successfully","data":{}}` |
| 2 | `GET /api/guru/dashboard/kelas` | `200 OK` | `{"success":true,"message":"Data retrieved successfully","data":[...]}` |
| 3 | `GET /api/guru/dashboard/statistik/{kelasId}` | `200 OK` | `{"success":true,"message":"Data retrieved successfully","data":{}}` |
| 4 | `GET /api/guru/dashboard/top-siswa/{kelasId}` | `200 OK` | `{"success":true,"message":"Data retrieved successfully","data":[...]}` |
| 5 | `GET /api/guru/dashboard/pelanggaran-terbaru` | `200 OK` | `{"success":true,"message":"Data retrieved successfully","data":[...]}` |
| 6 | `GET /api/guru/dashboard/riwayat-pelanggaran` | `200 OK` | `{"success":true,"message":"Data retrieved successfully","data":[...]}` |
| 7 | `GET /api/guru/dashboard/jenis-pelanggaran` | `200 OK` | `{"success":true,"message":"Data retrieved successfully","data":[...]}` |
| 8 | `POST /api/guru/dashboard/jenis-pelanggaran` | `201 Created` | `{"success":true,"message":"Data created successfully","data":{"id":1}}` |
| 9 | `PUT /api/guru/dashboard/jenis-pelanggaran/{id}` | `200 OK` | `{"success":true,"message":"Data updated successfully","data":{"id":1}}` |
| 10 | `DELETE /api/guru/dashboard/jenis-pelanggaran/{id}` | `200 OK` | `{"success":true,"message":"Data deleted successfully"}` |
| 11 | `PATCH /api/guru/dashboard/jenis-pelanggaran/{id}/toggle` | `200 OK` | `{"success":true,"message":"Data updated successfully","data":{"active":true}}` |
| 12 | `PATCH /api/guru/dashboard/pelanggaran/{id}/status` | `200 OK` | `{"success":true,"message":"Data updated successfully","data":{"status":"..."}}` |

## Kantin Dashboard

| No | API | Status Kode | Response |
|---|---|---|---|
| 1 | `GET /api/kantin/dashboard` | `200 OK` | `{"success":true,"data":{}}` |

## Admin Dashboard

| No | API | Status Kode | Response |
|---|---|---|---|
| 1 | `GET /api/admin/dashboard` | `200 OK` | `{"success":true,"message":"Data retrieved successfully","data":{}}` |

## Kantin

| No | API | Status Kode | Response |
|---|---|---|---|
| 1 | `GET /api/kantin` | `200 OK` | `{"success":true,"message":"Data retrieved successfully","data":[...]}` |
| 2 | `POST /api/kantin` | `201 Created` | `{"success":true,"message":"Data created successfully","data":{"id":1}}` |
| 3 | `GET /api/kantin/{id}` | `200 OK` | `{"success":true,"message":"Data retrieved successfully","data":{"id":1}}` |
| 4 | `PUT /api/kantin/{id}` | `200 OK` | `{"success":true,"message":"Data updated successfully","data":{"id":1}}` |
| 5 | `DELETE /api/kantin/{id}` | `200 OK` | `{"success":true,"message":"Data deleted successfully"}` |
| 6 | `PATCH /api/kantin/password` | `200 OK` | `{"success":true,"message":"Data updated successfully"}` |

## Riwayat

| No | API | Status Kode | Response |
|---|---|---|---|
| 1 | `GET /api/riwayat/semua` | `200 OK` | `{"success":true,"data":[...]}` |
| 2 | `GET /api/riwayat/tumbler` | `200 OK` | `{"success":true,"data":[...]}` |
| 3 | `GET /api/riwayat/belanja` | `200 OK` | `{"success":true,"data":[...]}` |
| 4 | `GET /api/riwayat/pelanggaran` | `200 OK` | `{"success":true,"data":[...]}` |
| 5 | `GET /api/riwayat/summary` | `200 OK` | `{"success":true,"data":{}}` |

## Profil

| No | API | Status Kode | Response |
|---|---|---|---|
| 1 | `GET /api/profil` | `200 OK` | `{"success":true,"message":"Profil berhasil diambil","data":{}}` |
| 2 | `PATCH /api/profil/foto` | `200 OK` | `{"success":true,"message":"Foto profil berhasil diupdate","data":{}}` |
| 3 | `PATCH /api/profil/password` | `200 OK` | `{"success":true,"message":"Password berhasil diubah"}` |
| 4 | `GET /api/profil/upload-url` | `200 OK` | `{"success":true,"message":"Signed upload URL berhasil dibuat","data":{}}` |

## Riwayat Kantin

| No | API | Status Kode | Response |
|---|---|---|---|
| 1 | `GET /api/riwayat` | `200 OK` | `{"success":true,"message":"Data retrieved successfully","data":[...]}` |
| 2 | `GET /api/riwayat/export` | `200 OK` | `{"success":true,"message":"Data retrieved successfully","data":[...]}` |
| 3 | `GET /api/riwayat/info-sekolah` | `200 OK` | `{"success":true,"data":{}}` |

## Analytics

| No | API | Status Kode | Response |
|---|---|---|---|
| 1 | `GET /api/analytics` | `200 OK` | `{"success":true,"data":{}}` |

## Izin

| No | API | Status Kode | Response |
|---|---|---|---|
| 1 | `GET /api/izin/kelas` | `200 OK` | `{"success":true,"message":"Data retrieved successfully","data":[...]}` |
| 2 | `GET /api/izin/siswa-belum-absen` | `200 OK` | `{"success":true,"message":"Data retrieved successfully","data":[...]}` |
| 3 | `GET /api/izin` | `200 OK` | `{"success":true,"message":"Data retrieved successfully","data":[...]}` |
| 4 | `POST /api/izin` | `201 Created` | `{"success":true,"message":"Data created successfully","data":{"id":1}}` |
| 5 | `POST /api/izin/batch` | `201 Created` | `{"success":true,"message":"Data created successfully","data":{"processed":0}}` |
| 6 | `PATCH /api/izin/{id}` | `200 OK` | `{"success":true,"message":"Data updated successfully","data":{"id":1}}` |
