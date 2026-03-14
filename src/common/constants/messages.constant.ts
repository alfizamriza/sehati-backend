/**
 * Success Messages
 */
export const SUCCESS_MESSAGES = {
  // Auth
  LOGIN_SUCCESS: 'Login berhasil',
  REGISTER_SUCCESS: 'Registrasi berhasil',
  LOGOUT_SUCCESS: 'Logout berhasil',
  
  // Generic CRUD
  CREATED: 'Data berhasil dibuat',
  UPDATED: 'Data berhasil diperbarui',
  DELETED: 'Data berhasil dihapus',
  RETRIEVED: 'Data berhasil diambil',
  RETRIEVED_LIST: 'Daftar data berhasil diambil',

  // Siswa
  SISWA_CREATED: 'Siswa berhasil ditambahkan',
  SISWA_UPDATED: 'Siswa berhasil diperbarui',
  SISWA_DELETED: 'Siswa berhasil dihapus',

  // Guru
  GURU_CREATED: 'Guru berhasil ditambahkan',
  GURU_UPDATED: 'Guru berhasil diperbarui',
  GURU_DELETED: 'Guru berhasil dihapus',

  // Kelas
  KELAS_CREATED: 'Kelas berhasil dibuat',
  KELAS_UPDATED: 'Kelas berhasil diperbarui',
  KELAS_DELETED: 'Kelas berhasil dihapus',

  // Voucher
  VOUCHER_CREATED: 'Voucher berhasil dibuat',
  VOUCHER_UPDATED: 'Voucher berhasil diperbarui',
  VOUCHER_DELETED: 'Voucher berhasil dihapus',
  VOUCHER_REDEEMED: 'Voucher berhasil ditukar',
};

/**
 * Error Messages
 */
export const ERROR_MESSAGES = {
  // Auth
  INVALID_CREDENTIALS: 'Kredensial tidak valid',
  UNAUTHORIZED: 'Tidak terotorisasi',
  FORBIDDEN: 'Akses ditolak',
  TOKEN_EXPIRED: 'Token telah kadaluarsa',
  TOKEN_INVALID: 'Token tidak valid',
  
  // Validation
  VALIDATION_ERROR: 'Validasi gagal',
  REQUIRED_FIELD: '{field} wajib diisi',
  INVALID_FORMAT: 'Format {field} tidak valid',
  
  // Database
  NOT_FOUND: 'Data tidak ditemukan',
  DUPLICATE_ENTRY: 'Data sudah ada',
  DATABASE_ERROR: 'Kesalahan database',
  
  // File
  FILE_NOT_FOUND: 'File tidak ditemukan',
  FILE_TOO_LARGE: 'Ukuran file terlalu besar',
  INVALID_FILE_TYPE: 'Jenis file tidak didukung',
  
  // Business Logic
  INSUFFICIENT_BALANCE: 'Saldo tidak cukup',
  OPERATION_NOT_ALLOWED: 'Operasi tidak diizinkan',
  INVALID_PARAMETERS: 'Parameter tidak valid',
  
  // Server
  INTERNAL_ERROR: 'Kesalahan server internal',
  SERVICE_UNAVAILABLE: 'Layanan tidak tersedia',
};

/**
 * Validation Messages
 */
export const VALIDATION_MESSAGES = {
  NIS_REQUIRED: 'NIS harus diisi',
  NIS_LENGTH: 'NIS harus 10-20 karakter',
  NIP_REQUIRED: 'NIP harus diisi',
  NAME_REQUIRED: 'Nama harus diisi',
  PASSWORD_REQUIRED: 'Password harus diisi',
  PASSWORD_MIN: 'Password minimal 6 karakter',
  EMAIL_REQUIRED: 'Email harus diisi',
  EMAIL_INVALID: 'Email tidak valid',
  KELAS_REQUIRED: 'Kelas harus dipilih',
  ROLE_REQUIRED: 'Role harus ditentukan',
};

/**
 * HTTP Status Codes
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

/**
 * Error Codes
 */
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  DATABASE_ERROR: 'DATABASE_ERROR',
  FILE_ERROR: 'FILE_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
};
