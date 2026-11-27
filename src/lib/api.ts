import type {
  PublicAppState,
  AdminAppState,
  AdminRole,
  StaffMember,
} from '../types';

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

export interface AuthStatusResponse {
  needsSetup: boolean;
  hasEnvPasscode: boolean;
  authenticated: boolean;
  user: {
    id: string;
    username: string;
    fullName: string;
    role: AdminRole;
  } | null;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function apiRequest<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (authToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let msg = `เกิดข้อผิดพลาด (${res.status})`;
    try {
      const data = await res.json();
      if (data?.error) msg = data.error;
    } catch {
      // ignore json parse failure
    }
    if (res.status === 401 && !url.startsWith('/api/auth/')) {
      authToken = null;
      onUnauthorized?.();
    }
    throw new ApiError(msg, res.status);
  }

  return res.json() as Promise<T>;
}

export async function uploadAdminFile(file: File): Promise<{ url: string; filename: string }> {
  const fd = new FormData();
  fd.append('file', file);
  return apiRequest<{ url: string; filename: string }>('/api/upload', {
    method: 'POST',
    body: fd,
  });
}

export async function uploadAdminMultipleFiles(
  files: File[]
): Promise<{ files: { url: string; filename: string }[] }> {
  const fd = new FormData();
  for (const f of files) {
    fd.append('files', f);
  }
  return apiRequest<{ files: { url: string; filename: string }[] }>('/api/upload-multiple', {
    method: 'POST',
    body: fd,
  });
}

export async function uploadPublicFile(
  endpoint: '/api/public/upload-slip' | '/api/public/upload-doc',
  file: File
): Promise<{ url: string; filename: string }> {
  const fd = new FormData();
  fd.append('file', file);
  return apiRequest<{ url: string; filename: string }>(endpoint, {
    method: 'POST',
    body: fd,
  });
}

export async function fetchPublicState(countVisit = false): Promise<PublicAppState> {
  const q = countVisit ? '?countVisit=1' : '';
  return apiRequest<PublicAppState>(`/api/public/state${q}`);
}

export async function fetchAdminState(): Promise<AdminAppState> {
  return apiRequest<AdminAppState>('/api/admin/state');
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('th-TH').format(amount);
}

const THAI_MONTHS = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
];

export function formatThaiDate(dateStr?: string): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  const day = d.getDate();
  const month = THAI_MONTHS[d.getMonth()];
  const yearBe = d.getFullYear() + 543;
  return `${day} ${month} ${yearBe}`;
}

export function isSafeUrl(url?: string): boolean {
  if (!url) return false;
  if (url.startsWith('/assets/') || url.startsWith('/uploads/')) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function exportStaffToExcelCsv(staff: StaffMember[]): void {
  const headers = ['รหัสพนักงาน', 'ชื่อ-สกุล', 'ตำแหน่ง', 'แผนก', 'เบอร์โทรศัพท์', 'อีเมล', 'สิทธิ์ในระบบ'];
  const rows = staff.map((s) => [
    s.employeeCode,
    s.name,
    s.position,
    s.department,
    s.phone,
    s.email,
    s.systemRole,
  ]);

  const escapeCell = (val: string) => `"${String(val || '').replace(/"/g, '""')}"`;
  const csvContent =
    '\uFEFF' + [headers.map(escapeCell).join(','), ...rows.map((r) => r.map(escapeCell).join(','))].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `รายชื่อพนักงาน-มูลนิธิร่วมกุศลสมุทรปราการ-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const POSITION_PRESETS = [
  'ผู้จัดการมูลนิธิร่วมกุศลสมุทรปราการ',
  'ผู้ช่วยผู้จัดการ',
  'ผู้จัดการ-การเงิน/เลขานุการ',
  'ผู้ช่วยจัดการ-ฝ่ายกู้ชีพ กู้ภัย',
  'เจ้าหน้าที่บัญชี/ธุรการ',
  'เจ้าหน้าที่สังคมสงเคราะห์/ธุรการ',
  'เจ้าหน้าที่ฝ่ายสโตร์/ธุรการ',
  'เจ้าหน้าที่ฝ่ายรับบริจาค',
  'เจ้าหน้าที่ประชาสัมพันธ์ / สื่อสารองค์กร',
  'หัวหน้าชุดปฏิบัติการ งานกู้ชีพ-กู้ภัย',
  'ผู้ช่วยหัวหน้าชุดปฏิบัติการ งานกู้ชีพ-กู้ภัย',
  'เจ้าหน้าที่กู้ชีพ / EMT',
  'เจ้าหน้าที่กู้ภัย',
  'เจ้าหน้าที่ห้องวิทยุ',
  'เจ้าหน้าที่ขับรถบริการ',
  'แม่บ้าน',
  'เจ้าหน้าที่รักษาความปลอดภัย',
];
