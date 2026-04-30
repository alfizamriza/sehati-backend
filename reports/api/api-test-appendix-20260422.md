# Lampiran Endpoint API Backend

Lampiran ini berisi daftar endpoint backend yang dikelompokkan berdasarkan modul. Setiap endpoint dilengkapi metode HTTP, hak akses, body request utama, dan fungsi endpoint.

Keterangan:

- `-` pada kolom `Body Request` berarti endpoint tidak memerlukan body request.
- `Query/Param` ditulis pada kolom fungsi bila endpoint menggunakan parameter URL atau query string.
- Hak akses disusun berdasarkan implementasi controller backend saat ini.

## Authentication

| No | API | Method | Hak Akses | Body Request | Fungsi |
|---|---|---|---|---|---|
| 1 | `/api/auth/login` | `POST` | `Publik` | `identifier, password` | Melakukan login ke dalam sistem dan mengembalikan token autentikasi. |
| 2 | `/api/auth/register/admin` | `POST` | `Publik` | `nama, email, password` | Mendaftarkan akun admin baru ke dalam sistem. |
| 3 | `/api/auth/profile` | `GET` | `Semua role login` | `-` | Mengambil data profil pengguna yang sedang login. |
| 4 | `/api/auth/logout` | `POST` | `Semua role login` | `-` | Mengakhiri sesi login pengguna. |
| 5 | `/api/auth/login-logs` | `GET` | `Admin` | `-` | Menampilkan riwayat aktivitas login pengguna. |

## Achievement

| No | API | Method | Hak Akses | Body Request | Fungsi |
|---|---|---|---|---|---|
| 1 | `/api/achievement/undisplayed` | `GET` | `Siswa` | `-` | Menampilkan achievement siswa yang belum pernah ditampilkan. |
| 2 | `/api/achievement/mark-displayed` | `POST` | `Siswa` | `achievementIds` | Menandai achievement tertentu sebagai sudah ditampilkan. |
| 3 | `/api/achievement/unlocked` | `GET` | `Siswa` | `-` | Menampilkan daftar achievement yang telah terbuka. |
| 4 | `/api/achievement/showcase-options` | `GET` | `Siswa` | `-` | Menampilkan pilihan achievement untuk ditampilkan pada profil siswa. |
| 5 | `/api/achievement/showcase-note` | `GET` | `Siswa` | `-` | Mengambil catatan showcase achievement aktif milik siswa. |
| 6 | `/api/achievement/showcase-note` | `POST` | `Siswa` | `note, achievementId` | Menambah atau memperbarui catatan showcase achievement. |
| 7 | `/api/achievement/showcase-note` | `DELETE` | `Siswa` | `-` | Menghapus catatan showcase achievement siswa. |

## Siswa

| No | API | Method | Hak Akses | Body Request | Fungsi |
|---|---|---|---|---|---|
| 1 | `/api/siswa/import-template` | `GET` | `Admin` | `-` | Mengunduh template file impor data siswa. |
| 2 | `/api/siswa/import` | `POST` | `Admin` | `file` | Mengimpor data siswa dari file Excel atau CSV. |
| 3 | `/api/siswa` | `GET` | `Admin` | `-` | Menampilkan seluruh data siswa. |
| 4 | `/api/siswa` | `POST` | `Admin` | `nis, nama, kelas, password, poin` | Menambahkan data siswa baru. |
| 5 | `/api/siswa/{nis}` | `GET` | `Admin` | `-` | Menampilkan detail siswa berdasarkan NIS. |
| 6 | `/api/siswa/{nis}` | `PUT` | `Admin` | `nama, kelas, password, poin` | Memperbarui data siswa berdasarkan NIS. |
| 7 | `/api/siswa/{nis}` | `DELETE` | `Admin` | `-` | Menghapus data siswa berdasarkan NIS. |

## Guru

| No | API | Method | Hak Akses | Body Request | Fungsi |
|---|---|---|---|---|---|
| 1 | `/api/guru/kelas-tersedia` | `GET` | `Admin` | `-` | Menampilkan daftar kelas yang tersedia untuk guru. |
| 2 | `/api/guru` | `GET` | `Admin` | `-` | Menampilkan seluruh data guru. |
| 3 | `/api/guru` | `POST` | `Admin` | `nip, nama, kelas_id, password` | Menambahkan data guru baru. |
| 4 | `/api/guru/{nip}` | `GET` | `Admin` | `-` | Menampilkan detail guru berdasarkan NIP. |
| 5 | `/api/guru/{nip}` | `PUT` | `Admin` | `nama, kelas_id, status` | Memperbarui data guru berdasarkan NIP. |
| 6 | `/api/guru/{nip}` | `DELETE` | `Admin` | `-` | Menghapus data guru berdasarkan NIP. |
| 7 | `/api/guru/password` | `PATCH` | `Guru` | `passwordLama, passwordBaru` | Mengubah password akun guru. |

## Kelas

| No | API | Method | Hak Akses | Body Request | Fungsi |
|---|---|---|---|---|---|
| 1 | `/api/kelas` | `GET` | `Admin, Guru` | `-` | Menampilkan daftar kelas. |
| 2 | `/api/kelas` | `POST` | `Admin` | `namaKelas, waliKelas, jenjang` | Menambahkan data kelas baru. |
| 3 | `/api/kelas/{id}` | `GET` | `Admin, Guru` | `-` | Menampilkan detail kelas berdasarkan ID. |
| 4 | `/api/kelas/{id}` | `PUT` | `Admin` | `namaKelas, waliKelas, jenjang` | Memperbarui data kelas berdasarkan ID. |
| 5 | `/api/kelas/{id}` | `DELETE` | `Admin` | `-` | Menghapus data kelas berdasarkan ID. |

## Absensi

| No | API | Method | Hak Akses | Body Request | Fungsi |
|---|---|---|---|---|---|
| 1 | `/api/absensi/scan` | `POST` | `Guru, Siswa` | `nis, qrCode, waktu` | Mencatat absensi berdasarkan hasil pemindaian. |
| 2 | `/api/absensi/manual` | `POST` | `Guru, Siswa` | `nis, status, tanggal` | Mencatat absensi secara manual untuk satu siswa. |
| 3 | `/api/absensi/manual/bulk` | `POST` | `Guru, Siswa` | `kelasId, daftarSiswa` | Mencatat absensi manual untuk banyak siswa sekaligus. |
| 4 | `/api/absensi/kelas` | `GET` | `Guru, Admin, Siswa` | `-` | Menampilkan daftar kelas terkait absensi. |
| 5 | `/api/absensi/kelas/{kelasId}/siswa` | `GET` | `Guru, Admin, Siswa` | `-` | Menampilkan daftar siswa dalam kelas tertentu untuk absensi. |
| 6 | `/api/absensi/status/{nis}` | `GET` | `Guru, Admin, Siswa` | `-` | Menampilkan status absensi siswa berdasarkan NIS. |
| 7 | `/api/absensi/riwayat/{nis}` | `GET` | `Guru, Admin, Siswa` | `-` | Menampilkan riwayat absensi siswa berdasarkan NIS. |
| 8 | `/api/absensi/info-hari-ini` | `GET` | `Guru, Admin, Siswa` | `-` | Menampilkan ringkasan informasi absensi hari ini. |

## Produk

| No | API | Method | Hak Akses | Body Request | Fungsi |
|---|---|---|---|---|---|
| 1 | `/api/produk` | `GET` | `Kantin` | `-` | Menampilkan daftar produk milik kantin. |
| 2 | `/api/produk` | `POST` | `Kantin` | `nama, harga, stok, kategori` | Menambahkan produk baru. |
| 3 | `/api/produk/stats` | `GET` | `Kantin` | `-` | Menampilkan statistik data produk kantin. |
| 4 | `/api/produk/kategori` | `GET` | `Kantin` | `-` | Menampilkan daftar kategori produk. |
| 5 | `/api/produk/{id}` | `GET` | `Kantin` | `-` | Menampilkan detail produk berdasarkan ID. |
| 6 | `/api/produk/{id}` | `PATCH` | `Kantin` | `nama, harga, stok, kategori` | Memperbarui data produk berdasarkan ID. |
| 7 | `/api/produk/{id}` | `DELETE` | `Kantin` | `-` | Menonaktifkan atau menghapus produk berdasarkan ID. |
| 8 | `/api/produk/{id}/stok` | `PATCH` | `Kantin` | `stok` | Memperbarui stok produk. |
| 9 | `/api/produk/{id}/reset-harian` | `PATCH` | `Kantin` | `stokHarian` | Mereset stok harian produk. |

## Transaksi

| No | API | Method | Hak Akses | Body Request | Fungsi |
|---|---|---|---|---|---|
| 1 | `/api/transaksi/siswa/list` | `GET` | `Kantin` | `-` | Menampilkan daftar siswa untuk kebutuhan transaksi. |
| 2 | `/api/transaksi/siswa` | `GET` | `Kantin` | `-` | Menampilkan detail siswa berdasarkan query `nis`. |
| 3 | `/api/transaksi/guru/list` | `GET` | `Kantin` | `-` | Menampilkan daftar guru untuk kebutuhan transaksi. |
| 4 | `/api/transaksi/guru` | `GET` | `Kantin` | `-` | Menampilkan detail guru berdasarkan query `nip`. |
| 5 | `/api/transaksi/voucher` | `GET` | `Kantin` | `-` | Memvalidasi voucher berdasarkan query `kode` dan `nis`. |
| 6 | `/api/transaksi/produk` | `GET` | `Kantin` | `-` | Menampilkan katalog produk aktif yang tersedia untuk transaksi. |
| 7 | `/api/transaksi` | `POST` | `Kantin` | `items, nis, metodePembayaran, voucher` | Membuat transaksi pembelian baru. |
| 8 | `/api/transaksi/kasbon` | `GET` | `Kantin` | `-` | Menampilkan daftar transaksi kasbon. |
| 9 | `/api/transaksi/kasbon/{id}/bayar` | `POST` | `Kantin` | `nominalBayar` | Melunasi transaksi kasbon berdasarkan ID. |

## Voucher

| No | API | Method | Hak Akses | Body Request | Fungsi |
|---|---|---|---|---|---|
| 1 | `/api/voucher/siswa-dropdown` | `GET` | `Admin` | `-` | Menampilkan daftar siswa untuk pilihan penerima voucher. |
| 2 | `/api/voucher` | `GET` | `Admin` | `-` | Menampilkan seluruh data voucher. |
| 3 | `/api/voucher` | `POST` | `Admin` | `kode, nominal, siswaId, masaBerlaku` | Menambahkan voucher baru. |
| 4 | `/api/voucher/{id}` | `GET` | `Admin` | `-` | Menampilkan detail voucher berdasarkan ID. |
| 5 | `/api/voucher/{id}` | `PUT` | `Admin` | `kode, nominal, status, masaBerlaku` | Memperbarui data voucher berdasarkan ID. |
| 6 | `/api/voucher/{id}` | `DELETE` | `Admin` | `-` | Menghapus voucher berdasarkan ID. |

## Leaderboard

| No | API | Method | Hak Akses | Body Request | Fungsi |
|---|---|---|---|---|---|
| 1 | `/api/leaderboard/kelas-saya` | `GET` | `Semua role login` | `-` | Menampilkan leaderboard kelas pengguna atau kelas tertentu. |
| 2 | `/api/leaderboard/antar-kelas` | `GET` | `Semua role login` | `-` | Menampilkan leaderboard antar kelas. |
| 3 | `/api/leaderboard/sekolah` | `GET` | `Semua role login` | `-` | Menampilkan leaderboard tingkat sekolah. |
| 4 | `/api/leaderboard/antar-jenjang` | `GET` | `Semua role login` | `-` | Menampilkan leaderboard antar jenjang. |
| 5 | `/api/leaderboard/siswa-antar-jenjang` | `GET` | `Semua role login` | `-` | Menampilkan leaderboard siswa antar jenjang. |
| 6 | `/api/leaderboard/export` | `GET` | `Guru, Admin` | `-` | Mengekspor data leaderboard ke file PDF. |

## Pengaturan

| No | API | Method | Hak Akses | Body Request | Fungsi |
|---|---|---|---|---|---|
| 1 | `/api/pengaturan` | `GET` | `Publik` | `-` | Menampilkan seluruh konfigurasi pengaturan umum sistem. |
| 2 | `/api/pengaturan` | `PATCH` | `Tanpa guard di controller` | `items` | Memperbarui beberapa pengaturan sekaligus. |
| 3 | `/api/pengaturan/{key}` | `GET` | `Publik` | `-` | Menampilkan detail pengaturan berdasarkan key. |
| 4 | `/api/pengaturan/{key}` | `PATCH` | `Tanpa guard di controller` | `value` | Memperbarui satu pengaturan berdasarkan key. |
| 5 | `/api/pengaturan/libur/list` | `GET` | `Tanpa guard di controller` | `-` | Menampilkan daftar tanggal libur. |
| 6 | `/api/pengaturan/libur` | `POST` | `Tanpa guard di controller` | `tanggal, keterangan` | Menambahkan tanggal libur baru. |
| 7 | `/api/pengaturan/libur/{id}` | `PATCH` | `Tanpa guard di controller` | `tanggal, keterangan, aktif` | Memperbarui data tanggal libur. |
| 8 | `/api/pengaturan/libur/{id}` | `DELETE` | `Tanpa guard di controller` | `-` | Menghapus data tanggal libur. |
| 9 | `/api/pengaturan/libur/{id}/toggle` | `PATCH` | `Tanpa guard di controller` | `-` | Mengubah status aktif tanggal libur. |
| 10 | `/api/pengaturan/pelanggaran/list` | `GET` | `Tanpa guard di controller` | `-` | Menampilkan daftar jenis pelanggaran. |
| 11 | `/api/pengaturan/pelanggaran` | `POST` | `Tanpa guard di controller` | `nama, kategori, poin` | Menambahkan jenis pelanggaran baru. |
| 12 | `/api/pengaturan/pelanggaran/{id}` | `PATCH` | `Tanpa guard di controller` | `nama, kategori, poin, aktif` | Memperbarui jenis pelanggaran berdasarkan ID. |
| 13 | `/api/pengaturan/pelanggaran/{id}` | `DELETE` | `Tanpa guard di controller` | `-` | Menghapus jenis pelanggaran berdasarkan ID. |
| 14 | `/api/pengaturan/pelanggaran/{id}/toggle` | `PATCH` | `Tanpa guard di controller` | `-` | Mengubah status aktif jenis pelanggaran. |
| 15 | `/api/pengaturan/achievement/list` | `GET` | `Tanpa guard di controller` | `-` | Menampilkan daftar achievement. |
| 16 | `/api/pengaturan/achievement` | `POST` | `Tanpa guard di controller` | `nama, tipe, target, reward` | Menambahkan achievement baru. |
| 17 | `/api/pengaturan/achievement/{id}` | `PATCH` | `Tanpa guard di controller` | `nama, tipe, target, reward, aktif` | Memperbarui achievement berdasarkan ID. |
| 18 | `/api/pengaturan/achievement/{id}` | `DELETE` | `Tanpa guard di controller` | `-` | Menghapus achievement berdasarkan ID. |
| 19 | `/api/pengaturan/achievement/{id}/toggle` | `PATCH` | `Tanpa guard di controller` | `-` | Mengubah status aktif achievement. |

## Pelanggaran

| No | API | Method | Hak Akses | Body Request | Fungsi |
|---|---|---|---|---|---|
| 1 | `/api/pelanggaran/kelas` | `GET` | `Guru, Admin, Siswa` | `-` | Menampilkan daftar kelas terkait pencatatan pelanggaran. |
| 2 | `/api/pelanggaran/kelas/{kelasId}/siswa` | `GET` | `Guru, Admin, Siswa` | `-` | Menampilkan daftar siswa dalam kelas tertentu. |
| 3 | `/api/pelanggaran/jenis` | `GET` | `Guru, Admin, Siswa` | `-` | Menampilkan daftar jenis pelanggaran aktif. |
| 4 | `/api/pelanggaran/riwayat/saya` | `GET` | `Guru, Admin, Siswa` | `-` | Menampilkan riwayat pelanggaran pengguna saat ini. |
| 5 | `/api/pelanggaran` | `POST` | `Guru, Admin, Siswa` | `nis, jenisPelanggaranId, deskripsi` | Menambahkan data pelanggaran siswa. |
| 6 | `/api/pelanggaran/{id}/bukti` | `PATCH` | `Guru, Admin, Siswa` | `buktiFoto` | Memperbarui bukti foto pelanggaran. |
| 7 | `/api/pelanggaran/{id}` | `PATCH` | `Guru, Admin, Siswa` | `status, deskripsi, tindakLanjut` | Memperbarui data pelanggaran. |
| 8 | `/api/pelanggaran/{id}` | `DELETE` | `Guru, Admin, Siswa` | `-` | Menghapus data pelanggaran berdasarkan ID. |

## Siswa Dashboard

| No | API | Method | Hak Akses | Body Request | Fungsi |
|---|---|---|---|---|---|
| 1 | `/api/dashboard/siswa` | `GET` | `Siswa` | `-` | Menampilkan ringkasan dashboard untuk siswa. |

## Guru Dashboard

| No | API | Method | Hak Akses | Body Request | Fungsi |
|---|---|---|---|---|---|
| 1 | `/api/guru/dashboard/profil` | `GET` | `Guru` | `-` | Menampilkan informasi profil pada dashboard guru. |
| 2 | `/api/guru/dashboard/kelas` | `GET` | `Guru` | `-` | Menampilkan daftar kelas pada dashboard guru. |
| 3 | `/api/guru/dashboard/statistik/{kelasId}` | `GET` | `Guru` | `-` | Menampilkan statistik kelas tertentu. |
| 4 | `/api/guru/dashboard/top-siswa/{kelasId}` | `GET` | `Guru` | `-` | Menampilkan daftar siswa terbaik dalam kelas. |
| 5 | `/api/guru/dashboard/pelanggaran-terbaru` | `GET` | `Guru` | `-` | Menampilkan data pelanggaran terbaru. |
| 6 | `/api/guru/dashboard/riwayat-pelanggaran` | `GET` | `Guru` | `-` | Menampilkan riwayat pelanggaran pada dashboard guru. |
| 7 | `/api/guru/dashboard/jenis-pelanggaran` | `GET` | `Guru` | `-` | Menampilkan daftar jenis pelanggaran pada dashboard guru. |
| 8 | `/api/guru/dashboard/jenis-pelanggaran` | `POST` | `Guru` | `nama, kategori, poin` | Menambahkan jenis pelanggaran baru dari dashboard guru. |
| 9 | `/api/guru/dashboard/jenis-pelanggaran/{id}` | `PUT` | `Guru` | `nama, kategori, poin` | Memperbarui jenis pelanggaran berdasarkan ID. |
| 10 | `/api/guru/dashboard/jenis-pelanggaran/{id}` | `DELETE` | `Guru` | `-` | Menghapus jenis pelanggaran berdasarkan ID. |
| 11 | `/api/guru/dashboard/jenis-pelanggaran/{id}/toggle` | `PATCH` | `Guru` | `-` | Mengubah status aktif jenis pelanggaran. |
| 12 | `/api/guru/dashboard/pelanggaran/{id}/status` | `PATCH` | `Guru` | `status` | Memperbarui status pelanggaran siswa. |

## Kantin Dashboard

| No | API | Method | Hak Akses | Body Request | Fungsi |
|---|---|---|---|---|---|
| 1 | `/api/kantin/dashboard` | `GET` | `Kantin` | `-` | Menampilkan ringkasan dashboard kantin. |

## Admin Dashboard

| No | API | Method | Hak Akses | Body Request | Fungsi |
|---|---|---|---|---|---|
| 1 | `/api/admin/dashboard` | `GET` | `Admin` | `-` | Menampilkan ringkasan dashboard admin. |

## Kantin

| No | API | Method | Hak Akses | Body Request | Fungsi |
|---|---|---|---|---|---|
| 1 | `/api/kantin` | `GET` | `Admin` | `-` | Menampilkan daftar data kantin. |
| 2 | `/api/kantin` | `POST` | `Admin` | `namaKantin, pemilik, password` | Menambahkan data kantin baru. |
| 3 | `/api/kantin/{id}` | `GET` | `Admin` | `-` | Menampilkan detail kantin berdasarkan ID. |
| 4 | `/api/kantin/{id}` | `PUT` | `Admin` | `namaKantin, pemilik, status` | Memperbarui data kantin berdasarkan ID. |
| 5 | `/api/kantin/{id}` | `DELETE` | `Admin` | `-` | Menghapus data kantin berdasarkan ID. |
| 6 | `/api/kantin/password` | `PATCH` | `Kantin` | `passwordLama, passwordBaru` | Mengubah password akun kantin. |

## Riwayat

| No | API | Method | Hak Akses | Body Request | Fungsi |
|---|---|---|---|---|---|
| 1 | `/api/riwayat/semua` | `GET` | `Siswa` | `-` | Menampilkan seluruh riwayat aktivitas siswa. |
| 2 | `/api/riwayat/tumbler` | `GET` | `Siswa` | `-` | Menampilkan riwayat penggunaan tumbler siswa. |
| 3 | `/api/riwayat/belanja` | `GET` | `Siswa` | `-` | Menampilkan riwayat transaksi belanja siswa. |
| 4 | `/api/riwayat/pelanggaran` | `GET` | `Siswa` | `-` | Menampilkan riwayat pelanggaran siswa. |
| 5 | `/api/riwayat/summary` | `GET` | `Siswa` | `-` | Menampilkan ringkasan riwayat aktivitas siswa. |

## Profil

| No | API | Method | Hak Akses | Body Request | Fungsi |
|---|---|---|---|---|---|
| 1 | `/api/profil` | `GET` | `Siswa` | `-` | Menampilkan profil lengkap siswa yang sedang login. |
| 2 | `/api/profil/foto` | `PATCH` | `Siswa` | `fotoUrl` | Memperbarui foto profil siswa. |
| 3 | `/api/profil/password` | `PATCH` | `Siswa` | `passwordLama, passwordBaru` | Mengubah password akun siswa. |
| 4 | `/api/profil/upload-url` | `GET` | `Siswa` | `-` | Membuat signed URL untuk upload foto profil. |

## Riwayat Kantin

| No | API | Method | Hak Akses | Body Request | Fungsi |
|---|---|---|---|---|---|
| 1 | `/api/riwayat` | `GET` | `Kantin` | `-` | Menampilkan riwayat transaksi kantin. |
| 2 | `/api/riwayat/export` | `GET` | `Kantin` | `-` | Mengekspor data riwayat transaksi kantin. |
| 3 | `/api/riwayat/info-sekolah` | `GET` | `Kantin` | `-` | Menampilkan informasi sekolah untuk kebutuhan laporan riwayat. |

## Analytics

| No | API | Method | Hak Akses | Body Request | Fungsi |
|---|---|---|---|---|---|
| 1 | `/api/analytics` | `GET` | `Semua role login` | `-` | Menampilkan data analitik berdasarkan periode tertentu. |

## Izin

| No | API | Method | Hak Akses | Body Request | Fungsi |
|---|---|---|---|---|---|
| 1 | `/api/izin/kelas` | `GET` | `Tanpa guard di controller` | `-` | Menampilkan daftar kelas untuk kebutuhan input izin. |
| 2 | `/api/izin/siswa-belum-absen` | `GET` | `Tanpa guard di controller` | `-` | Menampilkan daftar siswa yang belum absen pada tanggal tertentu. |
| 3 | `/api/izin` | `GET` | `Tanpa guard di controller` | `-` | Menampilkan daftar data izin siswa. |
| 4 | `/api/izin` | `POST` | `Tanpa guard di controller` | `siswaId, jenisIzin, tanggal, keterangan` | Menambahkan data izin baru. |
| 5 | `/api/izin/batch` | `POST` | `Tanpa guard di controller` | `kelasId, siswaIds, jenisIzin, tanggal` | Menambahkan data izin untuk beberapa siswa sekaligus. |
| 6 | `/api/izin/{id}` | `PATCH` | `Tanpa guard di controller` | `status, catatan` | Memperbarui status izin berdasarkan ID. |
