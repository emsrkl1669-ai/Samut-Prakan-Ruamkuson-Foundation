import express, { type Request, type Response, type NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import multer from 'multer';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import {
  loadDb,
  saveDb,
  hashPassword,
  verifyPassword,
  addAuditLog,
  toPublicState,
  toAdminState,
  createBackupSnapshot,
} from './server/db.ts';
import type {
  AdminRole,
  AdminUserPublic,
  Executive,
  StaffMember,
  RescuePersonnel,
  NewsItem,
  ActivityItem,
  AnnualEvent,
  DonationRecord,
  GalleryItem,
  MonthlyStat,
} from './src/types.ts';

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;
const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Ephemeral fallback secret if SESSION_SECRET isn't configured in env
const SESSION_SECRET =
  process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 16
    ? process.env.SESSION_SECRET
    : crypto.randomBytes(32).toString('hex');

interface TokenPayload {
  sub: string;
  username: string;
  fullName: string;
  role: AdminRole;
  exp: number;
}

interface AuthedRequest extends Request {
  adminUser?: TokenPayload;
}

function signToken(payload: Omit<TokenPayload, 'exp'>): string {
  const fullPayload: TokenPayload = {
    ...payload,
    exp: Date.now() + 1000 * 60 * 60 * 12, // 12 hours
  };
  const body = Buffer.from(JSON.stringify(fullPayload), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function verifyToken(token: string): TokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(body).digest('base64url');
  const a = Buffer.from(sig, 'utf8');
  const b = Buffer.from(expectedSig, 'utf8');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as TokenPayload;
    if (!parsed.exp || parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

function extractBearer(req: Request): string | null {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.slice(7).trim();
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const token = extractBearer(req);
  if (!token) {
    res.status(401).json({ error: 'กรุณาเข้าสู่ระบบผู้ดูแลระบบ' });
    return;
  }
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: 'เซสชันหมดอายุหรือไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่' });
    return;
  }
  req.adminUser = payload;
  next();
}

function requireRole(allowedRoles: AdminRole[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction): void => {
    if (!req.adminUser) {
      res.status(401).json({ error: 'ไม่ได้รับอนุญาต' });
      return;
    }
    if (req.adminUser.role === 'Super Admin' || allowedRoles.includes(req.adminUser.role)) {
      next();
      return;
    }
    res.status(403).json({ error: 'สิทธิ์การใช้งานของท่านไม่สามารถเข้าถึงส่วนนี้ได้' });
  };
}

function sanitizeUrl(input: unknown): string {
  if (typeof input !== 'string') return '';
  const trimmed = input.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('/assets/') || trimmed.startsWith('/uploads/')) return trimmed;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return trimmed;
    }
    return '';
  } catch {
    return '';
  }
}

function sanitizeString(input: unknown, maxLen = 4000): string {
  if (typeof input !== 'string') return '';
  return input.trim().slice(0, maxLen);
}

function timingSafeStringEqual(aStr: string, bStr: string): boolean {
  const aHash = crypto.createHash('sha256').update(aStr, 'utf8').digest();
  const bHash = crypto.createHash('sha256').update(bStr, 'utf8').digest();
  return crypto.timingSafeEqual(aHash, bHash);
}

const VALID_ROLES = new Set<AdminRole>([
  'Super Admin',
  'Admin',
  'ประชาสัมพันธ์',
  'การเงิน',
  'หัวหน้ากู้ชีพ',
]);

// SSE Client Registry
const sseClients = new Set<Response>();

function broadcastSync(section: string): void {
  const payload = JSON.stringify({
    type: 'sync',
    section,
    timestamp: new Date().toISOString(),
  });
  for (const client of sseClients) {
    try {
      client.write(`event: sync\ndata: ${payload}\n\n`);
    } catch {
      sseClients.delete(client);
    }
  }
}

// Safe Multer File Upload Config
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);
const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.pdf']);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ALLOWED_EXT.has(ext) ? ext : '.bin';
    const name = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}${safeExt}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_MIME.has(file.mimetype) && ALLOWED_EXT.has(ext)) {
      cb(null, true);
    } else {
      cb(new Error('อนุญาตเฉพาะไฟล์รูปภาพ (JPG, PNG, WEBP) และไฟล์ PDF ขนาดไม่เกิน 10MB'));
    }
  },
});

async function startServer(): Promise<void> {
  loadDb();

  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '5mb' }));

  // Serve uploaded files safely with path confinement
  app.get('/uploads/:filename', (req, res) => {
    const rawName = path.basename(req.params.filename || '');
    const resolved = path.resolve(UPLOAD_DIR, rawName);
    if (!resolved.startsWith(UPLOAD_DIR + path.sep) || !fs.existsSync(resolved)) {
      res.status(404).json({ error: 'ไม่พบไฟล์' });
      return;
    }
    res.sendFile(resolved);
  });

  // Real-Time Server-Sent Events (SSE) endpoint
  app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const hello = JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() });
    res.write(`event: connected\ndata: ${hello}\n\n`);
    sseClients.add(res);

    const keepAlive = setInterval(() => {
      try {
        res.write(`: keepalive\n\n`);
      } catch {
        clearInterval(keepAlive);
        sseClients.delete(res);
      }
    }, 25000);

    req.on('close', () => {
      clearInterval(keepAlive);
      sseClients.delete(res);
    });
  });

  // ==========================
  // AUTHENTICATION ENDPOINTS
  // ==========================
  app.get('/api/auth/status', (req, res) => {
    const db = loadDb();
    const hasEnvPasscode = Boolean(process.env.ADMIN_PASSCODE && process.env.ADMIN_PASSCODE.trim());
    const needsSetup = db.adminUsers.length === 0 && !hasEnvPasscode;

    const token = extractBearer(req);
    const payload = token ? verifyToken(token) : null;
    res.json({
      needsSetup,
      hasEnvPasscode,
      authenticated: Boolean(payload),
      user: payload
        ? {
            id: payload.sub,
            username: payload.username,
            fullName: payload.fullName,
            role: payload.role,
          }
        : null,
    });
  });

  // First-run atomic Super Admin bootstrap (locked once claimed or when ADMIN_PASSCODE is set)
  app.post('/api/auth/bootstrap', (req, res) => {
    const db = loadDb();
    const hasEnvPasscode = Boolean(process.env.ADMIN_PASSCODE && process.env.ADMIN_PASSCODE.trim());
    if (db.adminUsers.length > 0 || hasEnvPasscode) {
      res.status(403).json({ error: 'ระบบได้ตั้งค่าผู้ดูแลระบบหลักเรียบร้อยแล้ว' });
      return;
    }

    const username = sanitizeString(req.body.username, 80) || 'admin';
    const fullName = sanitizeString(req.body.fullName, 120) || 'ผู้ดูแลระบบหลัก';
    const email = sanitizeString(req.body.email, 120) || db.settings.email;
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    if (password.length < 8) {
      res.status(400).json({ error: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' });
      return;
    }

    const { hash, salt } = hashPassword(password);
    const newUser = {
      id: `admin-${crypto.randomUUID()}`,
      username,
      fullName,
      email,
      role: 'Super Admin' as AdminRole,
      active: true,
      createdAt: new Date().toISOString(),
      passwordHash: hash,
      passwordSalt: salt,
    };

    db.adminUsers.push(newUser);
    addAuditLog(db, fullName, 'Super Admin', 'ตั้งค่าผู้ดูแลระบบหลักครั้งแรก', username);
    saveDb(db);

    const token = signToken({
      sub: newUser.id,
      username: newUser.username,
      fullName: newUser.fullName,
      role: newUser.role,
    });

    res.json({
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        fullName: newUser.fullName,
        role: newUser.role,
      },
    });
  });

  app.post('/api/auth/login', (req, res) => {
    const db = loadDb();
    const identifier = sanitizeString(req.body.username, 120);
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    const envPasscode = (process.env.ADMIN_PASSCODE || '').trim();

    // Check env passcode override first (timing-safe comparison)
    if (envPasscode && password.length > 0 && timingSafeStringEqual(password, envPasscode)) {
      const superAdmin =
        db.adminUsers.find((u) => u.role === 'Super Admin' && u.active) || {
          id: 'env-super-admin',
          username: identifier || 'superadmin',
          fullName: 'ผู้ดูแลระบบสูงสุด (Env)',
          role: 'Super Admin' as AdminRole,
        };
      const token = signToken({
        sub: superAdmin.id,
        username: superAdmin.username,
        fullName: superAdmin.fullName,
        role: 'Super Admin',
      });
      addAuditLog(db, superAdmin.fullName, 'Super Admin', 'เข้าสู่ระบบด้วยรหัสผ่านหลัก', superAdmin.username);
      saveDb(db);
      res.json({
        token,
        user: {
          id: superAdmin.id,
          username: superAdmin.username,
          fullName: superAdmin.fullName,
          role: 'Super Admin',
        },
      });
      return;
    }

    const user = db.adminUsers.find(
      (u) =>
        u.active &&
        (u.username.toLowerCase() === identifier.toLowerCase() ||
          u.email.toLowerCase() === identifier.toLowerCase())
    );

    if (!user || !verifyPassword(password, user.passwordHash, user.passwordSalt)) {
      res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
      return;
    }

    const token = signToken({
      sub: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
    });
    addAuditLog(db, user.fullName, user.role, 'เข้าสู่ระบบหลังบ้าน', user.username);
    saveDb(db);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
      },
    });
  });

  app.post('/api/auth/forgot-password', (req, res) => {
    const db = loadDb();
    const email = sanitizeString(req.body.email, 120);
    const recoveryPasscode = typeof req.body.recoveryPasscode === 'string' ? req.body.recoveryPasscode : '';
    const newPassword = typeof req.body.newPassword === 'string' ? req.body.newPassword : '';
    const envPasscode = (process.env.ADMIN_PASSCODE || '').trim();

    if (!email || !newPassword || newPassword.length < 8) {
      res.status(400).json({ error: 'กรุณาระบุอีเมลและรหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)' });
      return;
    }

    if (!envPasscode) {
      res.status(400).json({
        error: 'กรุณาติดต่อผู้ดูแลระบบหลัก (Super Admin) เพื่อรีเซ็ตรหัสผ่าน หรือกำหนดค่า ADMIN_PASSCODE บนเซิร์ฟเวอร์',
      });
      return;
    }

    if (!timingSafeStringEqual(recoveryPasscode, envPasscode)) {
      res.status(403).json({ error: 'รหัสผ่านกู้คืนระบบไม่ถูกต้อง' });
      return;
    }

    const user = db.adminUsers.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() || u.username.toLowerCase() === email.toLowerCase()
    );
    if (!user) {
      res.status(404).json({ error: 'ไม่พบบัญชีผู้ใช้งานนี้' });
      return;
    }

    const { hash, salt } = hashPassword(newPassword);
    user.passwordHash = hash;
    user.passwordSalt = salt;
    addAuditLog(db, user.fullName, user.role, 'รีเซ็ตรหัสผ่านผ่านรหัสกู้คืน', user.username);
    saveDb(db);
    res.json({ ok: true, message: 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว' });
  });

  // ==========================
  // PUBLIC READ & SUBMIT APIs
  // ==========================
  app.get('/api/public/state', (req, res) => {
    const db = loadDb();
    if (req.query.countVisit === '1') {
      db.visitorCount += 1;
      saveDb(db);
    }
    res.json(toPublicState(db));
  });

  app.post('/api/public/upload-slip', upload.single('file'), (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: 'ไม่พบไฟล์ที่อัปโหลด' });
      return;
    }
    res.json({ url: `/uploads/${req.file.filename}`, filename: req.file.originalname });
  });

  app.post('/api/public/upload-doc', upload.single('file'), (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: 'ไม่พบไฟล์ที่อัปโหลด' });
      return;
    }
    res.json({ url: `/uploads/${req.file.filename}`, filename: req.file.originalname });
  });

  app.post('/api/public/donations', (req, res) => {
    const db = loadDb();
    const donorName = sanitizeString(req.body.donorName, 160);
    const amount = Number(req.body.amount);
    const purpose = sanitizeString(req.body.purpose, 100) as DonationRecord['purpose'];
    const channel = sanitizeString(req.body.channel, 100) as DonationRecord['channel'];
    const slipUrl = sanitizeUrl(req.body.slipUrl);
    const note = sanitizeString(req.body.note, 500);

    if (!donorName || !Number.isFinite(amount) || amount <= 0) {
      res.status(400).json({ error: 'กรุณาระบุชื่อผู้บริจาคและจำนวนเงินให้ถูกต้อง' });
      return;
    }

    const record: DonationRecord = {
      id: `don-${crypto.randomUUID()}`,
      receiptNo: `RKL-${new Date().getFullYear() + 543}-${String(db.donations.length + 1).padStart(4, '0')}`,
      donorName,
      amount,
      purpose: purpose || 'ทั่วไป',
      channel: channel || 'QR e-Donation',
      donatedAt: new Date().toISOString().slice(0, 10),
      slipUrl,
      status: 'pending',
      note,
    };

    db.donations.unshift(record);
    saveDb(db);
    broadcastSync('donations');
    res.status(201).json(record);
  });

  app.post('/api/public/volunteers', (req, res) => {
    const db = loadDb();
    const fullName = sanitizeString(req.body.fullName, 160);
    const nationalId = sanitizeString(req.body.nationalId, 30);
    const birthDate = sanitizeString(req.body.birthDate, 30);
    const address = sanitizeString(req.body.address, 500);
    const phone = sanitizeString(req.body.phone, 40);
    const email = sanitizeString(req.body.email, 120);
    const skills = sanitizeString(req.body.skills, 500);
    const documentUrl = sanitizeUrl(req.body.documentUrl);

    if (!fullName || !nationalId || !phone || !address) {
      res.status(400).json({ error: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน' });
      return;
    }

    const item = {
      id: `vol-${crypto.randomUUID()}`,
      fullName,
      nationalId,
      birthDate,
      address,
      phone,
      email,
      skills,
      documentUrl,
      status: 'pending' as const,
      submittedAt: new Date().toISOString(),
      adminNote: '',
    };

    db.volunteers.unshift(item);
    saveDb(db);
    broadcastSync('volunteers');
    res.status(201).json(item);
  });

  app.post('/api/public/contacts', (req, res) => {
    const db = loadDb();
    const type = req.body.type === 'emergency' ? 'emergency' : 'contact';
    const name = sanitizeString(req.body.name, 160);
    const phone = sanitizeString(req.body.phone, 40);
    const email = sanitizeString(req.body.email, 120);
    const subject = sanitizeString(req.body.subject, 200);
    const details = sanitizeString(req.body.details, 2000);
    const location = sanitizeString(req.body.location, 300);

    if (!name || !phone || !subject || !details) {
      res.status(400).json({ error: 'กรุณากรอกชื่อ เบอร์โทร หัวข้อ และรายละเอียดให้ครบถ้วน' });
      return;
    }

    const msg = {
      id: `msg-${crypto.randomUUID()}`,
      type: type as 'contact' | 'emergency',
      name,
      phone,
      email,
      subject,
      details,
      location,
      status: 'new' as const,
      submittedAt: new Date().toISOString(),
      adminNote: '',
    };

    db.contacts.unshift(msg);
    saveDb(db);
    broadcastSync('contacts');
    res.status(201).json(msg);
  });

  // ==========================
  // PROTECTED ADMIN ENDPOINTS
  // ==========================
  app.post('/api/upload', requireAuth, upload.single('file'), (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: 'ไม่พบไฟล์ที่อัปโหลด' });
      return;
    }
    res.json({ url: `/uploads/${req.file.filename}`, filename: req.file.originalname });
  });

  app.post('/api/upload-multiple', requireAuth, upload.array('files', 20), (req, res) => {
    const files = req.files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) {
      res.status(400).json({ error: 'ไม่พบไฟล์ที่อัปโหลด' });
      return;
    }
    res.json({
      files: files.map((f) => ({ url: `/uploads/${f.filename}`, filename: f.originalname })),
    });
  });

  app.get('/api/admin/state', requireAuth, (_req, res) => {
    const db = loadDb();
    res.json(toAdminState(db));
  });

  // Settings
  app.put(
    '/api/admin/settings',
    requireAuth,
    requireRole(['Super Admin', 'Admin', 'การเงิน']),
    (req: AuthedRequest, res) => {
      const db = loadDb();
      const s = req.body || {};
      db.settings = {
        ...db.settings,
        foundationName: sanitizeString(s.foundationName, 200) || db.settings.foundationName,
        foundationSubtitle: sanitizeString(s.foundationSubtitle, 300),
        logoUrl: sanitizeUrl(s.logoUrl) || db.settings.logoUrl,
        heroBannerUrl: sanitizeUrl(s.heroBannerUrl) || db.settings.heroBannerUrl,
        heroTitle: sanitizeString(s.heroTitle, 200),
        heroSubtitle: sanitizeString(s.heroSubtitle, 600),
        heroCtaPrimary: sanitizeString(s.heroCtaPrimary, 80) || 'ดูรายละเอียดกิจกรรม',
        emergencyPhone: sanitizeString(s.emergencyPhone, 50),
        emergencyPhoneSecondary: sanitizeString(s.emergencyPhoneSecondary, 50),
        linePhone: sanitizeString(s.linePhone, 50),
        email: sanitizeString(s.email, 120),
        address: sanitizeString(s.address, 400),
        facebookUrl: sanitizeUrl(s.facebookUrl),
        lineUrl: sanitizeUrl(s.lineUrl),
        websiteUrl: sanitizeUrl(s.websiteUrl),
        mapsUrl: sanitizeUrl(s.mapsUrl) || db.settings.mapsUrl,
        mapsLat:
          s.mapsLat !== '' && s.mapsLat !== null && s.mapsLat !== undefined && Number.isFinite(Number(s.mapsLat))
            ? Number(s.mapsLat)
            : db.settings.mapsLat,
        mapsLng:
          s.mapsLng !== '' && s.mapsLng !== null && s.mapsLng !== undefined && Number.isFinite(Number(s.mapsLng))
            ? Number(s.mapsLng)
            : db.settings.mapsLng,
        aboutTitle: sanitizeString(s.aboutTitle, 200),
        aboutDescription: sanitizeString(s.aboutDescription, 3000),
        aboutMission: sanitizeString(s.aboutMission, 1500),
        aboutVision: sanitizeString(s.aboutVision, 1500),
        aboutImageUrl: sanitizeUrl(s.aboutImageUrl) || db.settings.aboutImageUrl,
        donationGoal:
          Number.isFinite(Number(s.donationGoal)) && Number(s.donationGoal) > 0
            ? Number(s.donationGoal)
            : db.settings.donationGoal,
        bankName: sanitizeString(s.bankName, 120),
        bankBranch: sanitizeString(s.bankBranch, 120),
        bankAccountNumber: sanitizeString(s.bankAccountNumber, 60),
        bankAccountName: sanitizeString(s.bankAccountName, 200),
        qrEdonationUrl: sanitizeUrl(s.qrEdonationUrl) || db.settings.qrEdonationUrl,
        qrPromptpayUrl: sanitizeUrl(s.qrPromptpayUrl) || db.settings.qrPromptpayUrl,
        qrPromptpayRef: sanitizeString(s.qrPromptpayRef, 120),
      };
      addAuditLog(db, req.adminUser!.fullName, req.adminUser!.role, 'แก้ไขการตั้งค่าองค์กร', 'SiteSettings');
      saveDb(db);
      broadcastSync('settings');
      res.json(db.settings);
    }
  );

  // Monthly Stats
  app.put(
    '/api/admin/monthly-stats',
    requireAuth,
    requireRole(['Super Admin', 'Admin', 'หัวหน้ากู้ชีพ']),
    (req: AuthedRequest, res) => {
      const db = loadDb();
      const incoming = Array.isArray(req.body.monthlyStats) ? req.body.monthlyStats : [];
      db.monthlyStats = incoming.map((m: MonthlyStat, idx: number) => ({
        id: sanitizeString(m.id, 40) || `ms-${idx + 1}`,
        monthLabel: sanitizeString(m.monthLabel, 20) || `เดือน ${idx + 1}`,
        yearBe: Number(m.yearBe) || 2569,
        emsCases: Math.max(0, Number(m.emsCases) || 0),
        rescueCases: Math.max(0, Number(m.rescueCases) || 0),
        reliefCases: Math.max(0, Number(m.reliefCases) || 0),
      }));
      addAuditLog(db, req.adminUser!.fullName, req.adminUser!.role, 'อัปเดตสถิติรายเดือน', 'MonthlyStats');
      saveDb(db);
      broadcastSync('monthlyStats');
      res.json(db.monthlyStats);
    }
  );

  // Executives CRUD
  app.post('/api/admin/executives', requireAuth, requireRole(['Super Admin', 'Admin']), (req: AuthedRequest, res) => {
    const db = loadDb();
    const b = req.body || {};
    const item: Executive = {
      id: `exec-${crypto.randomUUID()}`,
      name: sanitizeString(b.name, 160),
      roleTier: b.roleTier || 'advisor',
      positionTitle: sanitizeString(b.positionTitle, 160),
      bio: sanitizeString(b.bio, 1500),
      contact: sanitizeString(b.contact, 160),
      photoUrl: sanitizeUrl(b.photoUrl),
      sortOrder: Number.isFinite(Number(b.sortOrder)) ? Number(b.sortOrder) : db.executives.length + 1,
    };
    if (!item.name || !item.positionTitle) {
      res.status(400).json({ error: 'กรุณาระบุชื่อและตำแหน่ง' });
      return;
    }
    db.executives.push(item);
    addAuditLog(db, req.adminUser!.fullName, req.adminUser!.role, 'เพิ่มคณะผู้บริหาร', item.name);
    saveDb(db);
    broadcastSync('executives');
    res.status(201).json(item);
  });

  app.put('/api/admin/executives/:id', requireAuth, requireRole(['Super Admin', 'Admin']), (req: AuthedRequest, res) => {
    const db = loadDb();
    const idx = db.executives.findIndex((x) => x.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'ไม่พบข้อมูลผู้บริหาร' });
      return;
    }
    const b = req.body || {};
    db.executives[idx] = {
      ...db.executives[idx],
      name: sanitizeString(b.name, 160) || db.executives[idx].name,
      roleTier: b.roleTier || db.executives[idx].roleTier,
      positionTitle: sanitizeString(b.positionTitle, 160) || db.executives[idx].positionTitle,
      bio: sanitizeString(b.bio, 1500),
      contact: sanitizeString(b.contact, 160),
      photoUrl: b.photoUrl !== undefined ? sanitizeUrl(b.photoUrl) : db.executives[idx].photoUrl,
      sortOrder: Number.isFinite(Number(b.sortOrder)) ? Number(b.sortOrder) : db.executives[idx].sortOrder,
    };
    addAuditLog(db, req.adminUser!.fullName, req.adminUser!.role, 'แก้ไขคณะผู้บริหาร', db.executives[idx].name);
    saveDb(db);
    broadcastSync('executives');
    res.json(db.executives[idx]);
  });

  app.delete('/api/admin/executives/:id', requireAuth, requireRole(['Super Admin', 'Admin']), (req: AuthedRequest, res) => {
    const db = loadDb();
    const target = db.executives.find((x) => x.id === req.params.id);
    db.executives = db.executives.filter((x) => x.id !== req.params.id);
    addAuditLog(db, req.adminUser!.fullName, req.adminUser!.role, 'ลบคณะผู้บริหาร', target?.name || req.params.id);
    saveDb(db);
    broadcastSync('executives');
    res.json({ ok: true });
  });

  // Staff CRUD
  app.post('/api/admin/staff', requireAuth, requireRole(['Super Admin', 'Admin']), (req: AuthedRequest, res) => {
    const db = loadDb();
    const b = req.body || {};
    const item: StaffMember = {
      id: `staff-${crypto.randomUUID()}`,
      employeeCode: sanitizeString(b.employeeCode, 40) || `RKL-${String(db.staff.length + 1).padStart(3, '0')}`,
      name: sanitizeString(b.name, 160),
      position: sanitizeString(b.position, 160),
      department: b.department || 'ฝ่ายธุรการ',
      phone: sanitizeString(b.phone, 60),
      email: sanitizeString(b.email, 120),
      photoUrl: sanitizeUrl(b.photoUrl),
      systemRole: sanitizeString(b.systemRole, 60),
      sortOrder: Number.isFinite(Number(b.sortOrder)) ? Number(b.sortOrder) : db.staff.length + 1,
    };
    if (!item.name || !item.position) {
      res.status(400).json({ error: 'กรุณาระบุชื่อและตำแหน่งพนักงาน' });
      return;
    }
    db.staff.push(item);
    addAuditLog(db, req.adminUser!.fullName, req.adminUser!.role, 'เพิ่มข้อมูลพนักงาน', item.name);
    saveDb(db);
    broadcastSync('staff');
    res.status(201).json(item);
  });

  app.put('/api/admin/staff/:id', requireAuth, requireRole(['Super Admin', 'Admin']), (req: AuthedRequest, res) => {
    const db = loadDb();
    const idx = db.staff.findIndex((x) => x.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'ไม่พบข้อมูลพนักงาน' });
      return;
    }
    const b = req.body || {};
    db.staff[idx] = {
      ...db.staff[idx],
      employeeCode: sanitizeString(b.employeeCode, 40) || db.staff[idx].employeeCode,
      name: sanitizeString(b.name, 160) || db.staff[idx].name,
      position: sanitizeString(b.position, 160) || db.staff[idx].position,
      department: b.department || db.staff[idx].department,
      phone: sanitizeString(b.phone, 60),
      email: sanitizeString(b.email, 120),
      photoUrl: b.photoUrl !== undefined ? sanitizeUrl(b.photoUrl) : db.staff[idx].photoUrl,
      systemRole: sanitizeString(b.systemRole, 60),
      sortOrder: Number.isFinite(Number(b.sortOrder)) ? Number(b.sortOrder) : db.staff[idx].sortOrder,
    };
    addAuditLog(db, req.adminUser!.fullName, req.adminUser!.role, 'แก้ไขข้อมูลพนักงาน', db.staff[idx].name);
    saveDb(db);
    broadcastSync('staff');
    res.json(db.staff[idx]);
  });

  app.delete('/api/admin/staff/:id', requireAuth, requireRole(['Super Admin', 'Admin']), (req: AuthedRequest, res) => {
    const db = loadDb();
    const target = db.staff.find((x) => x.id === req.params.id);
    db.staff = db.staff.filter((x) => x.id !== req.params.id);
    addAuditLog(db, req.adminUser!.fullName, req.adminUser!.role, 'ลบข้อมูลพนักงาน', target?.name || req.params.id);
    saveDb(db);
    broadcastSync('staff');
    res.json({ ok: true });
  });

  // Rescue Personnel CRUD
  app.post('/api/admin/rescue', requireAuth, requireRole(['Super Admin', 'Admin', 'หัวหน้ากู้ชีพ']), (req: AuthedRequest, res) => {
    const db = loadDb();
    const b = req.body || {};
    const item: RescuePersonnel = {
      id: `res-${crypto.randomUUID()}`,
      officerCode: sanitizeString(b.officerCode, 40) || `EMT-${String(db.rescuePersonnel.length + 1).padStart(3, '0')}`,
      name: sanitizeString(b.name, 160),
      emtLevel: sanitizeString(b.emtLevel, 80) || 'EMT',
      position: sanitizeString(b.position, 160),
      unit: b.unit || '401',
      shift: sanitizeString(b.shift, 100),
      ambulanceCode: sanitizeString(b.ambulanceCode, 80),
      radioCallsign: sanitizeString(b.radioCallsign, 80),
      phone: sanitizeString(b.phone, 60),
      photoUrl: sanitizeUrl(b.photoUrl),
      sortOrder: Number.isFinite(Number(b.sortOrder)) ? Number(b.sortOrder) : db.rescuePersonnel.length + 1,
    };
    if (!item.name) {
      res.status(400).json({ error: 'กรุณาระบุชื่อเจ้าหน้าที่กู้ชีพ' });
      return;
    }
    db.rescuePersonnel.push(item);
    addAuditLog(db, req.adminUser!.fullName, req.adminUser!.role, 'เพิ่มเจ้าหน้าที่กู้ชีพ', item.name);
    saveDb(db);
    broadcastSync('rescuePersonnel');
    res.status(201).json(item);
  });

  app.put('/api/admin/rescue/:id', requireAuth, requireRole(['Super Admin', 'Admin', 'หัวหน้ากู้ชีพ']), (req: AuthedRequest, res) => {
    const db = loadDb();
    const idx = db.rescuePersonnel.findIndex((x) => x.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'ไม่พบข้อมูลเจ้าหน้าที่กู้ชีพ' });
      return;
    }
    const b = req.body || {};
    db.rescuePersonnel[idx] = {
      ...db.rescuePersonnel[idx],
      officerCode: sanitizeString(b.officerCode, 40) || db.rescuePersonnel[idx].officerCode,
      name: sanitizeString(b.name, 160) || db.rescuePersonnel[idx].name,
      emtLevel: sanitizeString(b.emtLevel, 80),
      position: sanitizeString(b.position, 160),
      unit: b.unit || db.rescuePersonnel[idx].unit,
      shift: sanitizeString(b.shift, 100),
      ambulanceCode: sanitizeString(b.ambulanceCode, 80),
      radioCallsign: sanitizeString(b.radioCallsign, 80),
      phone: sanitizeString(b.phone, 60),
      photoUrl: b.photoUrl !== undefined ? sanitizeUrl(b.photoUrl) : db.rescuePersonnel[idx].photoUrl,
      sortOrder: Number.isFinite(Number(b.sortOrder)) ? Number(b.sortOrder) : db.rescuePersonnel[idx].sortOrder,
    };
    addAuditLog(db, req.adminUser!.fullName, req.adminUser!.role, 'แก้ไขเจ้าหน้าที่กู้ชีพ', db.rescuePersonnel[idx].name);
    saveDb(db);
    broadcastSync('rescuePersonnel');
    res.json(db.rescuePersonnel[idx]);
  });

  app.delete('/api/admin/rescue/:id', requireAuth, requireRole(['Super Admin', 'Admin', 'หัวหน้ากู้ชีพ']), (req: AuthedRequest, res) => {
    const db = loadDb();
    const target = db.rescuePersonnel.find((x) => x.id === req.params.id);
    db.rescuePersonnel = db.rescuePersonnel.filter((x) => x.id !== req.params.id);
    addAuditLog(db, req.adminUser!.fullName, req.adminUser!.role, 'ลบเจ้าหน้าที่กู้ชีพ', target?.name || req.params.id);
    saveDb(db);
    broadcastSync('rescuePersonnel');
    res.json({ ok: true });
  });

  // News CRUD
  app.post('/api/admin/news', requireAuth, requireRole(['Super Admin', 'Admin', 'ประชาสัมพันธ์']), (req: AuthedRequest, res) => {
    const db = loadDb();
    const b = req.body || {};
    const item: NewsItem = {
      id: `news-${crypto.randomUUID()}`,
      title: sanitizeString(b.title, 250),
      summary: sanitizeString(b.summary, 600),
      content: sanitizeString(b.content, 10000),
      coverImageUrl: sanitizeUrl(b.coverImageUrl),
      galleryUrls: Array.isArray(b.galleryUrls) ? b.galleryUrls.map(sanitizeUrl).filter(Boolean) : [],
      pdfUrl: sanitizeUrl(b.pdfUrl),
      publishedAt: sanitizeString(b.publishedAt, 30) || new Date().toISOString().slice(0, 10),
      isPublished: b.isPublished !== false,
      isApproved: b.isApproved !== false,
      authorName: sanitizeString(b.authorName, 120) || req.adminUser!.fullName,
    };
    if (!item.title) {
      res.status(400).json({ error: 'กรุณาระบุหัวข้อข่าว' });
      return;
    }
    db.news.unshift(item);
    addAuditLog(db, req.adminUser!.fullName, req.adminUser!.role, 'เพิ่มข่าวประชาสัมพันธ์', item.title);
    saveDb(db);
    broadcastSync('news');
    res.status(201).json(item);
  });

  app.put('/api/admin/news/:id', requireAuth, requireRole(['Super Admin', 'Admin', 'ประชาสัมพันธ์']), (req: AuthedRequest, res) => {
    const db = loadDb();
    const idx = db.news.findIndex((x) => x.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'ไม่พบข่าวประชาสัมพันธ์' });
      return;
    }
    const b = req.body || {};
    db.news[idx] = {
      ...db.news[idx],
      title: sanitizeString(b.title, 250) || db.news[idx].title,
      summary: b.summary !== undefined ? sanitizeString(b.summary, 600) : db.news[idx].summary,
      content: b.content !== undefined ? sanitizeString(b.content, 10000) : db.news[idx].content,
      coverImageUrl: b.coverImageUrl !== undefined ? sanitizeUrl(b.coverImageUrl) : db.news[idx].coverImageUrl,
      galleryUrls: Array.isArray(b.galleryUrls) ? b.galleryUrls.map(sanitizeUrl).filter(Boolean) : db.news[idx].galleryUrls,
      pdfUrl: b.pdfUrl !== undefined ? sanitizeUrl(b.pdfUrl) : db.news[idx].pdfUrl,
      publishedAt: b.publishedAt !== undefined ? sanitizeString(b.publishedAt, 30) : db.news[idx].publishedAt,
      isPublished: typeof b.isPublished === 'boolean' ? b.isPublished : db.news[idx].isPublished,
      isApproved: typeof b.isApproved === 'boolean' ? b.isApproved : db.news[idx].isApproved,
    };
    addAuditLog(db, req.adminUser!.fullName, req.adminUser!.role, 'แก้ไขข่าวประชาสัมพันธ์', db.news[idx].title);
    saveDb(db);
    broadcastSync('news');
    res.json(db.news[idx]);
  });

  app.delete('/api/admin/news/:id', requireAuth, requireRole(['Super Admin', 'Admin', 'ประชาสัมพันธ์']), (req: AuthedRequest, res) => {
    const db = loadDb();
    const target = db.news.find((x) => x.id === req.params.id);
    db.news = db.news.filter((x) => x.id !== req.params.id);
    addAuditLog(db, req.adminUser!.fullName, req.adminUser!.role, 'ลบข่าวประชาสัมพันธ์', target?.title || req.params.id);
    saveDb(db);
    broadcastSync('news');
    res.json({ ok: true });
  });

  // Activities CRUD
  app.post('/api/admin/activities', requireAuth, requireRole(['Super Admin', 'Admin', 'ประชาสัมพันธ์']), (req: AuthedRequest, res) => {
    const db = loadDb();
    const b = req.body || {};
    const item: ActivityItem = {
      id: `act-${crypto.randomUUID()}`,
      title: sanitizeString(b.title, 250),
      description: sanitizeString(b.description, 5000),
      category: b.category || 'ช่วยเหลือผู้ประสบอัคคีภัย',
      eventDate: sanitizeString(b.eventDate, 30) || new Date().toISOString().slice(0, 10),
      location: sanitizeString(b.location, 300),
      participantCount: Math.max(0, Number(b.participantCount) || 0),
      mapUrl: sanitizeUrl(b.mapUrl),
      galleryUrls: Array.isArray(b.galleryUrls) ? b.galleryUrls.map(sanitizeUrl).filter(Boolean) : [],
    };
    if (!item.title) {
      res.status(400).json({ error: 'กรุณาระบุชื่อกิจกรรม' });
      return;
    }
    db.activities.unshift(item);
    addAuditLog(db, req.adminUser!.fullName, req.adminUser!.role, 'เพิ่มกิจกรรมมูลนิธิ', item.title);
    saveDb(db);
    broadcastSync('activities');
    res.status(201).json(item);
  });

  app.put('/api/admin/activities/:id', requireAuth, requireRole(['Super Admin', 'Admin', 'ประชาสัมพันธ์']), (req: AuthedRequest, res) => {
    const db = loadDb();
    const idx = db.activities.findIndex((x) => x.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'ไม่พบกิจกรรม' });
      return;
    }
    const b = req.body || {};
    db.activities[idx] = {
      ...db.activities[idx],
      title: sanitizeString(b.title, 250) || db.activities[idx].title,
      description: b.description !== undefined ? sanitizeString(b.description, 5000) : db.activities[idx].description,
      category: b.category || db.activities[idx].category,
      eventDate: sanitizeString(b.eventDate, 30) || db.activities[idx].eventDate,
      location: b.location !== undefined ? sanitizeString(b.location, 300) : db.activities[idx].location,
      participantCount: Number.isFinite(Number(b.participantCount))
        ? Math.max(0, Number(b.participantCount))
        : db.activities[idx].participantCount,
      mapUrl: b.mapUrl !== undefined ? sanitizeUrl(b.mapUrl) : db.activities[idx].mapUrl,
      galleryUrls: Array.isArray(b.galleryUrls) ? b.galleryUrls.map(sanitizeUrl).filter(Boolean) : db.activities[idx].galleryUrls,
    };
    addAuditLog(db, req.adminUser!.fullName, req.adminUser!.role, 'แก้ไขกิจกรรมมูลนิธิ', db.activities[idx].title);
    saveDb(db);
    broadcastSync('activities');
    res.json(db.activities[idx]);
  });

  app.delete('/api/admin/activities/:id', requireAuth, requireRole(['Super Admin', 'Admin', 'ประชาสัมพันธ์']), (req: AuthedRequest, res) => {
    const db = loadDb();
    const target = db.activities.find((x) => x.id === req.params.id);
    db.activities = db.activities.filter((x) => x.id !== req.params.id);
    addAuditLog(db, req.adminUser!.fullName, req.adminUser!.role, 'ลบกิจกรรมมูลนิธิ', target?.title || req.params.id);
    saveDb(db);
    broadcastSync('activities');
    res.json({ ok: true });
  });

  // Annual Events CRUD
  app.post('/api/admin/annual-events', requireAuth, requireRole(['Super Admin', 'Admin', 'ประชาสัมพันธ์']), (req: AuthedRequest, res) => {
    const db = loadDb();
    const b = req.body || {};
    const item: AnnualEvent = {
      id: `evt-${crypto.randomUUID()}`,
      title: sanitizeString(b.title, 250),
      description: sanitizeString(b.description, 3000),
      eventDate: sanitizeString(b.eventDate, 30) || new Date().toISOString().slice(0, 10),
      endDate: sanitizeString(b.endDate, 30),
      location: sanitizeString(b.location, 300),
      isPinned: Boolean(b.isPinned),
      imageUrl: sanitizeUrl(b.imageUrl),
      pdfUrl: sanitizeUrl(b.pdfUrl),
    };
    if (!item.title) {
      res.status(400).json({ error: 'กรุณาระบุชื่องานประจำปี' });
      return;
    }
    db.annualEvents.push(item);
    addAuditLog(db, req.adminUser!.fullName, req.adminUser!.role, 'เพิ่มงานประจำปี', item.title);
    saveDb(db);
    broadcastSync('annualEvents');
    res.status(201).json(item);
  });

  app.put('/api/admin/annual-events/:id', requireAuth, requireRole(['Super Admin', 'Admin', 'ประชาสัมพันธ์']), (req: AuthedRequest, res) => {
    const db = loadDb();
    const idx = db.annualEvents.findIndex((x) => x.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'ไม่พบงานประจำปี' });
      return;
    }
    const b = req.body || {};
    db.annualEvents[idx] = {
      ...db.annualEvents[idx],
      title: sanitizeString(b.title, 250) || db.annualEvents[idx].title,
      description: b.description !== undefined ? sanitizeString(b.description, 3000) : db.annualEvents[idx].description,
      eventDate: sanitizeString(b.eventDate, 30) || db.annualEvents[idx].eventDate,
      endDate: b.endDate !== undefined ? sanitizeString(b.endDate, 30) : db.annualEvents[idx].endDate,
      location: b.location !== undefined ? sanitizeString(b.location, 300) : db.annualEvents[idx].location,
      isPinned: typeof b.isPinned === 'boolean' ? b.isPinned : db.annualEvents[idx].isPinned,
      imageUrl: b.imageUrl !== undefined ? sanitizeUrl(b.imageUrl) : db.annualEvents[idx].imageUrl,
      pdfUrl: b.pdfUrl !== undefined ? sanitizeUrl(b.pdfUrl) : db.annualEvents[idx].pdfUrl,
    };
    addAuditLog(db, req.adminUser!.fullName, req.adminUser!.role, 'แก้ไขงานประจำปี', db.annualEvents[idx].title);
    saveDb(db);
    broadcastSync('annualEvents');
    res.json(db.annualEvents[idx]);
  });

  app.delete('/api/admin/annual-events/:id', requireAuth, requireRole(['Super Admin', 'Admin', 'ประชาสัมพันธ์']), (req: AuthedRequest, res) => {
    const db = loadDb();
    const target = db.annualEvents.find((x) => x.id === req.params.id);
    db.annualEvents = db.annualEvents.filter((x) => x.id !== req.params.id);
    addAuditLog(db, req.adminUser!.fullName, req.adminUser!.role, 'ลบงานประจำปี', target?.title || req.params.id);
    saveDb(db);
    broadcastSync('annualEvents');
    res.json({ ok: true });
  });

  // Donations CRUD
  app.post('/api/admin/donations', requireAuth, requireRole(['Super Admin', 'Admin', 'การเงิน']), (req: AuthedRequest, res) => {
    const db = loadDb();
    const b = req.body || {};
    const amount = Number(b.amount);
    if (!b.donorName || !Number.isFinite(amount) || amount <= 0) {
      res.status(400).json({ error: 'กรุณาระบุชื่อผู้บริจาคและจำนวนเงิน' });
      return;
    }
    const item: DonationRecord = {
      id: `don-${crypto.randomUUID()}`,
      receiptNo: sanitizeString(b.receiptNo, 50) || `RKL-${new Date().getFullYear() + 543}-${String(db.donations.length + 1).padStart(4, '0')}`,
      donorName: sanitizeString(b.donorName, 160),
      amount,
      purpose: b.purpose || 'ทั่วไป',
      channel: b.channel || 'โอนธนาคารกสิกรไทย',
      donatedAt: sanitizeString(b.donatedAt, 30) || new Date().toISOString().slice(0, 10),
      slipUrl: sanitizeUrl(b.slipUrl),
      status: b.status || 'verified',
      note: sanitizeString(b.note, 500),
    };
    db.donations.unshift(item);
    addAuditLog(db, req.adminUser!.fullName, req.adminUser!.role, 'บันทึกรายการบริจาค', `${item.donorName} (${item.amount} บาท)`);
    saveDb(db);
    broadcastSync('donations');
    res.status(201).json(item);
  });

  app.put('/api/admin/donations/:id', requireAuth, requireRole(['Super Admin', 'Admin', 'การเงิน']), (req: AuthedRequest, res) => {
    const db = loadDb();
    const idx = db.donations.findIndex((x) => x.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'ไม่พบรายการบริจาค' });
      return;
    }
    const b = req.body || {};
    db.donations[idx] = {
      ...db.donations[idx],
      donorName: sanitizeString(b.donorName, 160) || db.donations[idx].donorName,
      amount: Number.isFinite(Number(b.amount)) && Number(b.amount) > 0 ? Number(b.amount) : db.donations[idx].amount,
      purpose: b.purpose || db.donations[idx].purpose,
      channel: b.channel || db.donations[idx].channel,
      donatedAt: sanitizeString(b.donatedAt, 30) || db.donations[idx].donatedAt,
      slipUrl: b.slipUrl !== undefined ? sanitizeUrl(b.slipUrl) : db.donations[idx].slipUrl,
      status: b.status || db.donations[idx].status,
      note: b.note !== undefined ? sanitizeString(b.note, 500) : db.donations[idx].note,
    };
    addAuditLog(db, req.adminUser!.fullName, req.adminUser!.role, 'อัปเดตรายการบริจาค', db.donations[idx].receiptNo);
    saveDb(db);
    broadcastSync('donations');
    res.json(db.donations[idx]);
  });

  app.delete('/api/admin/donations/:id', requireAuth, requireRole(['Super Admin', 'Admin', 'การเงิน']), (req: AuthedRequest, res) => {
    const db = loadDb();
    const target = db.donations.find((x) => x.id === req.params.id);
    db.donations = db.donations.filter((x) => x.id !== req.params.id);
    addAuditLog(db, req.adminUser!.fullName, req.adminUser!.role, 'ลบรายการบริจาค', target?.receiptNo || req.params.id);
    saveDb(db);
    broadcastSync('donations');
    res.json({ ok: true });
  });

  // Gallery CRUD
  app.post('/api/admin/gallery', requireAuth, requireRole(['Super Admin', 'Admin', 'ประชาสัมพันธ์']), (req: AuthedRequest, res) => {
    const db = loadDb();
    const b = req.body || {};
    const itemsInput = Array.isArray(b.items) ? b.items : [b];
    const created: GalleryItem[] = [];
    for (const row of itemsInput) {
      const imageUrl = sanitizeUrl(row.imageUrl);
      if (!imageUrl) continue;
      const g: GalleryItem = {
        id: `gal-${crypto.randomUUID()}`,
        title: sanitizeString(row.title, 200) || 'ภาพกิจกรรมมูลนิธิร่วมกุศลสมุทรปราการ',
        category: row.category || 'ช่วยเหลือประชาชน',
        imageUrl,
        uploadedAt: new Date().toISOString().slice(0, 10),
      };
      db.gallery.unshift(g);
      created.push(g);
    }
    if (created.length === 0) {
      res.status(400).json({ error: 'กรุณาอัปโหลดรูปภาพอย่างน้อย 1 รูป' });
      return;
    }
    addAuditLog(db, req.adminUser!.fullName, req.adminUser!.role, 'เพิ่มภาพในคลังภาพ', `${created.length} รูป`);
    saveDb(db);
    broadcastSync('gallery');
    res.status(201).json(created);
  });

  app.put('/api/admin/gallery/:id', requireAuth, requireRole(['Super Admin', 'Admin', 'ประชาสัมพันธ์']), (req: AuthedRequest, res) => {
    const db = loadDb();
    const idx = db.gallery.findIndex((x) => x.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'ไม่พบภาพ' });
      return;
    }
    const b = req.body || {};
    db.gallery[idx] = {
      ...db.gallery[idx],
      title: sanitizeString(b.title, 200) || db.gallery[idx].title,
      category: b.category || db.gallery[idx].category,
      imageUrl: b.imageUrl !== undefined ? sanitizeUrl(b.imageUrl) || db.gallery[idx].imageUrl : db.gallery[idx].imageUrl,
    };
    addAuditLog(db, req.adminUser!.fullName, req.adminUser!.role, 'แก้ไขข้อมูลคลังภาพ', db.gallery[idx].title);
    saveDb(db);
    broadcastSync('gallery');
    res.json(db.gallery[idx]);
  });

  app.delete('/api/admin/gallery/:id', requireAuth, requireRole(['Super Admin', 'Admin', 'ประชาสัมพันธ์']), (req: AuthedRequest, res) => {
    const db = loadDb();
    db.gallery = db.gallery.filter((x) => x.id !== req.params.id);
    addAuditLog(db, req.adminUser!.fullName, req.adminUser!.role, 'ลบภาพในคลังภาพ', req.params.id);
    saveDb(db);
    broadcastSync('gallery');
    res.json({ ok: true });
  });

  // Volunteers Review
  app.put('/api/admin/volunteers/:id', requireAuth, requireRole(['Super Admin', 'Admin', 'หัวหน้ากู้ชีพ']), (req: AuthedRequest, res) => {
    const db = loadDb();
    const idx = db.volunteers.findIndex((x) => x.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'ไม่พบใบสมัครอาสาสมัคร' });
      return;
    }
    const b = req.body || {};
    db.volunteers[idx] = {
      ...db.volunteers[idx],
      status: b.status || db.volunteers[idx].status,
      adminNote: b.adminNote !== undefined ? sanitizeString(b.adminNote, 500) : db.volunteers[idx].adminNote,
    };
    addAuditLog(db, req.adminUser!.fullName, req.adminUser!.role, 'อัปเดตสถานะอาสาสมัคร', db.volunteers[idx].fullName);
    saveDb(db);
    broadcastSync('volunteers');
    res.json(db.volunteers[idx]);
  });

  app.delete('/api/admin/volunteers/:id', requireAuth, requireRole(['Super Admin', 'Admin']), (req: AuthedRequest, res) => {
    const db = loadDb();
    db.volunteers = db.volunteers.filter((x) => x.id !== req.params.id);
    addAuditLog(db, req.adminUser!.fullName, req.adminUser!.role, 'ลบใบสมัครอาสาสมัคร', req.params.id);
    saveDb(db);
    broadcastSync('volunteers');
    res.json({ ok: true });
  });

  // Contacts & Emergency Reports Review
  app.put('/api/admin/contacts/:id', requireAuth, requireRole(['Super Admin', 'Admin', 'หัวหน้ากู้ชีพ']), (req: AuthedRequest, res) => {
    const db = loadDb();
    const idx = db.contacts.findIndex((x) => x.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'ไม่พบรายการแจ้งเหตุ/ติดต่อ' });
      return;
    }
    const b = req.body || {};
    db.contacts[idx] = {
      ...db.contacts[idx],
      status: b.status || db.contacts[idx].status,
      adminNote: b.adminNote !== undefined ? sanitizeString(b.adminNote, 500) : db.contacts[idx].adminNote,
    };
    addAuditLog(db, req.adminUser!.fullName, req.adminUser!.role, 'อัปเดตสถานะแจ้งเหตุ/ติดต่อ', db.contacts[idx].subject);
    saveDb(db);
    broadcastSync('contacts');
    res.json(db.contacts[idx]);
  });

  app.delete('/api/admin/contacts/:id', requireAuth, requireRole(['Super Admin', 'Admin']), (req: AuthedRequest, res) => {
    const db = loadDb();
    db.contacts = db.contacts.filter((x) => x.id !== req.params.id);
    addAuditLog(db, req.adminUser!.fullName, req.adminUser!.role, 'ลบรายการแจ้งเหตุ/ติดต่อ', req.params.id);
    saveDb(db);
    broadcastSync('contacts');
    res.json({ ok: true });
  });

  // Admin User Management (Super Admin only)
  app.post('/api/admin/users', requireAuth, requireRole(['Super Admin']), (req: AuthedRequest, res) => {
    const db = loadDb();
    const b = req.body || {};
    const username = sanitizeString(b.username, 80);
    const fullName = sanitizeString(b.fullName, 160);
    const email = sanitizeString(b.email, 120);
    const password = typeof b.password === 'string' ? b.password : '';
    const requestedRole = b.role as AdminRole;
    const role: AdminRole = VALID_ROLES.has(requestedRole) ? requestedRole : 'Admin';

    if (!username || !fullName || password.length < 8) {
      res.status(400).json({ error: 'กรุณาระบุชื่อผู้ใช้ ชื่อ-สกุล และรหัสผ่านอย่างน้อย 8 ตัวอักษร' });
      return;
    }

    if (db.adminUsers.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
      res.status(409).json({ error: 'ชื่อผู้ใช้นี้มีอยู่ในระบบแล้ว' });
      return;
    }

    const { hash, salt } = hashPassword(password);
    const created = {
      id: `admin-${crypto.randomUUID()}`,
      username,
      fullName,
      email,
      role,
      active: b.active !== false,
      createdAt: new Date().toISOString(),
      passwordHash: hash,
      passwordSalt: salt,
    };
    db.adminUsers.push(created);
    addAuditLog(db, req.adminUser!.fullName, req.adminUser!.role, 'เพิ่มบัญชีผู้ดูแลระบบ', `${username} (${role})`);
    saveDb(db);
    broadcastSync('adminUsers');
    const { passwordHash: _h, passwordSalt: _s, ...pub } = created;
    res.status(201).json(pub);
  });

  app.put('/api/admin/users/:id', requireAuth, requireRole(['Super Admin']), (req: AuthedRequest, res) => {
    const db = loadDb();
    const idx = db.adminUsers.findIndex((u) => u.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'ไม่พบบัญชีผู้ใช้งาน' });
      return;
    }
    const current = db.adminUsers[idx];
    const b = req.body || {};
    const nextRole: AdminRole = VALID_ROLES.has(b.role) ? b.role : current.role;
    const nextActive = typeof b.active === 'boolean' ? b.active : current.active;

    if (current.role === 'Super Admin' && current.active && (nextRole !== 'Super Admin' || !nextActive)) {
      const otherActiveSuperAdmins = db.adminUsers.filter(
        (u) => u.id !== current.id && u.role === 'Super Admin' && u.active
      );
      if (otherActiveSuperAdmins.length === 0) {
        res.status(400).json({ error: 'ต้องมีผู้ดูแลระบบระดับ Super Admin ที่ใช้งานได้อย่างน้อย 1 บัญชี' });
        return;
      }
    }

    current.fullName = sanitizeString(b.fullName, 160) || current.fullName;
    current.email = b.email !== undefined ? sanitizeString(b.email, 120) : current.email;
    current.role = nextRole;
    current.active = nextActive;

    if (typeof b.password === 'string' && b.password.length >= 8) {
      const { hash, salt } = hashPassword(b.password);
      current.passwordHash = hash;
      current.passwordSalt = salt;
    }
    addAuditLog(db, req.adminUser!.fullName, req.adminUser!.role, 'แก้ไขบัญชีผู้ดูแลระบบ', current.username);
    saveDb(db);
    broadcastSync('adminUsers');
    const {
      passwordHash: _h,
      passwordSalt: _s,
      twoFactorSecret: _t,
      twoFactorEnabled: _e,
      ...pub
    } = current as typeof current & { twoFactorSecret?: string; twoFactorEnabled?: boolean };
    res.json(pub);
  });

  app.delete('/api/admin/users/:id', requireAuth, requireRole(['Super Admin']), (req: AuthedRequest, res) => {
    const db = loadDb();
    if (req.adminUser?.sub === req.params.id) {
      res.status(400).json({ error: 'ไม่สามารถลบบัญชีที่กำลังใช้งานอยู่ได้' });
      return;
    }
    const target = db.adminUsers.find((u) => u.id === req.params.id);
    if (target?.role === 'Super Admin' && target.active) {
      const otherActiveSuperAdmins = db.adminUsers.filter(
        (u) => u.id !== target.id && u.role === 'Super Admin' && u.active
      );
      if (otherActiveSuperAdmins.length === 0) {
        res.status(400).json({ error: 'ไม่สามารถลบ Super Admin บัญชีสุดท้ายได้' });
        return;
      }
    }
    db.adminUsers = db.adminUsers.filter((u) => u.id !== req.params.id);
    addAuditLog(db, req.adminUser!.fullName, req.adminUser!.role, 'ลบบัญชีผู้ดูแลระบบ', target?.username || req.params.id);
    saveDb(db);
    broadcastSync('adminUsers');
    res.json({ ok: true });
  });

  // Backup Snapshot
  app.get('/api/admin/backup', requireAuth, requireRole(['Super Admin', 'Admin']), (req: AuthedRequest, res) => {
    const backupFile = createBackupSnapshot();
    const db = loadDb();
    addAuditLog(db, req.adminUser!.fullName, req.adminUser!.role, 'สำรองข้อมูลระบบ', path.basename(backupFile));
    saveDb(db);
    res.download(backupFile, `ruamkusol-backup-${new Date().toISOString().slice(0, 10)}.json`);
  });

  // Fallback 404 for unknown API routes
  app.all('/api/*', (_req, res) => {
    res.status(404).json({ error: 'ไม่พบ API ที่เรียกใช้งาน' });
  });

  // Multer / JSON error handler
  app.use((err: Error, _req: Request, res: Response, next: NextFunction) => {
    if (err) {
      res.status(400).json({ error: err.message || 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์' });
      return;
    }
    next();
  });

  // Vite / Static Frontend
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
