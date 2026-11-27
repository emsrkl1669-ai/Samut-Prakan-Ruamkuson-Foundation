import React, { useState, useRef, useEffect } from 'react';
import {
  PhoneCall,
  HeartHandshake,
  Menu,
  X,
  ChevronDown,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import type { PublicPageId, SiteSettings } from '../types';
import { ImageWithFallback } from './SharedUI';

interface NavbarProps {
  settings: SiteSettings;
  activePage: PublicPageId;
  onNavigate: (page: PublicPageId) => void;
  onOpenAdmin: () => void;
  isAdminAuthenticated: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  settings,
  activePage,
  onNavigate,
  onOpenAdmin,
  isAdminAuthenticated,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<'org' | 'community' | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleGo = (page: PublicPageId) => {
    setOpenDropdown(null);
    setMobileOpen(false);
    onNavigate(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isOrgActive = ['about', 'executives', 'org-chart', 'staff', 'rescue'].includes(activePage);
  const isCommunityActive = ['news', 'activities', 'annual-events', 'gallery'].includes(activePage);

  return (
    <header
      ref={navRef}
      className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200 no-print"
    >
      <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14 h-16 sm:h-[72px] flex items-center justify-between gap-4 lg:gap-8">
        {/* Zone 1: Official Logo + Foundation Wordmark */}
        <button
          type="button"
          onClick={() => handleGo('home')}
          className="flex items-center gap-3 text-left shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B1F3A] rounded-lg"
        >
          <ImageWithFallback
            src={settings.logoUrl}
            alt={settings.foundationName}
            className="w-10 h-10 sm:w-11 sm:h-11 object-contain rounded-full shrink-0"
          />
          <span className="text-base sm:text-lg font-bold tracking-tight text-[#0B1F3A] whitespace-nowrap shrink-0">
            {settings.foundationName}
          </span>
        </button>

        {/* Zone 2: Desktop Navigation */}
        <nav
          className="hidden xl:flex items-center gap-6 text-sm font-medium text-slate-700"
          aria-label="เมนูหลัก"
        >
          <button
            type="button"
            onClick={() => handleGo('home')}
            className={`py-2 whitespace-nowrap shrink-0 transition-colors cursor-pointer border-b-2 ${
              activePage === 'home'
                ? 'text-[#0B1F3A] border-[#C81E1E] font-semibold'
                : 'border-transparent hover:text-[#0B1F3A]'
            }`}
          >
            หน้าแรก
          </button>

          {/* Org & Personnel Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenDropdown(openDropdown === 'org' ? null : 'org')}
              className={`inline-flex items-center gap-1 py-2 whitespace-nowrap shrink-0 transition-colors cursor-pointer border-b-2 ${
                isOrgActive
                  ? 'text-[#0B1F3A] border-[#C81E1E] font-semibold'
                  : 'border-transparent hover:text-[#0B1F3A]'
              }`}
              aria-expanded={openDropdown === 'org'}
            >
              <span>องค์กรและบุคลากร</span>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>
            {openDropdown === 'org' && (
              <div className="absolute left-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50">
                <button
                  type="button"
                  onClick={() => handleGo('about')}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 cursor-pointer ${
                    activePage === 'about' ? 'text-[#C81E1E] font-semibold bg-slate-50' : 'text-slate-700'
                  }`}
                >
                  เกี่ยวกับมูลนิธิ
                </button>
                <button
                  type="button"
                  onClick={() => handleGo('executives')}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 cursor-pointer ${
                    activePage === 'executives' ? 'text-[#C81E1E] font-semibold bg-slate-50' : 'text-slate-700'
                  }`}
                >
                  คณะผู้บริหารและที่ปรึกษา
                </button>
                <button
                  type="button"
                  onClick={() => handleGo('org-chart')}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 cursor-pointer ${
                    activePage === 'org-chart' ? 'text-[#C81E1E] font-semibold bg-slate-50' : 'text-slate-700'
                  }`}
                >
                  ผังองค์กร
                </button>
                <button
                  type="button"
                  onClick={() => handleGo('staff')}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 cursor-pointer ${
                    activePage === 'staff' ? 'text-[#C81E1E] font-semibold bg-slate-50' : 'text-slate-700'
                  }`}
                >
                  พนักงานทั้งหมด
                </button>
                <button
                  type="button"
                  onClick={() => handleGo('rescue')}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 cursor-pointer ${
                    activePage === 'rescue' ? 'text-[#C81E1E] font-semibold bg-slate-50' : 'text-slate-700'
                  }`}
                >
                  พนักงานกู้ชีพ (ชุด 401–405)
                </button>
              </div>
            )}
          </div>

          {/* News & Activities Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenDropdown(openDropdown === 'community' ? null : 'community')}
              className={`inline-flex items-center gap-1 py-2 whitespace-nowrap shrink-0 transition-colors cursor-pointer border-b-2 ${
                isCommunityActive
                  ? 'text-[#0B1F3A] border-[#C81E1E] font-semibold'
                  : 'border-transparent hover:text-[#0B1F3A]'
              }`}
              aria-expanded={openDropdown === 'community'}
            >
              <span>ข่าวสารและกิจกรรม</span>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>
            {openDropdown === 'community' && (
              <div className="absolute left-0 top-full mt-2 w-60 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50">
                <button
                  type="button"
                  onClick={() => handleGo('news')}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 cursor-pointer ${
                    activePage === 'news' ? 'text-[#C81E1E] font-semibold bg-slate-50' : 'text-slate-700'
                  }`}
                >
                  ข่าวประชาสัมพันธ์
                </button>
                <button
                  type="button"
                  onClick={() => handleGo('activities')}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 cursor-pointer ${
                    activePage === 'activities' ? 'text-[#C81E1E] font-semibold bg-slate-50' : 'text-slate-700'
                  }`}
                >
                  บอร์ดกิจกรรมมูลนิธิ
                </button>
                <button
                  type="button"
                  onClick={() => handleGo('annual-events')}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 cursor-pointer ${
                    activePage === 'annual-events' ? 'text-[#C81E1E] font-semibold bg-slate-50' : 'text-slate-700'
                  }`}
                >
                  บอร์ดงานประจำปี
                </button>
                <button
                  type="button"
                  onClick={() => handleGo('gallery')}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 cursor-pointer ${
                    activePage === 'gallery' ? 'text-[#C81E1E] font-semibold bg-slate-50' : 'text-slate-700'
                  }`}
                >
                  คลังภาพมูลนิธิ
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => handleGo('volunteer')}
            className={`py-2 whitespace-nowrap shrink-0 transition-colors cursor-pointer border-b-2 ${
              activePage === 'volunteer'
                ? 'text-[#0B1F3A] border-[#C81E1E] font-semibold'
                : 'border-transparent hover:text-[#0B1F3A]'
            }`}
          >
            สมัครอาสาสมัคร
          </button>

          <button
            type="button"
            onClick={() => handleGo('contact')}
            className={`py-2 whitespace-nowrap shrink-0 transition-colors cursor-pointer border-b-2 ${
              activePage === 'contact'
                ? 'text-[#0B1F3A] border-[#C81E1E] font-semibold'
                : 'border-transparent hover:text-[#0B1F3A]'
            }`}
          >
            ติดต่อประสานงาน
          </button>
        </nav>

        {/* Zone 3: Actions */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={() => handleGo('contact')}
            className="hidden md:inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-[#C81E1E] border border-red-200 bg-red-50/70 hover:bg-red-100 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums"
          >
            <PhoneCall className="w-4 h-4" />
            <span>แจ้งเหตุ {settings.emergencyPhone}</span>
          </button>

          <button
            type="button"
            onClick={() => handleGo('donations')}
            className="hidden sm:inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#C81E1E] hover:bg-[#9B1C1C] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <HeartHandshake className="w-4 h-4" />
            <span>บริจาคออนไลน์</span>
          </button>

          <button
            type="button"
            onClick={onOpenAdmin}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              isAdminAuthenticated
                ? 'bg-[#0B1F3A] text-white border-[#0B1F3A]'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
            title="ระบบจัดการหลังบ้าน (Admin)"
          >
            {isAdminAuthenticated ? (
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            ) : (
              <Lock className="w-3.5 h-3.5 text-slate-500" />
            )}
            <span className="hidden lg:inline">หลังบ้าน</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="xl:hidden p-2 text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
            aria-label="เปิดเมนู"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile / Tablet Drawer */}
      {mobileOpen && (
        <div className="xl:hidden border-t border-slate-200 bg-white max-h-[80vh] overflow-y-auto px-4 py-4 space-y-1">
          {(
            [
              ['home', '1. หน้าแรก'],
              ['about', '2. เกี่ยวกับมูลนิธิ'],
              ['executives', '3. คณะผู้บริหารและที่ปรึกษา'],
              ['org-chart', '4. ผังองค์กร'],
              ['staff', '5. พนักงานทั้งหมด'],
              ['rescue', '6. พนักงานกู้ชีพ (401–405)'],
              ['news', '7. ข่าวประชาสัมพันธ์'],
              ['activities', '8. กิจกรรมมูลนิธิ'],
              ['annual-events', '9. งานประจำปี'],
              ['donations', '10. รับบริจาคออนไลน์'],
              ['gallery', '11. คลังภาพมูลนิธิ'],
              ['volunteer', '12. สมัครอาสาสมัคร'],
              ['contact', '13. ติดต่อประสานงาน / แจ้งเหตุฉุกเฉิน'],
            ] as [PublicPageId, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => handleGo(id)}
              className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                activePage === id
                  ? 'bg-[#0B1F3A] text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </header>
  );
};
