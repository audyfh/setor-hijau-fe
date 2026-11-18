export type UserRole = "pengelola" | "nasabah";

export interface AuthUser {
  id: string;
  username: string;
  email?: string;
  full_name: string;
  role: UserRole;
  bank_sampah_id: string;
  bank_sampah_code?: string;
  bank_sampah_name?: string;
  rw?: string;
  rt?: string;
  phone?: string;
  is_active?: boolean;
}

export interface TenantProfile {
  id: string;
  name: string;
  code: string;
  address: string;
  rw: string;
  rt?: string;
  kelurahan: string;
  kecamatan: string;
  kabupaten_kota: string;
  provinsi: string;
  contact_phone?: string;
}

export interface AuthTokenPairResponse {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  token_type?: string;
  user?: AuthUser;
  tenant?: TenantProfile;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: AuthUser | null;
  tenant: TenantProfile | null;
}

export interface RegisterTenantRequest {
  name: string;
  code: string;
  address: string;
  rw: string;
  rt?: string;
  kelurahan: string;
  kecamatan: string;
  kabupaten_kota: string;
  provinsi: string;
  contact_phone?: string;
  pengelola_username: string;
  pengelola_email: string;
  pengelola_password: string;
  pengelola_full_name: string;
  pengelola_phone?: string;
}

export interface LoginRequest {
  identifier: string;
  password: string;
  bank_sampah_code?: string;
}

export interface QRLoginRequest {
  qr_token: string;
  pin: string;
}

export interface ResetPasswordRequest {
  token: string;
  new_password: string;
}
