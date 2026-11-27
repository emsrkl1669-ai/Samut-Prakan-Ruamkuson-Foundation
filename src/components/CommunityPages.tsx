import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  MapPin,
  Users,
  FileText,
  ExternalLink,
  LayoutGrid,
  List,
  Images,
  Pin,
  ChevronLeft,
  ChevronRight,
  Plus,
} from 'lucide-react';
import type {
  PublicAppState,
  NewsItem,
  ActivityItem,
  ActivityCategory,
  AnnualEvent,
  GalleryItem,
  GalleryCategory,
  AdminSectionId,
} from '../types';
import { formatThaiDate, isSafeUrl } from '../lib/api';
import { PageHeader, ImageWithFallback, Modal } from './SharedUI';

interface CommunityPagesProps {
  state: PublicAppState;
  isAdminAuthenticated: boolean;
  onOpenAdminSection: (section: AdminSectionId) => void;
}

/* =========================================================
 * 1. NEWS PAGE
 * ========================================================= */
export const NewsPage: React.FC<CommunityPagesProps> = ({
  state,
  isAdminAuthenticated,
  onOpenAdminSection,
}) => {
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);

  return (
    <div className="w-full">
      <PageHeader
        kicker="ข่าวสารและประกาศอย่างเป็นทางการ"
        title="ข่าวประชาสัมพันธ์ มูลนิธิร่วมกุศลสมุทรปราการ"
        subtitle="ติดตามข่าวสาร การแจ้งเตือนภัย ประกาศรับสมัคร และการดำเนินงานสาธารณกุศลของมูลนิธิ"
        isAdminAuthenticated={isAdminAuthenticated}
        onEditThisPage={() => onOpenAdminSection('news')}
      />

      <section className="w-full py-10 px-4 sm:px-6 lg:px-10 xl:px-14 bg-slate-50">
        {state.news.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-4">
            <p className="text-slate-600 text-base">ยังไม่มีข่าวประชาสัมพันธ์ในขณะนี้</p>
            {isAdminAuthenticated && (
              <button
                type="button"
                onClick={() => onOpenAdminSection('news')}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0B1F3A] text-white text-sm font-medium rounded-lg cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>เพิ่มข่าวประชาสัมพันธ์</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {state.news.map((item) => (
              <article
                key={item.id}
                onClick={() => setSelectedNews(item)}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-slate-300 hover:shadow-md transition-all cursor-pointer flex flex-col"
              >
                <div className="aspect-16/10 w-full bg-slate-100 overflow-hidden">
                  <ImageWithFallback
                    src={item.coverImageUrl}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="tabular-nums">{formatThaiDate(item.publishedAt)}</span>
                      {item.authorName && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{item.authorName}</span>
                        </>
                      )}
                    </div>
                    <h2 className="text-lg font-bold text-[#0B1F3A] line-clamp-2">{item.title}</h2>
                    <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed">
                      {item.summary || item.content}
                    </p>
                  </div>
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#C81E1E]">อ่านรายละเอียดข่าว →</span>
                    {item.pdfUrl && (
                      <span className="inline-flex items-center gap-1 text-slate-500">
                        <FileText className="w-3.5 h-3.5" />
                        <span>มีเอกสาร PDF</span>
                      </span>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <Modal
        open={Boolean(selectedNews)}
        onClose={() => setSelectedNews(null)}
        title={selectedNews?.title || 'ข่าวประชาสัมพันธ์'}
        maxWidthClass="max-w-3xl"
      >
        {selectedNews && (
          <div className="space-y-5">
            {selectedNews.coverImageUrl && (
              <ImageWithFallback
                src={selectedNews.coverImageUrl}
                alt={selectedNews.title}
                className="w-full max-h-96 object-cover rounded-xl border border-slate-200"
              />
            )}
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 border-b border-slate-200 pb-3">
              <span className="tabular-nums">เผยแพร่เมื่อ {formatThaiDate(selectedNews.publishedAt)}</span>
              {selectedNews.authorName && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>โดย {selectedNews.authorName}</span>
                </>
              )}
            </div>
            <p className="text-base text-slate-800 leading-relaxed whitespace-pre-line">
              {selectedNews.content || selectedNews.summary}
            </p>
            {selectedNews.galleryUrls.length > 0 && (
              <div className="space-y-2 pt-2">
                <h4 className="text-sm font-bold text-[#0B1F3A]">ภาพประกอบข่าว</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {selectedNews.galleryUrls.map((url, idx) => (
                    <ImageWithFallback
                      key={idx}
                      src={url}
                      alt={`${selectedNews.title} ภาพที่ ${idx + 1}`}
                      className="w-full aspect-4/3 object-cover rounded-lg border border-slate-200"
                    />
                  ))}
                </div>
              </div>
            )}
            {selectedNews.pdfUrl && isSafeUrl(selectedNews.pdfUrl) && (
              <div className="pt-3 border-t border-slate-200">
                <a
                  href={selectedNews.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0B1F3A] text-white text-sm font-medium rounded-lg hover:bg-[#122D52]"
                >
                  <FileText className="w-4 h-4" />
                  <span>เปิด / ดาวน์โหลดเอกสารแนบ (PDF)</span>
                </a>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

/* =========================================================
 * 2. ACTIVITIES BOARD (TIMELINE / CARD / GALLERY)
 * ========================================================= */
const ACTIVITY_CATEGORIES: ActivityCategory[] = [
  'ช่วยเหลือผู้ประสบอัคคีภัย',
  'โครงการใจถึงใจช่วยผู้ป่วยติดเตียงและยากไร้',
  'ช่วยเหลือผู้ประสบภัยหนาว',
  'มอบโลงศพประชาชนทั่วไปและผู้ยากไร้',
  'มอบโลงศพประจำปี ปีละ 2 ครั้ง',
  'สงเคราะห์เผาศพผู้ยากไร้',
  'อบรมกู้ชีพ-CPR',
  'ปฏิบัติการกู้ชีพ-กู้ภัย',
];

export const ActivitiesPage: React.FC<CommunityPagesProps> = ({
  state,
  isAdminAuthenticated,
  onOpenAdminSection,
}) => {
  const [viewMode, setViewMode] = useState<'timeline' | 'cards' | 'gallery'>('timeline');
  const [catFilter, setCatFilter] = useState<string>('ALL');
  const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(null);

  const filtered = useMemo(() => {
    const list =
      catFilter === 'ALL'
        ? state.activities
        : state.activities.filter((a) => a.category === catFilter);
    return [...list].sort((a, b) => b.eventDate.localeCompare(a.eventDate));
  }, [state.activities, catFilter]);

  return (
    <div className="w-full">
      <PageHeader
        kicker="ภารกิจช่วยเหลือประชาชน"
        title="บอร์ดกิจกรรมมูลนิธิร่วมกุศลสมุทรปราการ"
        subtitle="บันทึกการลงพื้นที่ช่วยเหลือผู้ประสบภัย โครงการใจถึงใจช่วยผู้ป่วยติดเตียงและยากไร้ และการปฏิบัติการกู้ชีพ-กู้ภัย"
        isAdminAuthenticated={isAdminAuthenticated}
        onEditThisPage={() => onOpenAdminSection('activities')}
      />

      <section className="w-full py-10 px-4 sm:px-6 lg:px-10 xl:px-14 bg-slate-50">
        {/* Controls Toolbar */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-8 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setCatFilter('ALL')}
              className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                catFilter === 'ALL'
                  ? 'bg-[#0B1F3A] text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              ทุกหมวดหมู่
            </button>
            {ACTIVITY_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCatFilter(cat)}
                className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                  catFilter === cat
                    ? 'bg-[#C81E1E] text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0 self-start lg:self-auto">
            <button
              type="button"
              onClick={() => setViewMode('timeline')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer ${
                viewMode === 'timeline' ? 'bg-white text-[#0B1F3A] shadow-xs' : 'text-slate-600'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Timeline</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer ${
                viewMode === 'cards' ? 'bg-white text-[#0B1F3A] shadow-xs' : 'text-slate-600'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Card</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('gallery')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer ${
                viewMode === 'gallery' ? 'bg-white text-[#0B1F3A] shadow-xs' : 'text-slate-600'
              }`}
            >
              <Images className="w-3.5 h-3.5" />
              <span>Gallery</span>
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500">
            ยังไม่มีกิจกรรมในหมวดหมู่นี้
          </div>
        ) : viewMode === 'timeline' ? (
          /* Facebook-like Timeline Feed */
          <div className="max-w-4xl mx-auto space-y-6">
            {filtered.map((act) => (
              <article
                key={act.id}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden"
              >
                <div className="p-5 sm:p-6 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="font-semibold text-[#C81E1E]">{act.category}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">{formatThaiDate(act.eventDate)}</span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500 tabular-nums">
                      <Users className="w-3.5 h-3.5" />
                      <span>ผู้เข้าร่วม {act.participantCount} คน</span>
                    </span>
                  </div>

                  <h2 className="text-xl font-bold text-[#0B1F3A]">{act.title}</h2>
                  <p className="text-sm sm:text-base text-slate-700 leading-relaxed">
                    {act.description}
                  </p>

                  {act.galleryUrls.length > 0 && (
                    <div
                      className={`grid gap-2 ${
                        act.galleryUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
                      }`}
                    >
                      {act.galleryUrls.slice(0, 4).map((url, idx) => (
                        <div
                          key={idx}
                          onClick={() => setSelectedActivity(act)}
                          className="aspect-16/10 bg-slate-100 rounded-lg overflow-hidden cursor-pointer relative"
                        >
                          <ImageWithFallback
                            src={url}
                            alt={`${act.title} รูปที่ ${idx + 1}`}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                          />
                          {idx === 3 && act.galleryUrls.length > 4 && (
                            <div className="absolute inset-0 bg-slate-950/60 flex items-center justify-center text-white font-bold text-lg">
                              +{act.galleryUrls.length - 4} รูป
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      <span>{act.location || 'จังหวัดสมุทรปราการ'}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedActivity(act)}
                      className="px-4 py-2 bg-[#0B1F3A] hover:bg-[#122D52] text-white font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      ดูรายละเอียดและรูปภาพทั้งหมด
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : viewMode === 'cards' ? (
          /* Card Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((act) => (
              <article
                key={act.id}
                onClick={() => setSelectedActivity(act)}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-all cursor-pointer flex flex-col"
              >
                <div className="aspect-4/3 bg-slate-100 overflow-hidden">
                  <ImageWithFallback
                    src={act.galleryUrls[0]}
                    alt={act.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>{act.category}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">{formatThaiDate(act.eventDate)}</span>
                    </div>
                    <h3 className="text-base font-bold text-[#0B1F3A] line-clamp-2">{act.title}</h3>
                    <p className="text-sm text-slate-600 line-clamp-2">{act.description}</p>
                  </div>
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>{act.location}</span>
                    <span className="font-semibold text-[#C81E1E]">ดูรายละเอียด</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          /* Gallery Mode */
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.flatMap((act) =>
              act.galleryUrls.map((url, idx) => (
                <button
                  key={`${act.id}-${idx}`}
                  type="button"
                  onClick={() => setSelectedActivity(act)}
                  className="group relative aspect-square rounded-xl overflow-hidden bg-slate-200 border border-slate-200 cursor-pointer text-left"
                >
                  <ImageWithFallback
                    src={url}
                    alt={act.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-white">
                    <p className="text-xs font-semibold line-clamp-2">{act.title}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </section>

      <Modal
        open={Boolean(selectedActivity)}
        onClose={() => setSelectedActivity(null)}
        title={selectedActivity?.title || 'รายละเอียดกิจกรรม'}
        maxWidthClass="max-w-3xl"
      >
        {selectedActivity && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 border-b border-slate-200 pb-3">
              <span className="font-semibold text-[#C81E1E]">{selectedActivity.category}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{formatThaiDate(selectedActivity.eventDate)}</span>
              <span aria-hidden="true">·</span>
              <span>{selectedActivity.location}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">ผู้เข้าร่วม {selectedActivity.participantCount} คน</span>
            </div>
            <p className="text-base text-slate-800 leading-relaxed whitespace-pre-line">
              {selectedActivity.description}
            </p>
            {selectedActivity.galleryUrls.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedActivity.galleryUrls.map((url, idx) => (
                  <ImageWithFallback
                    key={idx}
                    src={url}
                    alt={`${selectedActivity.title} ${idx + 1}`}
                    className="w-full aspect-4/3 object-cover rounded-lg border border-slate-200"
                  />
                ))}
              </div>
            )}
            {selectedActivity.mapUrl && isSafeUrl(selectedActivity.mapUrl) && (
              <div className="pt-3 border-t border-slate-200">
                <a
                  href={selectedActivity.mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#0B1F3A] hover:text-[#C81E1E]"
                >
                  <MapPin className="w-4 h-4" />
                  <span>เปิดพิกัดสถานที่ใน Google Maps</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

/* =========================================================
 * 3. ANNUAL EVENTS CALENDAR PAGE
 * ========================================================= */
const THAI_MONTH_NAMES = [
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

const WEEKDAYS_TH = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

export const AnnualEventsPage: React.FC<CommunityPagesProps> = ({
  state,
  isAdminAuthenticated,
  onOpenAdminSection,
}) => {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedEvent, setSelectedEvent] = useState<AnnualEvent | null>(null);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  const monthStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
  const eventsInViewMonth = state.annualEvents.filter((e) =>
    e.eventDate.startsWith(monthStr)
  );
  const pinnedEvents = state.annualEvents.filter((e) => e.isPinned);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  return (
    <div className="w-full">
      <PageHeader
        kicker="กำหนดการและประเพณีสำคัญ"
        title="บอร์ดงานประจำปี มูลนิธิร่วมกุศลสมุทรปราการ"
        subtitle="ปฏิทินกิจกรรมประจำปี งานอบรมกู้ชีพ งานทำบุญประจำปี และกิจกรรมสาธารณกุศลตลอดทั้งปี"
        isAdminAuthenticated={isAdminAuthenticated}
        onEditThisPage={() => onOpenAdminSection('annual-events')}
      />

      <section className="w-full py-10 px-4 sm:px-6 lg:px-10 xl:px-14 bg-slate-50 space-y-8">
        {/* Pinned Important Events */}
        {pinnedEvents.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-base font-bold text-[#0B1F3A] flex items-center gap-2">
              <Pin className="w-4 h-4 text-[#C81E1E]" />
              <span>กิจกรรมสำคัญที่ปักหมุด</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {pinnedEvents.map((evt) => (
                <button
                  key={evt.id}
                  type="button"
                  onClick={() => setSelectedEvent(evt)}
                  className="text-left bg-white border border-red-200 rounded-xl p-4 hover:border-[#C81E1E] transition-colors cursor-pointer space-y-1.5"
                >
                  <p className="text-xs font-semibold text-[#C81E1E] tabular-nums">
                    {formatThaiDate(evt.eventDate)}
                  </p>
                  <h3 className="text-base font-bold text-[#0B1F3A]">{evt.title}</h3>
                  <p className="text-xs text-slate-600 line-clamp-2">{evt.description}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Interactive Full Calendar Grid + Monthly Schedule */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          <div className="xl:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 bg-[#0B1F3A] text-white flex items-center justify-between">
              <h2 className="text-lg font-bold">
                {THAI_MONTH_NAMES[viewMonth]} พ.ศ. {viewYear + 543}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="p-2 hover:bg-white/10 rounded-lg cursor-pointer"
                  aria-label="เดือนก่อนหน้า"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setViewYear(now.getFullYear());
                    setViewMonth(now.getMonth());
                  }}
                  className="px-3 py-1.5 text-xs font-medium bg-white/10 hover:bg-white/20 rounded-lg cursor-pointer"
                >
                  เดือนปัจจุบัน
                </button>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="p-2 hover:bg-white/10 rounded-lg cursor-pointer"
                  aria-label="เดือนถัดไป"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-semibold text-slate-600">
              {WEEKDAYS_TH.map((day) => (
                <div key={day} className="py-2.5">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
                <div key={`empty-${idx}`} className="min-h-[84px] sm:min-h-[104px] border-r border-b border-slate-100 bg-slate-50/50" />
              ))}
              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const dayNum = idx + 1;
                const dateKey = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                const dayEvents = state.annualEvents.filter((e) => e.eventDate === dateKey);
                const isToday =
                  viewYear === now.getFullYear() &&
                  viewMonth === now.getMonth() &&
                  dayNum === now.getDate();

                return (
                  <div
                    key={dayNum}
                    className={`min-h-[84px] sm:min-h-[104px] border-r border-b border-slate-100 p-1.5 sm:p-2 ${
                      isToday ? 'bg-red-50/40' : 'bg-white'
                    }`}
                  >
                    <div
                      className={`text-xs font-semibold tabular-nums mb-1 ${
                        isToday ? 'text-[#C81E1E]' : 'text-slate-700'
                      }`}
                    >
                      {dayNum}
                    </div>
                    <div className="space-y-1">
                      {dayEvents.map((evt) => (
                        <button
                          key={evt.id}
                          type="button"
                          onClick={() => setSelectedEvent(evt)}
                          className="w-full text-left px-1.5 py-1 rounded bg-[#0B1F3A] text-white text-[11px] font-medium truncate hover:bg-[#C81E1E] transition-colors cursor-pointer"
                        >
                          {evt.title}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right List of Events */}
          <div className="xl:col-span-4 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-[#0B1F3A]">
                รายการกิจกรรมทั้งหมด ({state.annualEvents.length})
              </h3>
              {isAdminAuthenticated && (
                <button
                  type="button"
                  onClick={() => onOpenAdminSection('annual-events')}
                  className="text-xs font-semibold text-[#C81E1E] hover:underline cursor-pointer"
                >
                  + เพิ่ม/แก้ไข
                </button>
              )}
            </div>

            {state.annualEvents.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-500 space-y-3">
                <CalendarIcon className="w-8 h-8 text-slate-300 mx-auto" />
                <p>ยังไม่มีกำหนดการงานประจำปีที่บันทึกไว้</p>
                {isAdminAuthenticated && (
                  <button
                    type="button"
                    onClick={() => onOpenAdminSection('annual-events')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0B1F3A] text-white text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>เพิ่มงานประจำปี</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3 max-h-[540px] overflow-y-auto pr-1">
                {[...state.annualEvents]
                  .sort((a, b) => a.eventDate.localeCompare(b.eventDate))
                  .map((evt) => (
                    <button
                      key={evt.id}
                      type="button"
                      onClick={() => setSelectedEvent(evt)}
                      className="w-full text-left p-3.5 rounded-lg border border-slate-200 hover:border-[#0B1F3A] transition-colors cursor-pointer space-y-1"
                    >
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span className="tabular-nums font-medium text-[#C81E1E]">
                          {formatThaiDate(evt.eventDate)}
                        </span>
                        {evt.isPinned && <Pin className="w-3.5 h-3.5 text-[#C81E1E]" />}
                      </div>
                      <p className="text-sm font-bold text-slate-900">{evt.title}</p>
                      {evt.location && (
                        <p className="text-xs text-slate-500">{evt.location}</p>
                      )}
                    </button>
                  ))}
              </div>
            )}

            {eventsInViewMonth.length > 0 && (
              <div className="pt-3 border-t border-slate-200 text-xs text-slate-500 tabular-nums">
                พบ {eventsInViewMonth.length} กิจกรรมในเดือน{THAI_MONTH_NAMES[viewMonth]}
              </div>
            )}
          </div>
        </div>
      </section>

      <Modal
        open={Boolean(selectedEvent)}
        onClose={() => setSelectedEvent(null)}
        title={selectedEvent?.title || 'รายละเอียดงานประจำปี'}
      >
        {selectedEvent && (
          <div className="space-y-4">
            {selectedEvent.imageUrl && (
              <ImageWithFallback
                src={selectedEvent.imageUrl}
                alt={selectedEvent.title}
                className="w-full max-h-72 object-cover rounded-lg border border-slate-200"
              />
            )}
            <div className="text-xs text-slate-500 space-y-1">
              <p className="tabular-nums">วันที่จัดงาน: {formatThaiDate(selectedEvent.eventDate)}</p>
              {selectedEvent.location && <p>สถานที่: {selectedEvent.location}</p>}
            </div>
            <p className="text-sm sm:text-base text-slate-700 leading-relaxed whitespace-pre-line">
              {selectedEvent.description || '-'}
            </p>
            {selectedEvent.pdfUrl && isSafeUrl(selectedEvent.pdfUrl) && (
              <div className="pt-3 border-t border-slate-200">
                <a
                  href={selectedEvent.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#0B1F3A] text-white text-sm font-medium rounded-lg"
                >
                  <FileText className="w-4 h-4" />
                  <span>ดาวน์โหลดเอกสารกำหนดการ (PDF)</span>
                </a>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

/* =========================================================
 * 4. MEDIA GALLERY PAGE
 * ========================================================= */
const GALLERY_CATS: GalleryCategory[] = [
  'งานกู้ชีพ',
  'กู้ภัย',
  'อบรม',
  'งานประจำปี',
  'ช่วยเหลือประชาชน',
  'ผู้บริจาค',
];

export const GalleryPage: React.FC<CommunityPagesProps> = ({
  state,
  isAdminAuthenticated,
  onOpenAdminSection,
}) => {
  const [catFilter, setCatFilter] = useState<string>('ALL');
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryItem | null>(null);

  const filtered =
    catFilter === 'ALL'
      ? state.gallery
      : state.gallery.filter((g) => g.category === catFilter);

  return (
    <div className="w-full">
      <PageHeader
        kicker="คลังภาพภารกิจและกิจกรรม"
        title="คลังภาพมูลนิธิร่วมกุศลสมุทรปราการ"
        subtitle={`ประมวลภาพการปฏิบัติงานกู้ชีพ กู้ภัย บรรเทาสาธารณภัย และกิจกรรมช่วยเหลือประชาชน (${state.gallery.length} ภาพ)`}
        isAdminAuthenticated={isAdminAuthenticated}
        onEditThisPage={() => onOpenAdminSection('gallery')}
      />

      <section className="w-full py-10 px-4 sm:px-6 lg:px-10 xl:px-14 bg-slate-50">
        <div className="flex flex-wrap items-center gap-2 mb-8">
          <button
            type="button"
            onClick={() => setCatFilter('ALL')}
            className={`px-4 py-2 text-sm font-medium rounded-lg cursor-pointer ${
              catFilter === 'ALL'
                ? 'bg-[#0B1F3A] text-white'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            ทั้งหมด ({state.gallery.length})
          </button>
          {GALLERY_CATS.map((cat) => {
            const count = state.gallery.filter((g) => g.category === cat).length;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCatFilter(cat)}
                className={`px-4 py-2 text-sm font-medium rounded-lg cursor-pointer ${
                  catFilter === cat
                    ? 'bg-[#C81E1E] text-white'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500">
            ยังไม่มีรูปภาพในหมวดหมู่นี้
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedPhoto(item)}
                className="group bg-white border border-slate-200 rounded-xl overflow-hidden text-left hover:shadow-md transition-all cursor-pointer"
              >
                <div className="aspect-4/3 bg-slate-100 overflow-hidden">
                  <ImageWithFallback
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-4 space-y-1">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-medium text-[#C81E1E]">{item.category}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">{formatThaiDate(item.uploadedAt)}</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900 line-clamp-2">{item.title}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <Modal
        open={Boolean(selectedPhoto)}
        onClose={() => setSelectedPhoto(null)}
        title={selectedPhoto?.category || 'ภาพกิจกรรม'}
        maxWidthClass="max-w-4xl"
      >
        {selectedPhoto && (
          <div className="space-y-4">
            <ImageWithFallback
              src={selectedPhoto.imageUrl}
              alt={selectedPhoto.title}
              className="w-full max-h-[70vh] object-contain rounded-lg bg-slate-950"
            />
            <p className="text-base font-semibold text-slate-900">{selectedPhoto.title}</p>
            <p className="text-xs text-slate-500 tabular-nums">
              หมวดหมู่: {selectedPhoto.category} · วันที่ {formatThaiDate(selectedPhoto.uploadedAt)}
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
};
