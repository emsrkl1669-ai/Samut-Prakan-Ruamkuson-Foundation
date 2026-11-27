import React from 'react';
import { Phone, Mail, MapPin, ExternalLink, Lock } from 'lucide-react';
import type { PublicPageId, SiteSettings } from '../types';
import { ImageWithFallback } from './SharedUI';

interface FooterProps {
  settings: SiteSettings;
  onNavigate: (page: PublicPageId) => void;
  onOpenAdmin: () => void;
}

export const Footer: React.FC<FooterProps> = ({ settings, onNavigate, onOpenAdmin }) => {
  const go = (page: PublicPageId) => {
    onNavigate(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="w-full bg-[#061325] text-slate-300 border-t border-slate-800 no-print">
      <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Column 1: Identity */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <ImageWithFallback
                src={settings.logoUrl}
                alt={settings.foundationName}
                className="w-12 h-12 object-contain rounded-full bg-white p-1 shrink-0"
              />
              <div>
                <h2 className="text-base font-bold text-white">{settings.foundationName}</h2>
                <p className="text-xs text-slate-400">{settings.foundationSubtitle}</p>
              </div>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              องค์กรสาธารณกุศลและหน่วยกู้ชีพ-กู้ภัย ให้บริการช่วยเหลือผู้ป่วยฉุกเฉิน อุบัติภัย และสงเคราะห์ผู้ยากไร้ในจังหวัดสมุทรปราการตลอด 24 ชั่วโมง
            </p>
          </div>

          {/* Column 2: Quick Menu */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">โครงสร้างองค์กรและบุคลากร</h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button type="button" onClick={() => go('about')} className="hover:text-white transition-colors cursor-pointer">
                  เกี่ยวกับมูลนิธิ
                </button>
              </li>
              <li>
                <button type="button" onClick={() => go('executives')} className="hover:text-white transition-colors cursor-pointer">
                  คณะผู้บริหารและที่ปรึกษา
                </button>
              </li>
              <li>
                <button type="button" onClick={() => go('org-chart')} className="hover:text-white transition-colors cursor-pointer">
                  ผังองค์กร
                </button>
              </li>
              <li>
                <button type="button" onClick={() => go('staff')} className="hover:text-white transition-colors cursor-pointer">
                  ทำเนียบพนักงานทั้งหมด
                </button>
              </li>
              <li>
                <button type="button" onClick={() => go('rescue')} className="hover:text-white transition-colors cursor-pointer">
                  พนักงานกู้ชีพ ชุด 401–405
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Community & Actions */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">กิจกรรมและสาธารณกุศล</h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button type="button" onClick={() => go('news')} className="hover:text-white transition-colors cursor-pointer">
                  ข่าวประชาสัมพันธ์
                </button>
              </li>
              <li>
                <button type="button" onClick={() => go('activities')} className="hover:text-white transition-colors cursor-pointer">
                  บอร์ดกิจกรรมมูลนิธิ
                </button>
              </li>
              <li>
                <button type="button" onClick={() => go('annual-events')} className="hover:text-white transition-colors cursor-pointer">
                  ปฏิทินงานประจำปี
                </button>
              </li>
              <li>
                <button type="button" onClick={() => go('donations')} className="hover:text-white transition-colors cursor-pointer">
                  ร่วมบริจาคออนไลน์ (e-Donation)
                </button>
              </li>
              <li>
                <button type="button" onClick={() => go('volunteer')} className="hover:text-white transition-colors cursor-pointer">
                  สมัครอาสาสมัครกู้ภัย
                </button>
              </li>
            </ul>
          </div>

          {/* Column 4: Real Contact Info */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">ติดต่อประสานงาน / แจ้งเหตุ 24 ชม.</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-red-400 shrink-0 mt-1" />
                <span className="leading-relaxed">{settings.address}</span>
              </div>
              <div className="flex items-center gap-2.5 tabular-nums">
                <Phone className="w-4 h-4 text-red-400 shrink-0" />
                <span>
                  {settings.emergencyPhone}
                  {settings.emergencyPhoneSecondary ? ` , ${settings.emergencyPhoneSecondary}` : ''}
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-red-400 shrink-0" />
                <a href={`mailto:${settings.email}`} className="hover:text-white transition-colors">
                  {settings.email}
                </a>
              </div>
              <div className="pt-2 flex flex-wrap gap-3">
                {settings.facebookUrl && (
                  <a
                    href={settings.facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-slate-300 hover:text-white underline underline-offset-4"
                  >
                    <span>Facebook</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {settings.lineUrl && (
                  <a
                    href={settings.lineUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-slate-300 hover:text-white underline underline-offset-4"
                  >
                    <span>Line Official</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {settings.mapsUrl && (
                  <a
                    href={settings.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-slate-300 hover:text-white underline underline-offset-4"
                  >
                    <span>Google Maps</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>
            © {new Date().getFullYear() + 543} {settings.foundationName}. สงวนลิขสิทธิ์.
          </p>
          <button
            type="button"
            onClick={onOpenAdmin}
            className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>เข้าสู่ระบบจัดการหลังบ้าน (Admin Management System)</span>
          </button>
        </div>
      </div>
    </footer>
  );
};
