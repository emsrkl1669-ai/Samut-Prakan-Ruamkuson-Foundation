import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type {
  SiteSettings,
  Executive,
  StaffMember,
  RescuePersonnel,
  NewsItem,
  ActivityItem,
  AnnualEvent,
  DonationRecord,
  GalleryItem,
  VolunteerApplication,
  ContactMessage,
  MonthlyStat,
  AdminUserPublic,
  AdminRole,
  AuditLogEntry,
  PublicAppState,
  AdminAppState,
} from '../src/types.ts';
import {
  DEFAULT_SETTINGS,
  INITIAL_EXECUTIVES,
  INITIAL_STAFF,
  INITIAL_RESCUE,
  INITIAL_GALLERY,
  INITIAL_ACTIVITIES,
  INITIAL_MONTHLY_STATS,
} from './seed.ts';

export interface AdminUserStored extends AdminUserPublic {
  passwordHash: string;
  passwordSalt: string;
}

export interface FullDatabase {
  settings: SiteSettings;
  executives: Executive[];
  staff: StaffMember[];
  rescuePersonnel: RescuePersonnel[];
  news: NewsItem[];
  activities: ActivityItem[];
  annualEvents: AnnualEvent[];
  donations: DonationRecord[];
  gallery: GalleryItem[];
  volunteers: VolunteerApplication[];
  contacts: ContactMessage[];
  monthlyStats: MonthlyStat[];
  adminUsers: AdminUserStored[];
  auditLogs: AuditLogEntry[];
  visitorCount: number;
  lastUpdatedAt: string;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const BACKUP_DIR = path.resolve(DATA_DIR, 'backups');
const DB_FILE = path.resolve(DATA_DIR, 'foundation-db.json');

function ensureDirs(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

export function hashPassword(password: string, existingSalt?: string): { hash: string; salt: string } {
  const salt = existingSalt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  if (!hash || !salt) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const storedBuf = Buffer.from(hash, 'hex');
  if (derived.length !== storedBuf.length) return false;
  return crypto.timingSafeEqual(derived, storedBuf);
}

function createInitialDb(): FullDatabase {
  return {
    settings: { ...DEFAULT_SETTINGS },
    executives: [...INITIAL_EXECUTIVES],
    staff: [...INITIAL_STAFF],
    rescuePersonnel: [...INITIAL_RESCUE],
    news: [],
    activities: [...INITIAL_ACTIVITIES],
    annualEvents: [],
    donations: [],
    gallery: [...INITIAL_GALLERY],
    volunteers: [],
    contacts: [],
    monthlyStats: [...INITIAL_MONTHLY_STATS],
    adminUsers: [],
    auditLogs: [],
    visitorCount: 0,
    lastUpdatedAt: new Date().toISOString(),
  };
}

let cachedDb: FullDatabase | null = null;

export function loadDb(): FullDatabase {
  if (cachedDb) return cachedDb;
  ensureDirs();
  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      const parsed = JSON.parse(raw) as Partial<FullDatabase>;
      const base = createInitialDb();
      cachedDb = {
        ...base,
        ...parsed,
        settings: { ...base.settings, ...(parsed.settings || {}) },
        executives: Array.isArray(parsed.executives) ? parsed.executives : base.executives,
        staff: Array.isArray(parsed.staff) ? parsed.staff : base.staff,
        rescuePersonnel: Array.isArray(parsed.rescuePersonnel) ? parsed.rescuePersonnel : base.rescuePersonnel,
        news: Array.isArray(parsed.news) ? parsed.news : base.news,
        activities: Array.isArray(parsed.activities) ? parsed.activities : base.activities,
        annualEvents: Array.isArray(parsed.annualEvents) ? parsed.annualEvents : base.annualEvents,
        donations: Array.isArray(parsed.donations) ? parsed.donations : base.donations,
        gallery: Array.isArray(parsed.gallery) ? parsed.gallery : base.gallery,
        volunteers: Array.isArray(parsed.volunteers) ? parsed.volunteers : base.volunteers,
        contacts: Array.isArray(parsed.contacts) ? parsed.contacts : base.contacts,
        monthlyStats: Array.isArray(parsed.monthlyStats) && parsed.monthlyStats.length > 0 ? parsed.monthlyStats : base.monthlyStats,
        adminUsers: Array.isArray(parsed.adminUsers) ? parsed.adminUsers : [],
        auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : [],
        visitorCount: typeof parsed.visitorCount === 'number' ? parsed.visitorCount : 0,
        lastUpdatedAt: parsed.lastUpdatedAt || new Date().toISOString(),
      };
      return cachedDb;
    } catch {
      cachedDb = createInitialDb();
      saveDb(cachedDb);
      return cachedDb;
    }
  }
  cachedDb = createInitialDb();
  saveDb(cachedDb);
  return cachedDb;
}

export function saveDb(db: FullDatabase): void {
  ensureDirs();
  db.lastUpdatedAt = new Date().toISOString();
  cachedDb = db;
  const tmpFile = `${DB_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(db, null, 2), 'utf8');
  fs.renameSync(tmpFile, DB_FILE);
}

export function createBackupSnapshot(): string {
  ensureDirs();
  const db = loadDb();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.resolve(BACKUP_DIR, `backup-${stamp}.json`);
  // Strip password hashes from downloadable backup? Keep structure clean or mask hashes
  const safeDb = toAdminState(db);
  fs.writeFileSync(backupFile, JSON.stringify(safeDb, null, 2), 'utf8');
  // Retain up to 15 latest backups
  const files = fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith('backup-') && f.endsWith('.json'))
    .sort()
    .reverse();
  for (const oldFile of files.slice(15)) {
    fs.unlinkSync(path.resolve(BACKUP_DIR, oldFile));
  }
  return backupFile;
}

export function addAuditLog(
  db: FullDatabase,
  actor: string,
  role: AdminRole | string,
  action: string,
  target: string
): void {
  db.auditLogs.unshift({
    id: `log-${crypto.randomUUID()}`,
    actor,
    role,
    action,
    target,
    timestamp: new Date().toISOString(),
  });
  if (db.auditLogs.length > 300) {
    db.auditLogs = db.auditLogs.slice(0, 300);
  }
}

export function toPublicState(db: FullDatabase): PublicAppState {
  return {
    settings: db.settings,
    executives: [...db.executives].sort((a, b) => a.sortOrder - b.sortOrder),
    staff: [...db.staff].sort((a, b) => a.sortOrder - b.sortOrder),
    rescuePersonnel: [...db.rescuePersonnel].sort((a, b) => a.sortOrder - b.sortOrder),
    news: db.news.filter((n) => n.isPublished && n.isApproved),
    activities: db.activities,
    annualEvents: db.annualEvents,
    donations: db.donations
      .filter((d) => d.status === 'verified')
      .map((d) => ({ ...d, slipUrl: '' })),
    gallery: db.gallery,
    monthlyStats: db.monthlyStats,
    visitorCount: db.visitorCount,
    lastUpdatedAt: db.lastUpdatedAt,
  };
}

export function toAdminState(db: FullDatabase): AdminAppState {
  return {
    settings: db.settings,
    executives: [...db.executives].sort((a, b) => a.sortOrder - b.sortOrder),
    staff: [...db.staff].sort((a, b) => a.sortOrder - b.sortOrder),
    rescuePersonnel: [...db.rescuePersonnel].sort((a, b) => a.sortOrder - b.sortOrder),
    news: db.news,
    activities: db.activities,
    annualEvents: db.annualEvents,
    donations: db.donations,
    gallery: db.gallery,
    volunteers: db.volunteers,
    contacts: db.contacts,
    monthlyStats: db.monthlyStats,
    adminUsers: db.adminUsers.map(({ passwordHash: _h, passwordSalt: _s, ...pub }) => pub),
    auditLogs: db.auditLogs,
    visitorCount: db.visitorCount,
    lastUpdatedAt: db.lastUpdatedAt,
  };
}
