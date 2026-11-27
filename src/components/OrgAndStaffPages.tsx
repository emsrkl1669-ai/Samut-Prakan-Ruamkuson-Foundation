import React, { useState, useMemo } from 'react';
import {
  Search,
  Download,
  Printer,
  Phone,
  Mail,
  UserCheck,
  Ambulance,
  Radio,
  Clock,
  Building2,
  Edit3,
  Plus,
} from 'lucide-react';
import type {
  PublicAppState,
  Executive,
  ExecutiveTier,
  StaffDepartment,
  RescueUnitCode,
  AdminSectionId,
} from '../types';
import { exportStaffToExcelCsv, POSITION_PRESETS } from '../lib/api';
import { PageHeader, ImageWithFallback, Modal } from './SharedUI';

interface OrgPagesProps {
  state: PublicAppState;
  isAdminAuthenticated: boolean;
  onOpenAdminSection: (section: AdminSectionId) => void;
}

/* =========================================================
 * 1. ABOUT FOUNDATION PAGE
 * ========================================================= */
export const AboutPage: React.FC<OrgPagesProps> = ({
  state,
  isAdminAuthenticated,
  onOpenAdminSection,
}) => {
  const { settings } = state;

  return (
    <div className="w-full">
      <PageHeader
        kicker="เกี่ยวกับองค์กร"
        title={settings.aboutTitle || settings.foundationName}
        subtitle={settings.foundationSubtitle}
        isAdminAuthenticated={isAdminAuthenticated}
        onEditThisPage={() => onOpenAdminSection('settings')}
      />

      <section className="w-full py-12 px-4 sm:px-6 lg:px-10 xl:px-14 bg-white">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
          <div className="lg:col-span-6 space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#0B1F3A]">ประวัติและภารกิจหลัก</h2>
              <p className="mt-4 text-base text-slate-700 leading-relaxed whitespace-pre-line">
                {settings.aboutDescription}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
              <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <h3 className="text-base font-bold text-[#0B1F3A]">พันธกิจ (Mission)</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{settings.aboutMission}</p>
              </div>
              <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <h3 className="text-base font-bold text-[#C81E1E]">วิสัยทัศน์ (Vision)</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{settings.aboutVision}</p>
              </div>
            </div>

            <div className="p-6 rounded-xl bg-[#0B1F3A] text-white space-y-2">
              <p className="text-xs text-slate-300">ที่ตั้งสำนักงานใหญ่และศูนย์วิทยุบัวหลวง</p>
              <p className="text-base font-semibold">{settings.address}</p>
              <p className="text-sm text-slate-300 tabular-nums">
                โทร. {settings.emergencyPhone} , {settings.emergencyPhoneSecondary} · อีเมล {settings.email}
              </p>
            </div>
          </div>

          <div className="lg:col-span-6 min-h-[320px]">
            <ImageWithFallback
              src={settings.aboutImageUrl}
              alt={settings.foundationName}
              className="w-full h-full object-cover rounded-xl border border-slate-200"
            />
          </div>
        </div>
      </section>
    </div>
  );
};

/* =========================================================
 * 2. EXECUTIVES & ORGANIZATIONAL CHART PAGE
 * ========================================================= */
const TIER_DEFINITIONS: { tier: ExecutiveTier; label: string }[] = [
  { tier: 'president', label: 'ประธานมูลนิธิ' },
  { tier: 'vice_president_1', label: 'รองประธานคนที่ 1' },
  { tier: 'vice_president_2', label: 'รองประธานคนที่ 2' },
  { tier: 'manager', label: 'ผู้จัดการมูลนิธิร่วมกุศลสมุทรปราการ' },
  { tier: 'assistant_manager', label: 'ผู้ช่วยผู้จัดการ' },
  { tier: 'secretary', label: 'เลขานุการ' },
  { tier: 'treasurer', label: 'เหรัญญิก' },
  { tier: 'advisor', label: 'คณะที่ปรึกษา' },
];

export const ExecutivesOrgChartPage: React.FC<OrgPagesProps & { mode: 'executives' | 'org-chart' }> = ({
  state,
  mode,
  isAdminAuthenticated,
  onOpenAdminSection,
}) => {
  const [selectedExec, setSelectedExec] = useState<Executive | null>(null);

  const byTier = (tier: ExecutiveTier) =>
    state.executives.filter((e) => e.roleTier === tier);

  const renderNodeCard = (exec: Executive) => (
    <button
      key={exec.id}
      type="button"
      onClick={() => setSelectedExec(exec)}
      className="w-full text-left bg-white border border-slate-200 hover:border-[#0B1F3A] rounded-xl p-4 shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center gap-4"
    >
      <ImageWithFallback
        src={exec.photoUrl}
        alt={exec.name}
        fallbackLabel={exec.name.slice(0, 2)}
        className="w-16 h-16 rounded-full object-cover shrink-0 border border-slate-200"
      />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-[#C81E1E] truncate">{exec.positionTitle}</p>
        <h3 className="text-base font-bold text-[#0B1F3A] truncate mt-0.5">{exec.name}</h3>
        {exec.contact && (
          <p className="text-xs text-slate-500 mt-1 tabular-nums truncate">{exec.contact}</p>
        )}
      </div>
    </button>
  );

  const renderEmptySlot = (label: string) => (
    <div className="w-full bg-slate-50 border border-dashed border-slate-300 rounded-xl p-4 flex items-center justify-between gap-3">
      <div>
        <p className="text-xs font-semibold text-slate-500">{label}</p>
        <p className="text-sm text-slate-400 mt-0.5">ยังไม่ได้ระบุรายชื่อ</p>
      </div>
      {isAdminAuthenticated && (
        <button
          type="button"
          onClick={() => onOpenAdminSection('executives')}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-[#0B1F3A] text-white rounded-lg hover:bg-[#122D52] cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>เพิ่ม</span>
        </button>
      )}
    </div>
  );

  return (
    <div className="w-full">
      <PageHeader
        kicker="โครงสร้างการบริหารงาน"
        title={mode === 'org-chart' ? 'ผังโครงสร้างองค์กร มูลนิธิร่วมกุศลสมุทรปราการ' : 'ผังคณะผู้บริหาร และคณะที่ปรึกษามูลนิธิ'}
        subtitle="แสดงสายบังคับบัญชา โครงสร้างตำแหน่งผู้บริหาร ผู้จัดการมูลนิธิร่วมกุศลสมุทรปราการ ผู้ช่วยผู้จัดการ และคณะที่ปรึกษา"
        isAdminAuthenticated={isAdminAuthenticated}
        onEditThisPage={() => onOpenAdminSection('executives')}
      />

      <section className="w-full py-12 px-4 sm:px-6 lg:px-10 xl:px-14 bg-slate-50">
        {/* Organizational Chart Tree */}
        <div className="space-y-8">
          {/* Level 1: President */}
          <div className="flex flex-col items-center">
            <div className="w-full max-w-md">
              <p className="text-xs font-semibold text-slate-500 text-center mb-2">ประธานมูลนิธิ</p>
              {byTier('president').length > 0
                ? byTier('president').map(renderNodeCard)
                : renderEmptySlot('ประธานมูลนิธิ')}
            </div>
            <div className="w-px h-8 bg-slate-300" />
          </div>

          {/* Level 2: Vice Presidents 1 & 2 */}
          <div className="relative pt-4 border-t border-slate-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-2">รองประธานคนที่ 1</p>
                {byTier('vice_president_1').length > 0
                  ? byTier('vice_president_1').map(renderNodeCard)
                  : renderEmptySlot('รองประธานคนที่ 1')}
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-2">รองประธานคนที่ 2</p>
                {byTier('vice_president_2').length > 0
                  ? byTier('vice_president_2').map(renderNodeCard)
                  : renderEmptySlot('รองประธานคนที่ 2')}
              </div>
            </div>
          </div>

          {/* Level 3: Manager & Assistant Manager (Explicitly Requested) */}
          <div className="relative pt-6 border-t border-slate-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
              <div>
                <p className="text-xs font-semibold text-[#0B1F3A] mb-2">
                  ผู้จัดการมูลนิธิร่วมกุศลสมุทรปราการ
                </p>
                <div className="space-y-3">
                  {byTier('manager').length > 0
                    ? byTier('manager').map(renderNodeCard)
                    : renderEmptySlot('ผู้จัดการมูลนิธิร่วมกุศลสมุทรปราการ')}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-[#0B1F3A] mb-2">ผู้ช่วยผู้จัดการ</p>
                <div className="space-y-3">
                  {byTier('assistant_manager').length > 0
                    ? byTier('assistant_manager').map(renderNodeCard)
                    : renderEmptySlot('ผู้ช่วยผู้จัดการ')}
                </div>
              </div>
            </div>
          </div>

          {/* Level 4: Secretary & Treasurer */}
          <div className="relative pt-6 border-t border-slate-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-2">เลขานุการ</p>
                <div className="space-y-3">
                  {byTier('secretary').length > 0
                    ? byTier('secretary').map(renderNodeCard)
                    : renderEmptySlot('เลขานุการ')}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-2">เหรัญญิก</p>
                <div className="space-y-3">
                  {byTier('treasurer').length > 0
                    ? byTier('treasurer').map(renderNodeCard)
                    : renderEmptySlot('เหรัญญิก')}
                </div>
              </div>
            </div>
          </div>

          {/* Level 5: Advisory Board */}
          <div className="relative pt-6 border-t border-slate-300">
            <div className="max-w-6xl mx-auto">
              <p className="text-xs font-semibold text-slate-500 mb-3">คณะที่ปรึกษามูลนิธิ</p>
              {byTier('advisor').length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {byTier('advisor').map(renderNodeCard)}
                </div>
              ) : (
                <div className="max-w-md">{renderEmptySlot('คณะที่ปรึกษา')}</div>
              )}
            </div>
          </div>

          {/* Org Chart Department Overview when mode === 'org-chart' */}
          {mode === 'org-chart' && (
            <div className="pt-8 border-t border-slate-300">
              <h2 className="text-xl font-bold text-[#0B1F3A] mb-5">โครงสร้างฝ่ายปฏิบัติงานภายใต้การกำกับดูแล</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {(
                  [
                    ['ฝ่ายบริหาร', 'กำกับนโยบาย การเงิน และบริหารงานมูลนิธิ'],
                    ['ฝ่ายธุรการ', 'งานบัญชี สังคมสงเคราะห์ พัสดุ-สโตร์'],
                    ['ฝ่ายรับบริจาค', 'งานต้อนรับผู้มีจิตศรัทธา ออกใบเสร็จรับเงิน'],
                    ['ฝ่ายปฏิบัติการกู้ชีพ-กู้ภัย', 'ชุดกู้ชีพ 401–405 รถบริการ 400 ห้องวิทยุบัวหลวง'],
                    ['ฝ่ายสื่อสารองค์กรและอาคาร', 'ประชาสัมพันธ์ ดูแลสถานที่ และรักษาความปลอดภัย'],
                  ] as const
                ).map(([dept, desc]) => (
                  <div key={dept} className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
                    <Building2 className="w-5 h-5 text-[#C81E1E]" />
                    <h3 className="text-sm font-bold text-slate-900">{dept}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Executive Detail Modal */}
      <Modal
        open={Boolean(selectedExec)}
        onClose={() => setSelectedExec(null)}
        title={selectedExec?.positionTitle || 'รายละเอียดผู้บริหาร'}
      >
        {selectedExec && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row items-center gap-5">
              <ImageWithFallback
                src={selectedExec.photoUrl}
                alt={selectedExec.name}
                fallbackLabel={selectedExec.name}
                className="w-28 h-28 rounded-xl object-cover border border-slate-200 shrink-0"
              />
              <div>
                <p className="text-sm font-semibold text-[#C81E1E]">{selectedExec.positionTitle}</p>
                <h4 className="text-xl font-bold text-[#0B1F3A] mt-1">{selectedExec.name}</h4>
                <p className="text-xs text-slate-500 mt-1">
                  ระดับตำแหน่ง: {TIER_DEFINITIONS.find((t) => t.tier === selectedExec.roleTier)?.label}
                </p>
              </div>
            </div>
            <div className="border-t border-slate-200 pt-4 space-y-3">
              <div>
                <h5 className="text-xs font-semibold text-slate-500 mb-1">ประวัติการทำงานและบทบาทหน้าที่</h5>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {selectedExec.bio || 'ยังไม่มีรายละเอียดประวัติเพิ่มเติม'}
                </p>
              </div>
              {selectedExec.contact && (
                <div>
                  <h5 className="text-xs font-semibold text-slate-500 mb-1">ช่องทางติดต่อ</h5>
                  <p className="text-sm font-medium text-[#0B1F3A] tabular-nums">{selectedExec.contact}</p>
                </div>
              )}
            </div>
            {isAdminAuthenticated && (
              <div className="pt-3 border-t border-slate-200 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedExec(null);
                    onOpenAdminSection('executives');
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#0B1F3A] text-white text-sm font-medium rounded-lg cursor-pointer"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>แก้ไขในระบบหลังบ้าน</span>
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

/* =========================================================
 * 3. ALL STAFF DIRECTORY PAGE
 * ========================================================= */
const DEPARTMENTS: StaffDepartment[] = [
  'ฝ่ายบริหาร',
  'ฝ่ายธุรการ',
  'ฝ่ายรับบริจาค',
  'ฝ่ายสื่อสารองค์กร',
  'ฝ่ายปฏิบัติการ',
  'ฝ่ายอาคารสถานที่',
];

export const StaffDirectoryPage: React.FC<OrgPagesProps> = ({
  state,
  isAdminAuthenticated,
  onOpenAdminSection,
}) => {
  const [query, setQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState<string>('ALL');
  const [positionFilter, setPositionFilter] = useState<string>('ALL');

  const uniquePositions = useMemo(() => {
    const set = new Set<string>(POSITION_PRESETS);
    state.staff.forEach((s) => set.add(s.position));
    return Array.from(set);
  }, [state.staff]);

  const filtered = useMemo(() => {
    return state.staff.filter((s) => {
      const q = query.trim().toLowerCase();
      const matchesQ =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.position.toLowerCase().includes(q) ||
        s.department.toLowerCase().includes(q) ||
        s.employeeCode.toLowerCase().includes(q);
      const matchesDept = deptFilter === 'ALL' || s.department === deptFilter;
      const matchesPos =
        positionFilter === 'ALL' ||
        s.position.toLowerCase().includes(positionFilter.toLowerCase());
      return matchesQ && matchesDept && matchesPos;
    });
  }, [state.staff, query, deptFilter, positionFilter]);

  return (
    <div className="w-full">
      <PageHeader
        kicker="ทำเนียบบุคลากรมูลนิธิ"
        title="ผังพนักงานทั้งหมด มูลนิธิร่วมกุศลสมุทรปราการ"
        subtitle={`ข้อมูลบุคลากรทุกฝ่าย รวมทั้งสิ้น ${state.staff.length} อัตรา พร้อมระบบค้นหาและส่งออกรายงาน`}
        isAdminAuthenticated={isAdminAuthenticated}
        onEditThisPage={() => onOpenAdminSection('staff')}
        actions={
          <div className="flex items-center gap-2 no-print">
            <button
              type="button"
              onClick={() => exportStaffToExcelCsv(filtered)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-[#0B1F3A] hover:bg-slate-100 text-sm font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              <Download className="w-4 h-4" />
              <span>ส่งออก Excel</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์ / PDF</span>
            </button>
          </div>
        }
      />

      <section className="w-full py-10 px-4 sm:px-6 lg:px-10 xl:px-14 bg-slate-50">
        {/* Search & Filter Toolbar */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 mb-8 no-print">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-5 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ค้นหาจากชื่อ-สกุล, รหัสพนักงาน หรือตำแหน่ง..."
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0B1F3A]"
              />
            </div>
            <div className="md:col-span-3">
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0B1F3A]"
              >
                <option value="ALL">ทุกแผนก / ทุกฝ่าย</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-4">
              <select
                value={positionFilter}
                onChange={(e) => setPositionFilter(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0B1F3A]"
              >
                <option value="ALL">ทุกตำแหน่ง</option>
                {uniquePositions.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Grouped or Filtered View */}
        {filtered.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500">
            ไม่พบข้อมูลพนักงานที่ตรงกับเงื่อนไขการค้นหา
          </div>
        ) : (
          <div className="space-y-10">
            {DEPARTMENTS.map((dept) => {
              const members = filtered.filter((s) => s.department === dept);
              if (members.length === 0) return null;

              return (
                <div key={dept} className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <h2 className="text-lg font-bold text-[#0B1F3A]">{dept}</h2>
                    <span className="text-xs font-medium text-slate-500 tabular-nums">
                      {members.length} คน
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {members.map((m) => (
                      <div
                        key={m.id}
                        className="bg-white border border-slate-200 rounded-xl p-4 flex items-start gap-4 hover:border-slate-300 transition-colors"
                      >
                        <ImageWithFallback
                          src={m.photoUrl}
                          alt={m.name}
                          fallbackLabel={m.name.slice(0, 2)}
                          className="w-14 h-14 rounded-lg object-cover border border-slate-200 shrink-0"
                        />
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                            <span className="font-mono tabular-nums">{m.employeeCode}</span>
                            {m.systemRole && (
                              <span className="text-[#C81E1E] font-medium">{m.systemRole}</span>
                            )}
                          </div>
                          <h3 className="text-sm font-bold text-slate-900 truncate">{m.name}</h3>
                          <p className="text-xs font-medium text-[#0B1F3A] line-clamp-2">{m.position}</p>
                          <div className="pt-1.5 space-y-1 text-xs text-slate-600">
                            {m.phone && (
                              <div className="flex items-center gap-1.5 tabular-nums">
                                <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>{m.phone}</span>
                              </div>
                            )}
                            {m.email && (
                              <div className="flex items-center gap-1.5 truncate">
                                <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="truncate">{m.email}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

/* =========================================================
 * 4. RESCUE PERSONNEL (UNITS 401-405) PAGE
 * ========================================================= */
const RESCUE_UNIT_ORDER: RescueUnitCode[] = [
  'หัวหน้าฝ่ายกู้ชีพ',
  '401',
  '402',
  '403',
  '404',
  '405',
  '400',
  'ศูนย์วิทยุ',
];

export const RescueUnitsPage: React.FC<OrgPagesProps> = ({
  state,
  isAdminAuthenticated,
  onOpenAdminSection,
}) => {
  const [unitFilter, setUnitFilter] = useState<string>('ALL');

  const visibleUnits =
    unitFilter === 'ALL'
      ? RESCUE_UNIT_ORDER
      : RESCUE_UNIT_ORDER.filter((u) => u === unitFilter);

  const unitDisplayTitle = (u: RescueUnitCode) => {
    if (u === 'หัวหน้าฝ่ายกู้ชีพ') return 'หัวหน้าฝ่ายกู้ชีพ-กู้ภัย';
    if (u === 'ศูนย์วิทยุ') return 'ศูนย์วิทยุบัวหลวง';
    if (u === '400') return 'รถบริการ 400';
    return `ชุดปฏิบัติการกู้ชีพ-กู้ภัย ${u}`;
  };

  return (
    <div className="w-full">
      <PageHeader
        kicker="ศูนย์วิทยุบัวหลวง · ปฏิบัติการฉุกเฉิน 24 ชั่วโมง"
        title="ผังพนักงานกู้ชีพ-กู้ภัย (ชุดปฏิบัติการ 401–405)"
        subtitle="จัดโครงสร้างตามสายบังคับบัญชาหัวหน้าฝ่ายกู้ชีพ และชุดปฏิบัติการประจำรถกู้ชีพ 401, 402, 403, 404, 405 พร้อมหมายเลขวิทยุสื่อสาร"
        isAdminAuthenticated={isAdminAuthenticated}
        onEditThisPage={() => onOpenAdminSection('rescue')}
      />

      <section className="w-full py-10 px-4 sm:px-6 lg:px-10 xl:px-14 bg-slate-50">
        {/* Unit Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 mb-8">
          <button
            type="button"
            onClick={() => setUnitFilter('ALL')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
              unitFilter === 'ALL'
                ? 'bg-[#0B1F3A] text-white'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            ทุกชุดปฏิบัติการ
          </button>
          {RESCUE_UNIT_ORDER.map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => setUnitFilter(u)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                unitFilter === u
                  ? 'bg-[#C81E1E] text-white'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {u === 'หัวหน้าฝ่ายกู้ชีพ' || u === 'ศูนย์วิทยุ' ? u : `รถกู้ชีพ ${u}`}
            </button>
          ))}
        </div>

        <div className="space-y-8">
          {visibleUnits.map((unit) => {
            const members = state.rescuePersonnel.filter((r) => r.unit === unit);
            if (members.length === 0) return null;

            return (
              <div
                key={unit}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden"
              >
                <div className="px-6 py-4 bg-[#0B1F3A] text-white flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Ambulance className="w-5 h-5 text-red-400" />
                    <h2 className="text-base sm:text-lg font-bold">{unitDisplayTitle(unit)}</h2>
                  </div>
                  <span className="text-xs text-slate-300 tabular-nums">
                    เจ้าหน้าที่ประจำชุด {members.length} นาย
                  </span>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {members.map((person) => (
                    <div
                      key={person.id}
                      className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex items-start gap-4"
                    >
                      <ImageWithFallback
                        src={person.photoUrl}
                        alt={person.name}
                        fallbackLabel={person.unit}
                        className="w-16 h-16 rounded-lg object-cover border border-slate-200 shrink-0"
                      />
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                          <span className="font-mono tabular-nums">{person.officerCode}</span>
                          <span className="font-semibold text-[#C81E1E]">{person.emtLevel}</span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900 truncate">{person.name}</h3>
                        <p className="text-xs font-medium text-[#0B1F3A]">{person.position}</p>
                        <div className="pt-2 border-t border-slate-200/80 grid grid-cols-1 gap-1 text-xs text-slate-600">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>เวร: {person.shift || '-'}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>รถประจำหน่วย: {person.ambulanceCode || '-'}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Radio className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>วิทยุสื่อสาร: {person.radioCallsign || '-'}</span>
                          </div>
                          {person.phone && (
                            <div className="flex items-center gap-1.5 tabular-nums">
                              <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{person.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
