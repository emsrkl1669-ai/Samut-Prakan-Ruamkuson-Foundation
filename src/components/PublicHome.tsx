import React from 'react';
import {
  PhoneCall,
  HeartHandshake,
  ArrowRight,
  Calendar,
  MapPin,
  Users,
  Ambulance,
  Radio,
  Edit3,
  Newspaper,
  UserPlus,
} from 'lucide-react';
import type { PublicAppState, PublicPageId, AdminSectionId } from '../types';
import { formatCurrency, formatThaiDate } from '../lib/api';
import { ImageWithFallback } from './SharedUI';

interface PublicHomeProps {
  state: PublicAppState;
  onNavigate: (page: PublicPageId) => void;
  isAdminAuthenticated: boolean;
  onOpenAdminSection: (section: AdminSectionId) => void;
}

export const PublicHome: React.FC<PublicHomeProps> = ({
  state,
  onNavigate,
  isAdminAuthenticated,
  onOpenAdminSection,
}) => {
  const { settings, news, activities, donations, staff, rescuePersonnel } = state;

  const verifiedTotal = donations
    .filter((d) => d.status === 'verified')
    .reduce((sum, d) => sum + d.amount, 0);
  const goal = Math.max(1, settings.donationGoal || 2000000);
  const progressPct = Math.min(100, Math.round((verifiedTotal / goal) * 100));

  const latestNews = news.slice(0, 3);
  const featuredActivities = activities.slice(0, 4);

  const go = (page: PublicPageId) => {
    onNavigate(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="w-full">
      {/* Full-Viewport Hero Banner */}
      <section className="relative w-full min-h-[calc(100vh-72px)] flex items-center overflow-hidden bg-[#061325] text-white">
        <div className="absolute inset-0">
          <ImageWithFallback
            src={settings.heroBannerUrl}
            alt={settings.heroTitle}
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#061325]/95 via-[#0B1F3A]/85 to-[#061325]/55" />
        </div>

        <div className="relative z-10 w-full px-4 sm:px-6 lg:px-10 xl:px-14 py-14 sm:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-8 space-y-6">
              <div className="flex items-center gap-4">
                <ImageWithFallback
                  src={settings.logoUrl}
                  alt={settings.foundationName}
                  className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-full bg-white p-1.5 shadow-lg shrink-0"
                />
                <div>
                  <p className="text-xs sm:text-sm font-medium text-red-300 tracking-wide">
                    {settings.foundationSubtitle}
                  </p>
                  <p className="text-xs text-slate-300 mt-0.5 tabular-nums">
                    สายด่วนแจ้งเหตุ 24 ชั่วโมง · {settings.emergencyPhone}
                    {settings.emergencyPhoneSecondary ? ` / ${settings.emergencyPhoneSecondary}` : ''}
                  </p>
                </div>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.15] [text-wrap:balance]">
                {settings.heroTitle || settings.foundationName}
              </h1>

              <p className="text-base sm:text-lg text-slate-200 max-w-3xl leading-relaxed">
                {settings.heroSubtitle}
              </p>

              <div className="flex flex-wrap items-center gap-3 sm:gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => go('activities')}
                  className="inline-flex items-center gap-2.5 px-6 py-3.5 bg-[#C81E1E] hover:bg-[#9B1C1C] text-white font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-lg"
                >
                  <span>{settings.heroCtaPrimary || 'ดูรายละเอียดกิจกรรม'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => go('donations')}
                  className="inline-flex items-center gap-2.5 px-6 py-3.5 bg-white text-[#0B1F3A] hover:bg-slate-100 font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <HeartHandshake className="w-4 h-4 text-[#C81E1E]" />
                  <span>บริจาคออนไลน์</span>
                </button>

                <button
                  type="button"
                  onClick={() => go('contact')}
                  className="inline-flex items-center gap-2.5 px-5 py-3.5 bg-white/10 hover:bg-white/20 text-white border border-white/25 font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <PhoneCall className="w-4 h-4 text-red-300" />
                  <span>แจ้งเหตุฉุกเฉิน</span>
                </button>

                {isAdminAuthenticated && (
                  <button
                    type="button"
                    onClick={() => onOpenAdminSection('settings')}
                    className="inline-flex items-center gap-2 px-4 py-3.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>แก้ไขแบนเนอร์หน้าแรก</span>
                  </button>
                )}
              </div>
            </div>

            {/* Right Panel: Latest News & Operational Summary */}
            <div className="lg:col-span-4 bg-[#0B1F3A]/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Newspaper className="w-4 h-4 text-red-400" />
                  <span>ข่าวประชาสัมพันธ์ล่าสุด</span>
                </h2>
                <button
                  type="button"
                  onClick={() => go('news')}
                  className="text-xs text-slate-300 hover:text-white underline underline-offset-4 cursor-pointer"
                >
                  ดูทั้งหมด
                </button>
              </div>

              {latestNews.length > 0 ? (
                <div className="space-y-4">
                  {latestNews.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => go('news')}
                      className="w-full text-left group block border-b border-slate-800 last:border-0 pb-3 last:pb-0 cursor-pointer"
                    >
                      <p className="text-xs text-slate-400 tabular-nums">
                        {formatThaiDate(item.publishedAt)}
                      </p>
                      <p className="text-sm font-semibold text-white group-hover:text-red-300 transition-colors line-clamp-2 mt-0.5">
                        {item.title}
                      </p>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-4 text-sm text-slate-300 space-y-2">
                  <p>พร้อมรับข่าวสารประชาสัมพันธ์และประกาศภารกิจช่วยเหลือประชาชนจากมูลนิธิ</p>
                  <button
                    type="button"
                    onClick={() =>
                      isAdminAuthenticated ? onOpenAdminSection('news') : go('activities')
                    }
                    className="text-xs font-semibold text-red-300 hover:text-red-200 underline underline-offset-4 cursor-pointer"
                  >
                    {isAdminAuthenticated ? '+ เพิ่มข่าวประชาสัมพันธ์ในระบบหลังบ้าน' : 'ดูกิจกรรมช่วยเหลือประชาชน →'}
                  </button>
                </div>
              )}

              <div className="pt-2 border-t border-slate-700/80 flex items-center justify-between text-xs text-slate-300">
                <span>ศูนย์วิทยุบัวหลวง</span>
                <span className="font-mono font-semibold text-white tabular-nums">
                  {settings.emergencyPhone}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Operational Proof Strip */}
      <section className="w-full bg-white border-b border-slate-200">
        <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="p-2.5 rounded-lg bg-[#0B1F3A] text-white shrink-0">
                <Ambulance className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">ชุดปฏิบัติการกู้ชีพ-กู้ภัย</p>
                <p className="text-xl font-bold text-slate-900 mt-0.5 tabular-nums">ชุด 401 – 405</p>
                <p className="text-xs text-slate-600 mt-1">พร้อมรถบริการ 400 และห้องวิทยุ</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="p-2.5 rounded-lg bg-[#0B1F3A] text-white shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">บุคลากรและเจ้าหน้าที่ปฏิบัติงาน</p>
                <p className="text-xl font-bold text-slate-900 mt-0.5 tabular-nums">
                  {staff.length} นาย
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  กู้ชีพประจำหน่วย {rescuePersonnel.length} นาย
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="p-2.5 rounded-lg bg-[#C81E1E] text-white shrink-0">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">ยอดบริจาคออนไลน์ปัจจุบัน</p>
                <p className="text-xl font-bold text-slate-900 mt-0.5 tabular-nums">
                  {formatCurrency(verifiedTotal)} บาท
                </p>
                <p className="text-xs text-slate-600 mt-1 tabular-nums">
                  เป้าหมาย {formatCurrency(goal)} บาท ({progressPct}%)
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="p-2.5 rounded-lg bg-[#C81E1E] text-white shrink-0">
                <Radio className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">ศูนย์วิทยุบัวหลวง ตลอด 24 ชม.</p>
                <p className="text-xl font-bold text-slate-900 mt-0.5 tabular-nums">
                  {settings.emergencyPhone}
                </p>
                <p className="text-xs text-slate-600 mt-1 tabular-nums">
                  สำรอง {settings.emergencyPhoneSecondary}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Activities Board */}
      <section className="w-full py-14 sm:py-16 px-4 sm:px-6 lg:px-10 xl:px-14 bg-slate-50">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-semibold text-[#C81E1E] tracking-wide">
              ภารกิจสาธารณกุศลและบรรเทาสาธารณภัย
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#0B1F3A] mt-1">
              กิจกรรมช่วยเหลือประชาชนล่าสุด
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {isAdminAuthenticated && (
              <button
                type="button"
                onClick={() => onOpenAdminSection('activities')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-amber-100 text-amber-900 hover:bg-amber-200 rounded-lg cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>จัดการกิจกรรม</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => go('activities')}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0B1F3A] hover:text-[#C81E1E] transition-colors cursor-pointer whitespace-nowrap"
            >
              <span>ดูบอร์ดกิจกรรมทั้งหมด</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {featuredActivities.map((act) => (
            <article
              key={act.id}
              onClick={() => go('activities')}
              className="group bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-slate-300 hover:shadow-md transition-all cursor-pointer flex flex-col"
            >
              <div className="aspect-4/3 w-full overflow-hidden bg-slate-100">
                <ImageWithFallback
                  src={act.galleryUrls[0]}
                  alt={act.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>{act.category}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">{formatThaiDate(act.eventDate)}</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-[#C81E1E] transition-colors line-clamp-2">
                    {act.title}
                  </h3>
                  <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
                    {act.description}
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1 truncate">
                    <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                    <span className="truncate">{act.location || 'สมุทรปราการ'}</span>
                  </span>
                  <span className="font-semibold text-[#0B1F3A] shrink-0">ดูรายละเอียด</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Donation Progress & Real Bank Channel Banner */}
      <section className="w-full py-14 sm:py-16 px-4 sm:px-6 lg:px-10 xl:px-14 bg-white border-y border-slate-200">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div>
              <p className="text-xs font-semibold text-[#C81E1E] tracking-wide">
                ร่วมเป็นส่วนหนึ่งในการต่อลมหายใจและช่วยเหลือผู้ยากไร้
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#0B1F3A] mt-1">
                บอร์ดการรับบริจาคออนไลน์ (e-Donation)
              </h2>
              <p className="text-sm sm:text-base text-slate-600 mt-3 leading-relaxed max-w-2xl">
                เงินบริจาคของท่านนำไปใช้เพื่อจัดซื้ออุปกรณ์การแพทย์ รถพยาบาลฉุกเฉิน ช่วยเหลือผู้ประสบภัยพิบัติ และโครงการสงเคราะห์ผู้ป่วยติดเตียงและผู้ยากไร้ โดยสามารถสแกน QR e-Donation เพื่อลดหย่อนภาษีได้ทันที
              </p>
            </div>

            <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-medium text-slate-500">ยอดรับบริจาคที่ตรวจสอบแล้ว</p>
                  <p className="text-3xl font-extrabold text-[#C81E1E] tabular-nums mt-1">
                    {formatCurrency(verifiedTotal)} บาท
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-slate-500">เป้าหมายโครงการ</p>
                  <p className="text-lg font-bold text-[#0B1F3A] tabular-nums">
                    {formatCurrency(goal)} บาท ({progressPct}%)
                  </p>
                </div>
              </div>
              <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#C81E1E] transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-sm">
                <div className="p-3 bg-white rounded-lg border border-slate-200">
                  <p className="text-xs text-slate-500">{settings.bankName} · {settings.bankBranch}</p>
                  <p className="font-mono font-bold text-[#0B1F3A] text-base mt-0.5 tabular-nums">
                    {settings.bankAccountNumber}
                  </p>
                  <p className="text-xs text-slate-700 mt-0.5">{settings.bankAccountName}</p>
                </div>
                <div className="p-3 bg-white rounded-lg border border-slate-200 flex flex-col justify-between">
                  <p className="text-xs text-slate-500">วัตถุประสงค์การบริจาค</p>
                  <p className="text-xs font-medium text-slate-800 mt-1">
                    รถพยาบาล · อุปกรณ์การแพทย์ · ช่วยเหลือผู้ประสบภัย · ทุนฝึกอบรมกู้ชีพ
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => go('donations')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#C81E1E] hover:bg-[#9B1C1C] text-white font-semibold rounded-lg transition-colors cursor-pointer"
              >
                <HeartHandshake className="w-4 h-4" />
                <span>แจ้งโอน / ร่วมบริจาคออนไลน์</span>
              </button>
              <button
                type="button"
                onClick={() => go('volunteer')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#0B1F3A] hover:bg-[#122D52] text-white font-semibold rounded-lg transition-colors cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>สมัครอาสาสมัคร</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="bg-white border border-slate-200 rounded-xl p-4 text-center space-y-3">
              <div className="aspect-3/4 w-full overflow-hidden rounded-lg bg-slate-50 border border-slate-100">
                <ImageWithFallback
                  src={settings.qrEdonationUrl}
                  alt="QR Code e-Donation มูลนิธิร่วมกุศลสมุทรปราการ"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <p className="text-sm font-bold text-[#0B1F3A]">QR e-Donation</p>
                <p className="text-xs text-slate-500">สแกนบริจาคลดหย่อนภาษีอัตโนมัติ</p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 text-center space-y-3">
              <div className="aspect-3/4 w-full overflow-hidden rounded-lg bg-slate-50 border border-slate-100">
                <ImageWithFallback
                  src={settings.qrPromptpayUrl}
                  alt="QR PromptPay กสิกรไทย มูลนิธิร่วมกุศลสมุทรปราการ"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <p className="text-sm font-bold text-[#0B1F3A]">QR พร้อมเพย์ กสิกรไทย</p>
                <p className="text-xs text-slate-500 font-mono truncate">{settings.qrPromptpayRef}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Portal Directory */}
      <section className="w-full py-14 px-4 sm:px-6 lg:px-10 xl:px-14 bg-slate-50">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button
            type="button"
            onClick={() => go('executives')}
            className="text-left p-6 bg-white border border-slate-200 rounded-xl hover:border-[#0B1F3A] transition-colors cursor-pointer space-y-3"
          >
            <Users className="w-6 h-6 text-[#0B1F3A]" />
            <h3 className="text-lg font-bold text-slate-900">ผังคณะผู้บริหารและพนักงาน</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              ตรวจสอบโครงสร้างคณะผู้บริหาร ผู้จัดการมูลนิธิ ผู้ช่วยผู้จัดการ และทำเนียบพนักงานทุกฝ่าย
            </p>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#C81E1E]">
              <span>เปิดดูโครงสร้างองค์กร</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </button>

          <button
            type="button"
            onClick={() => go('rescue')}
            className="text-left p-6 bg-white border border-slate-200 rounded-xl hover:border-[#0B1F3A] transition-colors cursor-pointer space-y-3"
          >
            <Ambulance className="w-6 h-6 text-[#C81E1E]" />
            <h3 className="text-lg font-bold text-slate-900">หน่วยกู้ชีพ-กู้ภัย 401–405</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              ทำเนียบเจ้าหน้าที่กู้ชีพ-กู้ภัยแยกตามชุดปฏิบัติการ พร้อมหมายเลขรถพยาบาลและวิทยุสื่อสาร
            </p>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#C81E1E]">
              <span>ดูรายชื่อชุดปฏิบัติการ</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </button>

          <button
            type="button"
            onClick={() => go('annual-events')}
            className="text-left p-6 bg-white border border-slate-200 rounded-xl hover:border-[#0B1F3A] transition-colors cursor-pointer space-y-3"
          >
            <Calendar className="w-6 h-6 text-[#0B1F3A]" />
            <h3 className="text-lg font-bold text-slate-900">ปฏิทินงานประจำปีและคลังภาพ</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              ติดตามกำหนดการกิจกรรมประจำปี งานอบรมกู้ชีพ งานทำบุญประจำปี และคลังภาพภารกิจ
            </p>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#C81E1E]">
              <span>เปิดปฏิทินกิจกรรม</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </button>
        </div>
      </section>
    </div>
  );
};
