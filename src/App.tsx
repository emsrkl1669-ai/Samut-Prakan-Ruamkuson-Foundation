import React, { useState, useEffect, useCallback } from 'react';
import type {
  PublicAppState,
  AdminAppState,
  PublicPageId,
  AdminSectionId,
} from './types';
import {
  apiRequest,
  fetchPublicState,
  fetchAdminState,
  setAuthToken,
  getAuthToken,
  type AuthStatusResponse,
} from './lib/api';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { AdminFloatingBar } from './components/SharedUI';
import { PublicHome } from './components/PublicHome';
import {
  AboutPage,
  ExecutivesOrgChartPage,
  StaffDirectoryPage,
  RescueUnitsPage,
} from './components/OrgAndStaffPages';
import {
  NewsPage,
  ActivitiesPage,
  AnnualEventsPage,
  GalleryPage,
} from './components/CommunityPages';
import {
  DonationsPage,
  VolunteerPage,
  ContactPage,
} from './components/ActionPages';
import { AdminPortal } from './components/AdminPortal';

const PAGE_TO_ADMIN_SECTION: Record<PublicPageId, { section: AdminSectionId; label: string }> = {
  home: { section: 'settings', label: 'หน้าแรก / แบนเนอร์' },
  about: { section: 'settings', label: 'เกี่ยวกับมูลนิธิ' },
  executives: { section: 'executives', label: 'คณะผู้บริหาร' },
  'org-chart': { section: 'executives', label: 'ผังองค์กร' },
  staff: { section: 'staff', label: 'พนักงานทั้งหมด' },
  rescue: { section: 'rescue', label: 'ชุดกู้ชีพ 401–405' },
  news: { section: 'news', label: 'ข่าวประชาสัมพันธ์' },
  activities: { section: 'activities', label: 'กิจกรรมมูลนิธิ' },
  'annual-events': { section: 'annual-events', label: 'งานประจำปี' },
  donations: { section: 'donations', label: 'รับบริจาค' },
  gallery: { section: 'gallery', label: 'คลังภาพ' },
  volunteer: { section: 'volunteers', label: 'อาสาสมัคร' },
  contact: { section: 'contacts', label: 'ติดต่อ / แจ้งเหตุ' },
};

export default function App() {
  const [publicState, setPublicState] = useState<PublicAppState | null>(null);
  const [adminState, setAdminState] = useState<AdminAppState | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [mode, setMode] = useState<'public' | 'admin'>('public');
  const [activePage, setActivePage] = useState<PublicPageId>('home');
  const [adminSection, setAdminSection] = useState<AdminSectionId>('dashboard');
  const [sseConnected, setSseConnected] = useState(false);

  const loadPublic = useCallback(async (countVisit = false) => {
    const data = await fetchPublicState(countVisit);
    setPublicState(data);
  }, []);

  const loadAuthAndAdmin = useCallback(async () => {
    const status = await apiRequest<AuthStatusResponse>('/api/auth/status');
    setAuthStatus(status);
    if (status.authenticated && getAuthToken()) {
      const adm = await fetchAdminState();
      setAdminState(adm);
    } else {
      setAdminState(null);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await loadPublic(false);
    if (getAuthToken()) {
      try {
        await loadAuthAndAdmin();
      } catch {
        setAuthToken(null);
        setAdminState(null);
      }
    }
  }, [loadPublic, loadAuthAndAdmin]);

  // Initial load
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await Promise.all([loadPublic(true), loadAuthAndAdmin()]);
      } catch (err) {
        if (mounted) setError((err as Error).message || 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์กลางได้');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [loadPublic, loadAuthAndAdmin]);

  // Real-time Server-Sent Events (SSE) subscription
  useEffect(() => {
    let es: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      es = new EventSource('/api/events');
      es.addEventListener('connected', () => {
        setSseConnected(true);
      });
      es.addEventListener('sync', () => {
        refreshAll().catch(() => {});
      });
      es.onerror = () => {
        setSseConnected(false);
        es?.close();
        reconnectTimer = setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      es?.close();
    };
  }, [refreshAll]);

  const handleOpenAdminSection = (section: AdminSectionId) => {
    setAdminSection(section);
    setMode('admin');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = () => {
    setAuthToken(null);
    setAdminState(null);
    setAuthStatus((prev) => (prev ? { ...prev, authenticated: false, user: null } : null));
    setMode('public');
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 text-[#0B1F3A]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-[#0B1F3A] border-t-[#C81E1E] rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold">กำลังโหลดข้อมูลมูลนิธิร่วมกุศลสมุทรปราการ...</p>
        </div>
      </div>
    );
  }

  if (error || !publicState) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full bg-white border border-red-200 rounded-xl p-6 text-center space-y-4">
          <h1 className="text-lg font-bold text-[#C81E1E]">ไม่สามารถโหลดข้อมูลได้</h1>
          <p className="text-sm text-slate-600">{error || 'กรุณาลองเชื่อมต่อใหม่อีกครั้ง'}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 bg-[#0B1F3A] text-white text-sm font-semibold rounded-lg cursor-pointer"
          >
            โหลดหน้าใหม่
          </button>
        </div>
      </div>
    );
  }

  const isAdminAuthenticated = Boolean(authStatus?.authenticated && adminState);

  if (mode === 'admin') {
    return (
      <AdminPortal
        authStatus={authStatus}
        adminState={adminState}
        activeSection={adminSection}
        sseConnected={sseConnected}
        onChangeSection={setAdminSection}
        onAuthSuccess={refreshAll}
        onLogout={handleLogout}
        onRefreshAdmin={refreshAll}
        onBackToPublic={() => setMode('public')}
      />
    );
  }

  const renderPublicPage = () => {
    switch (activePage) {
      case 'home':
        return (
          <PublicHome
            state={publicState}
            onNavigate={setActivePage}
            isAdminAuthenticated={isAdminAuthenticated}
            onOpenAdminSection={handleOpenAdminSection}
          />
        );
      case 'about':
        return (
          <AboutPage
            state={publicState}
            isAdminAuthenticated={isAdminAuthenticated}
            onOpenAdminSection={handleOpenAdminSection}
          />
        );
      case 'executives':
        return (
          <ExecutivesOrgChartPage
            state={publicState}
            mode="executives"
            isAdminAuthenticated={isAdminAuthenticated}
            onOpenAdminSection={handleOpenAdminSection}
          />
        );
      case 'org-chart':
        return (
          <ExecutivesOrgChartPage
            state={publicState}
            mode="org-chart"
            isAdminAuthenticated={isAdminAuthenticated}
            onOpenAdminSection={handleOpenAdminSection}
          />
        );
      case 'staff':
        return (
          <StaffDirectoryPage
            state={publicState}
            isAdminAuthenticated={isAdminAuthenticated}
            onOpenAdminSection={handleOpenAdminSection}
          />
        );
      case 'rescue':
        return (
          <RescueUnitsPage
            state={publicState}
            isAdminAuthenticated={isAdminAuthenticated}
            onOpenAdminSection={handleOpenAdminSection}
          />
        );
      case 'news':
        return (
          <NewsPage
            state={publicState}
            isAdminAuthenticated={isAdminAuthenticated}
            onOpenAdminSection={handleOpenAdminSection}
          />
        );
      case 'activities':
        return (
          <ActivitiesPage
            state={publicState}
            isAdminAuthenticated={isAdminAuthenticated}
            onOpenAdminSection={handleOpenAdminSection}
          />
        );
      case 'annual-events':
        return (
          <AnnualEventsPage
            state={publicState}
            isAdminAuthenticated={isAdminAuthenticated}
            onOpenAdminSection={handleOpenAdminSection}
          />
        );
      case 'gallery':
        return (
          <GalleryPage
            state={publicState}
            isAdminAuthenticated={isAdminAuthenticated}
            onOpenAdminSection={handleOpenAdminSection}
          />
        );
      case 'donations':
        return (
          <DonationsPage
            state={publicState}
            isAdminAuthenticated={isAdminAuthenticated}
            onOpenAdminSection={handleOpenAdminSection}
            onRefreshPublic={() => loadPublic(false)}
          />
        );
      case 'volunteer':
        return (
          <VolunteerPage
            state={publicState}
            isAdminAuthenticated={isAdminAuthenticated}
            onOpenAdminSection={handleOpenAdminSection}
            onRefreshPublic={() => loadPublic(false)}
          />
        );
      case 'contact':
        return (
          <ContactPage
            state={publicState}
            isAdminAuthenticated={isAdminAuthenticated}
            onOpenAdminSection={handleOpenAdminSection}
            onRefreshPublic={() => loadPublic(false)}
          />
        );
    }
  };

  const shortcutInfo = PAGE_TO_ADMIN_SECTION[activePage];

  return (
    <div className="min-h-screen w-full flex flex-col bg-slate-50 text-slate-900">
      <Navbar
        settings={publicState.settings}
        activePage={activePage}
        onNavigate={setActivePage}
        onOpenAdmin={() => handleOpenAdminSection('dashboard')}
        isAdminAuthenticated={isAdminAuthenticated}
      />

      <main className="flex-1 w-full">{renderPublicPage()}</main>

      <Footer
        settings={publicState.settings}
        onNavigate={setActivePage}
        onOpenAdmin={() => handleOpenAdminSection('dashboard')}
      />

      <AdminFloatingBar
        visible={isAdminAuthenticated}
        label={shortcutInfo.label}
        onEdit={() => handleOpenAdminSection(shortcutInfo.section)}
        onOpenDashboard={() => handleOpenAdminSection('dashboard')}
      />
    </div>
  );
}
