# Panduan Membuat API Documentation Lengkap di Postman

## Pendekatan Terbaik

Cara paling rapi untuk membuat dokumentasi API yang lengkap di Postman pada backend ini adalah:

1. lengkapi dokumentasi endpoint di Swagger pada backend NestJS;
2. jalankan backend dan buka Swagger di `/api/docs`;
3. ekspor atau impor OpenAPI ke Postman;
4. rapikan collection, folder, authorization, example response, dan environment di Postman;
5. publish dokumentasi dari Postman jika diperlukan.

Karena project ini sudah memakai `@nestjs/swagger` dan sudah mengaktifkan Swagger di [main.ts](/d:/ALFI/TA/Projek/sehati-backend/src/main.ts:68), maka Anda tidak perlu membuat dokumentasi Postman dari nol.

## URL Swagger

Saat backend berjalan secara lokal:

```text
http://localhost:3001/api/docs
```

## Cara Membuat Dokumentasi di Postman

### 1. Jalankan backend

```bash
cd sehati-backend
npm run start:dev
```

### 2. Buka Swagger

Buka:

```text
http://localhost:3001/api/docs
```

Jika Swagger tampil, berarti spesifikasi API sudah tersedia.

### 3. Impor ke Postman

Di Postman:

1. klik `Import`;
2. pilih `Link`;
3. masukkan URL OpenAPI/Swagger jika tersedia, atau gunakan URL docs;
4. jika perlu, gunakan file OpenAPI hasil export;
5. Postman akan membuat collection otomatis berdasarkan endpoint.

Jika URL docs biasa tidak bisa diimpor langsung, gunakan export OpenAPI JSON terlebih dahulu dari Swagger/NestJS.

## Agar Dokumentasi Postman Menjadi Lengkap

Supaya hasil impor ke Postman benar-benar lengkap, setiap endpoint di backend sebaiknya memiliki anotasi Swagger berikut:

### Pada controller

```ts
@ApiTags('Authentication')
@ApiOperation({ summary: 'Login user' })
@ApiResponse({ status: 200, description: 'Login successful' })
@ApiResponse({ status: 401, description: 'Invalid credentials' })
@ApiBearerAuth('access-token')
@ApiParam({ name: 'id', example: 1 })
@ApiQuery({ name: 'limit', required: false, example: 10 })
```

### Pada DTO

```ts
export class LoginDto {
  @ApiProperty({ example: '1234567890' })
  identifier: string;

  @ApiProperty({ example: 'password123' })
  password: string;
}
```

Tanpa anotasi ini, Postman tetap bisa mengimpor endpoint, tetapi dokumentasinya tidak akan lengkap karena:

- nama modul bisa kurang rapi;
- deskripsi endpoint kosong;
- request body tidak terbaca jelas;
- contoh request/response tidak tersedia;
- query dan path param tidak terdokumentasi dengan baik.

## Struktur Collection Postman yang Disarankan

Di Postman, susun folder seperti ini:

1. `Authentication`
2. `Achievement`
3. `Siswa`
4. `Guru`
5. `Kelas`
6. `Absensi`
7. `Produk`
8. `Transaksi`
9. `Voucher`
10. `Leaderboard`
11. `Pengaturan`
12. `Pelanggaran`
13. `Siswa Dashboard`
14. `Guru Dashboard`
15. `Kantin Dashboard`
16. `Admin Dashboard`
17. `Kantin`
18. `Riwayat`
19. `Profil`
20. `Riwayat Kantin`
21. `Analytics`
22. `Izin`

## Environment Postman yang Disarankan

Buat environment dengan variabel:

```text
base_url = http://localhost:3001
admin_token =
guru_token =
siswa_token =
kantin_token =
```

Lalu untuk request gunakan:

```text
{{base_url}}/api/auth/login
```

Untuk endpoint login-protected gunakan header:

```text
Authorization: Bearer {{admin_token}}
```

atau sesuai role:

```text
Authorization: Bearer {{guru_token}}
Authorization: Bearer {{siswa_token}}
Authorization: Bearer {{kantin_token}}
```

## Contoh Dokumentasi Endpoint yang Baik di Postman

Contoh untuk `POST /api/auth/login`:

- Name: `Login`
- Method: `POST`
- URL: `{{base_url}}/api/auth/login`
- Body:

```json
{
  "identifier": "1234567890",
  "password": "password123"
}
```

- Description:

```text
Endpoint ini digunakan untuk melakukan autentikasi pengguna ke dalam sistem
dan mengembalikan token JWT yang digunakan untuk akses endpoint lain.
```

- Example Response:

```json
{
  "success": true,
  "message": "Login berhasil",
  "data": {
    "user": {},
    "token": "..."
  }
}
```

## Yang Perlu Dilengkapi di Backend Anda

Saat ini Swagger pada project sudah aktif, tetapi dokumentasinya belum lengkap untuk semua modul. Dari struktur kode, anotasi Swagger baru terlihat jelas pada modul `auth`, sedangkan banyak controller lain masih belum memiliki:

- `@ApiTags`
- `@ApiOperation`
- `@ApiResponse`
- `@ApiBody`
- `@ApiParam`
- `@ApiQuery`

Artinya, jika langsung impor ke Postman sekarang, collection memang bisa terbentuk, tetapi dokumentasinya belum akan lengkap dan rapi.

## Rekomendasi Paling Efektif

Urutan kerja yang paling efisien adalah:

1. lengkapi anotasi Swagger di seluruh controller dan DTO;
2. jalankan backend;
3. impor Swagger/OpenAPI ke Postman;
4. tambahkan example request dan example response di Postman;
5. kelompokkan request berdasarkan modul dan role;
6. publish documentation dari Postman.

## Kesimpulan

Untuk membuat API Documentation lengkap di Postman pada project ini, Anda tidak perlu menyusun semuanya secara manual. Gunakan Swagger backend sebagai sumber utama, lalu impor ke Postman. Namun agar hasilnya benar-benar lengkap, backend perlu dilengkapi anotasi Swagger pada semua endpoint dan DTO.

Jika diinginkan, langkah berikutnya saya bisa bantu:

1. menambahkan anotasi Swagger ke seluruh controller backend;
2. membuat file collection Postman awal berdasarkan semua endpoint yang ada;
3. membuat environment Postman untuk role `admin`, `guru`, `siswa`, dan `kantin`.
