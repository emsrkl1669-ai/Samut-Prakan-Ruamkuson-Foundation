import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Settings,
  Users,
  UserCog,
  Ambulance,
  Newspaper,
  CalendarHeart,
  CalendarDays,
  HeartHandshake,
  Images,
  UserPlus,
  MessageSquareWarning,
  Shield,
  BookOpen,
  LogOut,
  ExternalLink,
  Menu,
  X,
  Lock,
  Radio,
} from 'lucide-react';
import type { AdminAppState, AdminRole, AdminSectionId } from '../types';
import { apiRequest, setAuthToken, type AuthStatusResponse } from '../lib/api';
import {
  AdminDashboardView,
  AdminSettingsView,
  AdminExecutivesView,
  AdminStaffView,
  AdminRescueView,
} from './AdminManagersA';
import {
  AdminNewsView,
  AdminActivitiesView,
  AdminAnnualEventsView,
  AdminDonationsView,
  AdminGalleryView,
  AdminVolunteersView,
  AdminContactsView,
} from './AdminManagersB';
import { AdminUsersView, AdminArchitectureView } from './AdminUsersAndDocs';

interface AdminPortalProps {
  authStatus: AuthStatusResponse | null;
  adminState: AdminAppState | null;
  activeSection: AdminSectionId;
  sseConnected: boolean;
  onChangeSection: (s: AdminSectionId) => void;
  onAuthSuccess: () => Promise<void>;
  onLogout: () => void;
  onRefreshAdmin: () => Promise<void>;
  onBackToPublic: () => void;
}

const MENU_ITEMS: {
  id: AdminSectionId;
  label: string;
  icon: React.FC<{ className?: string }>;
  roles: AdminRole[];
}[] = [
  { id: 'dashboard', label: 'แดชบอร์ดและสถิติรายเดือน', icon: LayoutDashboard, roles: ['Super Admin', 'Admin', 'หัวหน้ากู้ชีพ', 'การเงิน', 'ประชาสัมพันธ์'] },
  { id: 'settings', label: 'ตั้งค่าเว็บไซต์และข้อมูลองค์กร', icon: Settings, roles: ['Super Admin', 'Admin', 'การเงิน'] },
  { id: 'executives', label: 'คณะผู้บริหาร / ผังองค์กร', icon: UserCog, roles: ['Super Admin', 'Admin'] },
  { id: 'staff', label: 'พนักงานทั้งหมด', icon: Users, roles: ['Super Admin', 'Admin'] },
  { id: 'rescue', label: 'พนักงานกู้ชีพ 401–405', icon: Ambulance, roles: ['Super Admin', 'Admin', 'หัวหน้ากู้ชีพ'] },
  { id: 'news', label: 'ข่าวประชาสัมพันธ์', icon: Newspaper, roles: ['Super Admin', 'Admin', 'ประชาสัมพันธ์'] },
  { id: 'activities', label: 'กิจกรรมมูลนิธิ', icon: CalendarHeart, roles: ['Super Admin', 'Admin', 'ประชาสัมพันธ์'] },
  { id: 'annual-events', label: 'งานประจำปี (Calendar)', icon: CalendarDays, roles: ['Super Admin', 'Admin', 'ประชาสัมพันธ์'] },
  { id: 'donations', label: 'รับบริจาคและใบเสร็จ', icon: HeartHandshake, roles: ['Super Admin', 'Admin', 'การเงิน'] },
  { id: 'gallery', label: 'คลังภาพมูลนิธิ', icon: Images, roles: ['Super Admin', 'Admin', 'ประชาสัมพันธ์'] },
  { id: 'volunteers', label: 'ใบสมัครอาสาสมัคร', icon: UserPlus, roles: ['Super Admin', 'Admin', 'หัวหน้ากู้ชีพ'] },
  { id: 'contacts', label: 'แจ้งเหตุฉุกเฉิน / ติดต่อ', icon: MessageSquareWarning, roles: ['Super Admin', 'Admin', 'หัวหน้ากู้ชีพ'] },
  { id: 'users', label: 'บัญชีแอดมิน / Audit / Backup', icon: Shield, roles: ['Super Admin'] },
  { id: 'architecture', label: 'คู่มือและโครงสร้างระบบ', icon: BookOpen, roles: ['Super Admin', 'Admin', 'ประชาสัมพันธ์', 'การเงิน', 'หัวหน้ากู้ชีพ'] },
];

export const AdminPortal: React.FC<AdminPortalProps> = ({
  authStatus,
  adminState,
  activeSection,
  sseConnected,
  onChangeSection,
  onAuthSuccess,
  onLogout,
  onRefreshAdmin,
  onBackToPublic,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Auth Forms State
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const [recoveryPasscode, setRecoveryPasscode] = useState('');
  const [authError, setAuthError] = useState('');
  const [authMsg, setAuthMsg] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    setAuthError('');
  }, [authStatus?.needsSetup]);

  const handleBootstrap = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    try {
      const res = await apiRequest<{ token: string }>('/api/auth/bootstrap', {
        method: 'POST',
        body: JSON.stringify({ username, fullName, email, password }),
      });
      setAuthToken(res.token);
      await onAuthSuccess();
    } catch (err) {
      setAuthError((err as Error).message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    try {
      const res = await apiRequest<{ token: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      setAuthToken(res.token);
      setPassword('');
      await onAuthSuccess();
    } catch (err) {
      setAuthError((err as Error).message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    setAuthMsg('');
    try {
      const res = await apiRequest<{ message: string }>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email, recoveryPasscode, newPassword: password }),
      });
      setAuthMsg(res.message);
      setShowForgot(false);
    } catch (err) {
      setAuthError((err as Error).message);
    } finally {
      setAuthLoading(false);
    }
  };

  // Unauthenticated View (First-Run Setup or Login)
  if (!authStatus?.authenticated || !adminState) {
    const isFirstRun = Boolean(authStatus?.needsSetup);

    return (
      <div className="min-h-screen w-full bg-[#061325] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-8 space-y-6 shadow-2xl">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-[#0B1F3A] text-white flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-[#0B1F3A]">
              {isFirstRun
                ? 'ตั้งค่าผู้ดูแลระบบหลักครั้งแรก (Super Admin)'
                : showForgot
                ? 'รีเซ็ตรหัสผ่านผู้ดูแลระบบ'
                : 'เข้าสู่ระบบจัดการหลังบ้าน'}
            </h1>
            <p className="text-xs text-slate-500">
              {isFirstRun
                ? 'ยังไม่มีบัญชีผู้ดูแลระบบในฐานข้อมูล กรุณาตั้งชื่อผู้ใช้และรหัสผ่านสำหรับบัญชี Super Admin เพื่อเริ่มใช้งาน'
                : 'มูลนิธิร่วมกุศลสมุทรปราการ · Admin Management System'}
            </p>
          </div>

          {authError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-lg">
              {authError}
            </div>
          )}
          {authMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg">
              {authMsg}
            </div>
          )}

          {isFirstRun ? (
            <form onSubmit={handleBootstrap} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อผู้ใช้ (Username) *
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="เช่น admin"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อ-นามสกุลผู้ดูแลระบบ *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="ระบุชื่อ-นามสกุล"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  อีเมล
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="emsrkl1669@gmail.com"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  รหัสผ่าน (อย่างน้อย 8 ตัวอักษร) *
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3 bg-[#C81E1E] hover:bg-[#9B1C1C] text-white font-semibold rounded-lg text-sm cursor-pointer"
              >
                {authLoading ? 'กำลังบันทึก...' : 'สร้างบัญชี Super Admin และเข้าสู่ระบบ'}
              </button>
            </form>
          ) : showForgot ? (
            <form onSubmit={handleForgot} className="space-y-4">
              {!authStatus?.hasEnvPasscode && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-lg leading-relaxed">
                  ยังไม่ได้ตั้งค่า <code className="font-mono">ADMIN_PASSCODE</code> บนเซิร์ฟเวอร์ กรุณาให้ผู้ดูแลระบบหลัก (Super Admin) รีเซ็ตรหัสผ่านให้ในเมนู &ldquo;บัญชีแอดมิน&rdquo;
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">อีเมลหรือชื่อผู้ใช้ *</label>
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  รหัสผ่านกู้คืนระบบ (ADMIN_PASSCODE) *
                </label>
                <input
                  type="password"
                  required
                  disabled={!authStatus?.hasEnvPasscode}
                  value={recoveryPasscode}
                  onChange={(e) => setRecoveryPasscode(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm disabled:bg-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  รหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร) *
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  disabled={!authStatus?.hasEnvPasscode}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm disabled:bg-slate-100"
                />
              </div>
              <button
                type="submit"
                disabled={authLoading || !authStatus?.hasEnvPasscode}
                className="w-full py-3 bg-[#0B1F3A] hover:bg-[#122D52] disabled:opacity-50 text-white font-semibold rounded-lg text-sm cursor-pointer"
              >
                ยืนยันการตั้งรหัสผ่านใหม่
              </button>
              <button
                type="button"
                onClick={() => setShowForgot(false)}
                className="w-full py-2 text-xs text-slate-600 hover:underline cursor-pointer"
              >
                กลับไปหน้าเข้าสู่ระบบ
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อผู้ใช้ หรือ อีเมล *
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">รหัสผ่าน *</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3 bg-[#0B1F3A] hover:bg-[#122D52] text-white font-semibold rounded-lg text-sm cursor-pointer"
              >
                {authLoading ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบหลังบ้าน'}
              </button>
              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => setShowForgot(true)}
                  className="text-slate-500 hover:text-[#0B1F3A] cursor-pointer"
                >
                  ลืมรหัสผ่าน?
                </button>
                <button
                  type="button"
                  onClick={onBackToPublic}
                  className="text-[#C81E1E] font-semibold hover:underline cursor-pointer"
                >
                  กลับหน้าเว็บไซต์หลัก
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  const currentUser = authStatus.user!;
  const visibleMenu = MENU_ITEMS.filter(
    (item) => currentUser.role === 'Super Admin' || item.roles.includes(currentUser.role)
  );
  const resolvedSection = visibleMenu.some((m) => m.id === activeSection)
    ? activeSection
    : (visibleMenu[0]?.id || 'dashboard');

  const renderSection = () => {
    switch (resolvedSection) {
      case 'dashboard':
        return (
          <AdminDashboardView
            state={adminState}
            onRefresh={onRefreshAdmin}
            onNavigateSection={onChangeSection}
          />
        );
      case 'settings':
        return <AdminSettingsView state={adminState} onRefresh={onRefreshAdmin} />;
      case 'executives':
        return <AdminExecutivesView state={adminState} onRefresh={onRefreshAdmin} />;
      case 'staff':
        return <AdminStaffView state={adminState} onRefresh={onRefreshAdmin} />;
      case 'rescue':
        return <AdminRescueView state={adminState} onRefresh={onRefreshAdmin} />;
      case 'news':
        return <AdminNewsView state={adminState} onRefresh={onRefreshAdmin} />;
      case 'activities':
        return <AdminActivitiesView state={adminState} onRefresh={onRefreshAdmin} />;
      case 'annual-events':
        return <AdminAnnualEventsView state={adminState} onRefresh={onRefreshAdmin} />;
      case 'donations':
        return <AdminDonationsView state={adminState} onRefresh={onRefreshAdmin} />;
      case 'gallery':
        return <AdminGalleryView state={adminState} onRefresh={onRefreshAdmin} />;
      case 'volunteers':
        return <AdminVolunteersView state={adminState} onRefresh={onRefreshAdmin} />;
      case 'contacts':
        return <AdminContactsView state={adminState} onRefresh={onRefreshAdmin} />;
      case 'users':
        return <AdminUsersView state={adminState} onRefresh={onRefreshAdmin} />;
      case 'architecture':
        return <AdminArchitectureView />;
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-100 flex">
      {/* Left Sidebar (Desktop) */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-[#061325] text-slate-200 flex flex-col border-r border-slate-800 transition-transform lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } no-print`}
      >
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white">ระบบจัดการหลังบ้าน</h2>
            <p className="text-xs text-slate-400 mt-0.5 truncate">
              {adminState.settings.foundationName}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {visibleMenu.map((item) => {
            const Icon = item.icon;
            const active = resolvedSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onChangeSection(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer text-left ${
                  active
                    ? 'bg-[#C81E1E] text-white'
                    : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-3 text-xs">
          <div className="px-2">
            <p className="font-semibold text-white truncate">{currentUser.fullName}</p>
            <p className="text-slate-400">สิทธิ์: {currentUser.role}</p>
          </div>
          <button
            type="button"
            onClick={onBackToPublic}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>กลับหน้าเว็บสาธารณะ</span>
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-950/60 hover:bg-red-900 text-red-200 rounded-lg cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area (Full Width) */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 no-print">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
              aria-label="เปิดเมนูหลังบ้าน"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-base sm:text-lg font-bold text-[#0B1F3A] truncate">
              {MENU_ITEMS.find((m) => m.id === resolvedSection)?.label || 'ระบบหลังบ้าน'}
            </h1>
          </div>

          <div className="flex items-center gap-3 text-xs shrink-0">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium ${
                sseConnected
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border border-amber-200'
              }`}
              title="สถานะการซิงค์ข้อมูลข้ามเครื่องแบบเรียลไทม์ (Server-Sent Events)"
            >
              <Radio className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {sseConnected ? 'ซิงค์เรียลไทม์ (SSE) เชื่อมต่อแล้ว' : 'กำลังเชื่อมต่อซิงค์...'}
              </span>
            </span>

            <button
              type="button"
              onClick={onBackToPublic}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0B1F3A] text-white font-semibold rounded-lg hover:bg-[#122D52] cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ดูหน้าเว็บ</span>
            </button>
          </div>
        </header>

        <main className="flex-1 w-full p-4 sm:p-6 lg:p-8">{renderSection()}</main>
      </div>
    </div>
  );
};
