@echo off
echo ========================================================
echo   AUTO GENERATE NESTJS STRUCTURE - TUMBLER REWARD API
echo ========================================================
echo.

:: --- 1. SETUP CORE & DATABASE ---
echo [1/5] Membuat Core Modules & Database...
call nest g module database
:: Kita buat service firebase dummy dulu, nanti diisi code
call nest g service database/firebase --flat --no-spec

:: Membuat folder Config & Common manual (karena bukan module)
if not exist "src\config" mkdir src\config
if not exist "src\utils" mkdir src\utils

:: Membuat struktur Common
if not exist "src\common\decorators" mkdir src\common\decorators
if not exist "src\common\guards" mkdir src\common\guards
if not exist "src\common\interfaces" mkdir src\common\interfaces
if not exist "src\common\enums" mkdir src\common\enums

:: --- 2. STANDARD FEATURE MODULES ---
echo.
echo [2/5] Membuat Standard Feature Modules (CRUD)...
:: Loop untuk module yang strukturnya standar (Module + Controller + Service + DTO)
for %%M in (auth siswa guru users kelas absensi produk transaksi voucher leaderboard pengaturan tanggal-libur) do (
    echo    Generating module: %%M...
    call nest g module modules/%%M
    call nest g controller modules/%%M --no-spec
    call nest g service modules/%%M --no-spec
    if not exist "src\modules\%%M\dto" mkdir src\modules\%%M\dto
)

:: --- 3. COMPLEX MODULE: PELANGGARAN ---
echo.
echo [3/5] Membuat Module Pelanggaran (Split Controller/Service)...
call nest g module modules/pelanggaran
:: Membuat folder sub-structure
if not exist "src\modules\pelanggaran\controllers" mkdir src\modules\pelanggaran\controllers
if not exist "src\modules\pelanggaran\services" mkdir src\modules\pelanggaran\services
if not exist "src\modules\pelanggaran\dto" mkdir src\modules\pelanggaran\dto

:: Generate controller & service spesifik
call nest g controller modules/pelanggaran/controllers/pelanggaran --flat --no-spec
call nest g controller modules/pelanggaran/controllers/jenis-pelanggaran --flat --no-spec
call nest g service modules/pelanggaran/services/pelanggaran --flat --no-spec
call nest g service modules/pelanggaran/services/jenis-pelanggaran --flat --no-spec

:: --- 4. COMPLEX MODULE: DASHBOARD ---
echo.
echo [4/5] Membuat Module Dashboard...
call nest g module modules/dashboard
if not exist "src\modules\dashboard\controllers" mkdir src\modules\dashboard\controllers
if not exist "src\modules\dashboard\services" mkdir src\modules\dashboard\services

:: Generate dashboard spesifik per role
call nest g controller modules/dashboard/controllers/siswa-dashboard --flat --no-spec
call nest g controller modules/dashboard/controllers/guru-dashboard --flat --no-spec
call nest g controller modules/dashboard/controllers/kantin-dashboard --flat --no-spec
call nest g controller modules/dashboard/controllers/admin-dashboard --flat --no-spec

call nest g service modules/dashboard/services/siswa-dashboard --flat --no-spec
call nest g service modules/dashboard/services/guru-dashboard --flat --no-spec
call nest g service modules/dashboard/services/kantin-dashboard --flat --no-spec
call nest g service modules/dashboard/services/admin-dashboard --flat --no-spec

:: --- 5. CLEANUP & FINISH ---
echo.
echo [5/5] Finishing up...
echo.
echo ========================================================
echo   SELESAI! Struktur folder telah dibuat.
echo   Silakan cek folder src/modules/
echo ========================================================
pause