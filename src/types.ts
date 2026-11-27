export type ExecutiveTier =
  | 'president'
  | 'vice_president_1'
  | 'vice_president_2'
  | 'manager'
  | 'assistant_manager'
  | 'secretary'
  | 'treasurer'
  | 'advisor';

export type StaffDepartment =
  | 'ฝ่ายบริหาร'
  | 'ฝ่ายธุรการ'
  | 'ฝ่ายสื่อสารองค์กร'
  | 'ฝ่ายปฏิบัติการ'
  | 'ฝ่ายรับบริจาค'
  | 'ฝ่ายอาคารสถานที่';

export type RescueUnitCode =
  | 'หัวหน้าฝ่ายกู้ชีพ'
  | '401'
  | '402'
  | '403'
  | '404'
  | '405'
  | '400'
  | 'ศูนย์วิทยุ';

export type ActivityCategory =
  | 'ช่วยเหลือผู้ประสบอัคคีภัย'
  | 'โครงการใจถึงใจช่วยผู้ป่วยติดเตียงและยากไร้'
  | 'ช่วยเหลือผู้ประสบภัยหนาว'
  | 'มอบโลงศพประชาชนทั่วไปและผู้ยากไร้'
  | 'มอบโลงศพประจำปี ปีละ 2 ครั้ง'
  | 'สงเคราะห์เผาศพผู้ยากไร้'
  | 'อบรมกู้ชีพ-CPR'
  | 'ปฏิบัติการกู้ชีพ-กู้ภัย';

export type GalleryCategory =
  | 'งานกู้ชีพ'
  | 'กู้ภัย'
  | 'อบรม'
  | 'งานประจำปี'
  | 'ช่วยเหลือประชาชน'
  | 'ผู้บริจาค';

export type DonationPurpose =
  | 'รถพยาบาล'
  | 'อุปกรณ์การแพทย์'
  | 'ช่วยเหลือผู้ประสบภัย'
  | 'ทุนฝึกอบรมกู้ชีพ'
  | 'ทั่วไป';

export type DonationChannel =
  | 'QR e-Donation'
  | 'QR พร้อมเพย์'
  | 'โอนธนาคารกสิกรไทย'
  | 'เงินสด';

export type AdminRole =
  | 'Super Admin'
  | 'Admin'
  | 'ประชาสัมพันธ์'
  | 'การเงิน'
  | 'หัวหน้ากู้ชีพ';

export interface SiteSettings {
  foundationName: string;
  foundationSubtitle: string;
  logoUrl: string;
  heroBannerUrl: string;
  heroTitle: string;
  heroSubtitle: string;
  heroCtaPrimary: string;
  emergencyPhone: string;
  emergencyPhoneSecondary: string;
  linePhone: string;
  email: string;
  address: string;
  facebookUrl: string;
  lineUrl: string;
  websiteUrl: string;
  mapsUrl: string;
  mapsLat: number;
  mapsLng: number;
  aboutTitle: string;
  aboutDescription: string;
  aboutMission: string;
  aboutVision: string;
  aboutImageUrl: string;
  donationGoal: number;
  bankName: string;
  bankBranch: string;
  bankAccountNumber: string;
  bankAccountName: string;
  qrEdonationUrl: string;
  qrPromptpayUrl: string;
  qrPromptpayRef: string;
}

export interface Executive {
  id: string;
  name: string;
  roleTier: ExecutiveTier;
  positionTitle: string;
  bio: string;
  contact: string;
  photoUrl: string;
  sortOrder: number;
}

export interface StaffMember {
  id: string;
  employeeCode: string;
  name: string;
  position: string;
  department: StaffDepartment;
  phone: string;
  email: string;
  photoUrl: string;
  systemRole: string;
  sortOrder: number;
}

export interface RescuePersonnel {
  id: string;
  officerCode: string;
  name: string;
  emtLevel: string;
  position: string;
  unit: RescueUnitCode;
  shift: string;
  ambulanceCode: string;
  radioCallsign: string;
  phone: string;
  photoUrl: string;
  sortOrder: number;
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  content: string;
  coverImageUrl: string;
  galleryUrls: string[];
  pdfUrl: string;
  publishedAt: string;
  isPublished: boolean;
  isApproved: boolean;
  authorName: string;
}

export interface ActivityItem {
  id: string;
  title: string;
  description: string;
  category: ActivityCategory;
  eventDate: string;
  location: string;
  participantCount: number;
  mapUrl: string;
  galleryUrls: string[];
}

export interface AnnualEvent {
  id: string;
  title: string;
  description: string;
  eventDate: string;
  endDate: string;
  location: string;
  isPinned: boolean;
  imageUrl: string;
  pdfUrl: string;
}

export interface DonationRecord {
  id: string;
  receiptNo: string;
  donorName: string;
  amount: number;
  purpose: DonationPurpose;
  channel: DonationChannel;
  donatedAt: string;
  slipUrl: string;
  status: 'pending' | 'verified' | 'rejected';
  note: string;
}

export interface GalleryItem {
  id: string;
  title: string;
  category: GalleryCategory;
  imageUrl: string;
  uploadedAt: string;
}

export interface VolunteerApplication {
  id: string;
  fullName: string;
  nationalId: string;
  birthDate: string;
  address: string;
  phone: string;
  email: string;
  skills: string;
  documentUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  adminNote: string;
}

export interface ContactMessage {
  id: string;
  type: 'contact' | 'emergency';
  name: string;
  phone: string;
  email: string;
  subject: string;
  details: string;
  location: string;
  status: 'new' | 'in_progress' | 'resolved';
  submittedAt: string;
  adminNote: string;
}

export interface MonthlyStat {
  id: string;
  monthLabel: string;
  yearBe: number;
  emsCases: number;
  rescueCases: number;
  reliefCases: number;
}

export interface AdminUserPublic {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: AdminRole;
  twoFactorEnabled: boolean;
  active: boolean;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  actor: string;
  role: string;
  action: string;
  target: string;
  timestamp: string;
}

export interface PublicAppState {
  settings: SiteSettings;
  executives: Executive[];
  staff: StaffMember[];
  rescuePersonnel: RescuePersonnel[];
  news: NewsItem[];
  activities: ActivityItem[];
  annualEvents: AnnualEvent[];
  donations: DonationRecord[];
  gallery: GalleryItem[];
  monthlyStats: MonthlyStat[];
  visitorCount: number;
  lastUpdatedAt: string;
}

export interface AdminAppState extends PublicAppState {
  volunteers: VolunteerApplication[];
  contacts: ContactMessage[];
  adminUsers: AdminUserPublic[];
  auditLogs: AuditLogEntry[];
}

export type PublicPageId =
  | 'home'
  | 'about'
  | 'executives'
  | 'org-chart'
  | 'staff'
  | 'rescue'
  | 'news'
  | 'activities'
  | 'annual-events'
  | 'donations'
  | 'gallery'
  | 'volunteer'
  | 'contact';

export type AdminSectionId =
  | 'dashboard'
  | 'settings'
  | 'executives'
  | 'staff'
  | 'rescue'
  | 'news'
  | 'activities'
  | 'annual-events'
  | 'donations'
  | 'gallery'
  | 'volunteers'
  | 'contacts'
  | 'users'
  | 'architecture';
