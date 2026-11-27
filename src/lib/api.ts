import type {
  PublicAppState,
  AdminAppState,
  AdminRole,
  StaffMember,
  DonationRecord,
} from '../types';

let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
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
    throw new Error(msg);
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

export function printDonationReceipt(donation: DonationRecord, foundationName: string, address: string, phone: string): void {
  const win = window.open('', '_blank', 'width=820,height=680');
  if (!win) return;

  const esc = (s: string) =>
    String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  win.document.write(`<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8" />
<title>ใบรับเงินบริจาค ${esc(donation.receiptNo)}</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;600;700&display=swap" rel="stylesheet" />
<style>
  body { font-family: 'Noto Sans Thai', sans-serif; color: #0f172a; margin: 40px; line-height: 1.6; }
  .box { border: 2px solid #0b1f3a; padding: 32px; max-width: 720px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 24px; }
  .title { font-size: 20px; font-weight: 700; color: #0b1f3a; }
  .sub { font-size: 13px; color: #475569; }
  .receipt-no { text-align: right; font-size: 14px; }
  .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
  .amount-box { background: #f8fafc; border: 1px solid #cbd5e1; padding: 16px; margin: 20px 0; display: flex; justify-content: space-between; align-items: center; }
  .amount { font-size: 24px; font-weight: 700; color: #c81e1e; }
  .footer { margin-top: 40px; display: flex; justify-content: space-between; font-size: 13px; color: #475569; }
  .sign { text-align: center; width: 220px; border-top: 1px solid #94a3b8; padding-top: 8px; margin-top: 48px; }
  @media print { button { display: none; } body { margin: 0; } }
</style>
</head>
<body>
  <div class="box">
    <div class="header">
      <div>
        <div class="title">${esc(foundationName)}</div>
        <div class="sub">${esc(address)}</div>
        <div class="sub">โทรศัพท์ ${esc(phone)}</div>
      </div>
      <div class="receipt-no">
        <div style="font-weight:700;color:#c81e1e;">ใบสำคัญรับเงินบริจาค</div>
        <div>เลขที่: <strong>${esc(donation.receiptNo)}</strong></div>
        <div>วันที่: ${esc(formatThaiDate(donation.donatedAt))}</div>
      </div>
    </div>
    <div class="row"><span>ได้รับเงินบริจาคจาก</span><strong>${esc(donation.donorName)}</strong></div>
    <div class="row"><span>วัตถุประสงค์การบริจาค</span><strong>${esc(donation.purpose)}</strong></div>
    <div class="row"><span>ช่องทางการบริจาค</span><strong>${esc(donation.channel)}</strong></div>
    <div class="row"><span>สถานะการตรวจสอบ</span><strong>${donation.status === 'verified' ? 'ตรวจสอบแล้ว' : 'รอตรวจสอบ'}</strong></div>
    <div class="amount-box">
      <span>จำนวนเงินบริจาคทั้งสิ้น</span>
      <span class="amount">${formatCurrency(donation.amount)} บาท</span>
    </div>
    <div class="footer">
      <div>ขออนุโมทนาบุญในจิตอันเป็นกุศลของท่าน</div>
      <div class="sign">เจ้าหน้าที่การเงิน / ผู้รับเงิน</div>
    </div>
  </div>
  <div style="text-align:center;margin-top:20px;">
    <button onclick="window.print()" style="padding:10px 24px;background:#0b1f3a;color:#fff;border:none;border-radius:6px;cursor:pointer;font-family:inherit;">พิมพ์ / บันทึกเป็น PDF</button>
  </div>
</body>
</html>`);
  win.document.close();
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
