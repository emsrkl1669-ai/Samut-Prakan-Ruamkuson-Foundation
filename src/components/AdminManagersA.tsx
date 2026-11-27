import React, { useState, useEffect } from 'react';
import {
  Save,
  Plus,
  Edit3,
  Trash2,
  Upload,
  Download,
  Printer,
  BarChart3,
  Newspaper,
  Calendar,
  HeartHandshake,
  Users,
  Eye,
} from 'lucide-react';
import type {
  AdminAppState,
  Executive,
  ExecutiveTier,
  StaffMember,
  StaffDepartment,
  RescuePersonnel,
  RescueUnitCode,
  MonthlyStat,
  SiteSettings,
} from '../types';
import {
  apiRequest,
  uploadAdminFile,
  formatCurrency,
  exportStaffToExcelCsv,
  POSITION_PRESETS,
} from '../lib/api';
import { ImageWithFallback, Modal } from './SharedUI';

/* =========================================================
 * 1. DASHBOARD & EDITABLE MONTHLY STATS
 * ========================================================= */
export const AdminDashboardView: React.FC<{
  state: AdminAppState;
  onRefresh: () => Promise<void>;
  onNavigateSection: (s: any) => void;
}> = ({ state, onRefresh, onNavigateSection }) => {
  const [stats, setStats] = useState<MonthlyStat[]>(state.monthlyStats);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    setStats(state.monthlyStats);
  }, [state.monthlyStats]);

  const totalVerifiedDonations = state.donations
    .filter((d) => d.status === 'verified')
    .reduce((sum, d) => sum + d.amount, 0);

  const maxBar = Math.max(
    10,
    ...stats.map((m) => Math.max(m.emsCases, m.rescueCases, m.reliefCases))
  );

  const handleStatChange = (
    idx: number,
    field: 'emsCases' | 'rescueCases' | 'reliefCases',
    value: string
  ) => {
    const num = Math.max(0, Number(value) || 0);
    setStats((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, [field]: num } : row))
    );
  };

  const handleSaveStats = async () => {
    setSaving(true);
    setSavedMsg('');
    try {
      await apiRequest('/api/admin/monthly-stats', {
        method: 'PUT',
        body: JSON.stringify({ monthlyStats: stats }),
      });
      await onRefresh();
      setSavedMsg('บันทึกสถิติรายเดือนเรียบร้อยแล้ว (ซิงค์ทุกเครื่องทันที)');
      setTimeout(() => setSavedMsg(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          { label: 'ข่าวประชาสัมพันธ์', val: state.news.length, unit: 'ข่าว', icon: Newspaper, sec: 'news' },
          { label: 'กิจกรรมมูลนิธิ', val: state.activities.length, unit: 'กิจกรรม', icon: Calendar, sec: 'activities' },
          { label: 'รายการบริจาค', val: state.donations.length, unit: 'รายการ', icon: HeartHandshake, sec: 'donations' },
          { label: 'ใบสมัครอาสาสมัคร', val: state.volunteers.length, unit: 'คน', icon: Users, sec: 'volunteers' },
          { label: 'ผู้เข้าชมเว็บไซต์', val: state.visitorCount, unit: 'ครั้ง', icon: Eye, sec: 'dashboard' },
          {
            label: 'ยอดบริจาครวม (ตรวจสอบแล้ว)',
            val: formatCurrency(totalVerifiedDonations),
            unit: 'บาท',
            icon: HeartHandshake,
            sec: 'donations',
          },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <button
              key={kpi.label}
              type="button"
              onClick={() => onNavigateSection(kpi.sec)}
              className="text-left bg-white border border-slate-200 rounded-xl p-4 hover:border-[#0B1F3A] transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-medium truncate">{kpi.label}</span>
                <Icon className="w-4 h-4 text-[#0B1F3A] shrink-0" />
              </div>
              <p className="text-2xl font-extrabold text-slate-900 tabular-nums">
                {kpi.val}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">{kpi.unit}</p>
            </button>
          );
        })}
      </div>

      {/* Monthly Chart + Editable Table */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2.5">
            <BarChart3 className="w-5 h-5 text-[#C81E1E]" />
            <div>
              <h2 className="text-lg font-bold text-[#0B1F3A]">
                สรุปสถิติผู้ป่วย กู้ชีพ กู้ภัย และบรรเทาสาธารณภัย รายเดือน (แก้ไขได้)
              </h2>
              <p className="text-xs text-slate-500">
                ปรับแก้ตัวเลขรายเดือนในตารางด้านล่างแล้วกดบันทึก กราฟและข้อมูลทุกเครื่องจะอัปเดตทันที
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {savedMsg && <span className="text-xs font-semibold text-emerald-700">{savedMsg}</span>}
            <button
              type="button"
              onClick={handleSaveStats}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#0B1F3A] hover:bg-[#122D52] text-white text-sm font-semibold rounded-lg cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'กำลังบันทึก...' : 'บันทึกสถิติรายเดือน'}</span>
            </button>
          </div>
        </div>

        {/* Visual Bar Chart */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-5 text-xs font-medium text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-[#0B1F3A]" /> ผู้ป่วยกู้ชีพ (EMS)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-[#C81E1E]" /> อุบัติเหตุ-กู้ภัย
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-amber-500" /> สงเคราะห์-บรรเทาภัย
            </span>
          </div>

          <div className="grid grid-cols-6 sm:grid-cols-12 gap-2 items-end h-48 pt-4 border-b border-slate-200 pb-2">
            {stats.map((m) => (
              <div key={m.id} className="flex flex-col items-center h-full justify-end gap-1">
                <div className="flex items-end gap-0.5 h-36 w-full justify-center">
                  <div
                    className="w-2.5 bg-[#0B1F3A] rounded-t-xs transition-all"
                    style={{ height: `${Math.max(4, Math.round((m.emsCases / maxBar) * 100))}%` }}
                    title={`ผู้ป่วยกู้ชีพ: ${m.emsCases}`}
                  />
                  <div
                    className="w-2.5 bg-[#C81E1E] rounded-t-xs transition-all"
                    style={{ height: `${Math.max(4, Math.round((m.rescueCases / maxBar) * 100))}%` }}
                    title={`อุบัติเหตุ-กู้ภัย: ${m.rescueCases}`}
                  />
                  <div
                    className="w-2.5 bg-amber-500 rounded-t-xs transition-all"
                    style={{ height: `${Math.max(4, Math.round((m.reliefCases / maxBar) * 100))}%` }}
                    title={`สงเคราะห์: ${m.reliefCases}`}
                  />
                </div>
                <span className="text-[11px] font-medium text-slate-600">{m.monthLabel}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Inline Editable Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
              <tr>
                <th className="px-4 py-3">เดือน (พ.ศ. 2569)</th>
                <th className="px-4 py-3">ผู้ป่วยกู้ชีพ (ราย)</th>
                <th className="px-4 py-3">อุบัติเหตุ-กู้ภัย (ครั้ง)</th>
                <th className="px-4 py-3">สงเคราะห์-บรรเทาภัย (ครั้ง)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats.map((m, idx) => (
                <tr key={m.id}>
                  <td className="px-4 py-2 font-semibold text-slate-800">{m.monthLabel}</td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      min="0"
                      value={m.emsCases}
                      onChange={(e) => handleStatChange(idx, 'emsCases', e.target.value)}
                      className="w-28 px-3 py-1.5 border border-slate-300 rounded-md text-sm tabular-nums"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      min="0"
                      value={m.rescueCases}
                      onChange={(e) => handleStatChange(idx, 'rescueCases', e.target.value)}
                      className="w-28 px-3 py-1.5 border border-slate-300 rounded-md text-sm tabular-nums"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      min="0"
                      value={m.reliefCases}
                      onChange={(e) => handleStatChange(idx, 'reliefCases', e.target.value)}
                      className="w-28 px-3 py-1.5 border border-slate-300 rounded-md text-sm tabular-nums"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

/* =========================================================
 * 2. SITE SETTINGS & ORGANIZATION CONFIG
 * ========================================================= */
export const AdminSettingsView: React.FC<{
  state: AdminAppState;
  onRefresh: () => Promise<void>;
}> = ({ state, onRefresh }) => {
  const [form, setForm] = useState<SiteSettings>(state.settings);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    setForm(state.settings);
  }, [state.settings]);

  const handleImageUpload = async (
    field: 'logoUrl' | 'heroBannerUrl' | 'aboutImageUrl' | 'qrEdonationUrl' | 'qrPromptpayUrl',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const res = await uploadAdminFile(file);
    setForm((prev) => ({ ...prev, [field]: res.url }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      await apiRequest('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify(form),
      });
      await onRefresh();
      setMsg('บันทึกการตั้งค่าเว็บไซต์และข้อมูลองค์กรเรียบร้อยแล้ว');
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-5">
        <div>
          <h2 className="text-lg font-bold text-[#0B1F3A]">ตั้งค่าเว็บไซต์และข้อมูลองค์กร</h2>
          <p className="text-xs text-slate-500">
            แก้ไขชื่อมูลนิธิ โลโก้ แบนเนอร์ หน้าเกี่ยวกับมูลนิธิ ข้อมูลติดต่อ แผนที่ เป้าหมายและบัญชี/QR รับบริจาค
          </p>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#C81E1E] hover:bg-[#9B1C1C] text-white text-sm font-semibold rounded-lg cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่าทั้งหมด'}</span>
        </button>
      </div>

      {msg && (
        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm font-medium">
          {msg}
        </div>
      )}

      {/* Identity & Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <h3 className="text-base font-bold text-[#0B1F3A] border-b border-slate-200 pb-2">
          ข้อมูลหลัก & แบนเนอร์หน้าแรก
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อมูลนิธิ</label>
            <input
              type="text"
              value={form.foundationName}
              onChange={(e) => setForm({ ...form, foundationName: e.target.value })}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">คำอธิบายย่อยองค์กร</label>
            <input
              type="text"
              value={form.foundationSubtitle}
              onChange={(e) => setForm({ ...form, foundationSubtitle: e.target.value })}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">หัวข้อแบนเนอร์หลัก</label>
            <input
              type="text"
              value={form.heroTitle}
              onChange={(e) => setForm({ ...form, heroTitle: e.target.value })}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">ข้อความปุ่มหลักบนแบนเนอร์</label>
            <input
              type="text"
              value={form.heroCtaPrimary}
              onChange={(e) => setForm({ ...form, heroCtaPrimary: e.target.value })}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">คำบรรยายบนแบนเนอร์หลัก</label>
          <textarea
            rows={2}
            value={form.heroSubtitle}
            onChange={(e) => setForm({ ...form, heroSubtitle: e.target.value })}
            className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700">โลโก้มูลนิธิ</label>
            <div className="flex items-center gap-4">
              <ImageWithFallback
                src={form.logoUrl}
                alt="โลโก้"
                className="w-16 h-16 object-contain rounded-full border border-slate-200 bg-slate-50"
              />
              <label className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-xs font-semibold rounded-lg cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>อัปโหลดโลโก้ใหม่</span>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  onChange={(e) => handleImageUpload('logoUrl', e)}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700">ภาพพื้นหลังแบนเนอร์หลัก</label>
            <div className="flex items-center gap-4">
              <ImageWithFallback
                src={form.heroBannerUrl}
                alt="แบนเนอร์"
                className="w-28 h-16 object-cover rounded-lg border border-slate-200"
              />
              <label className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-xs font-semibold rounded-lg cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>อัปโหลดภาพแบนเนอร์</span>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  onChange={(e) => handleImageUpload('heroBannerUrl', e)}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* About Page */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <h3 className="text-base font-bold text-[#0B1F3A] border-b border-slate-200 pb-2">
          หน้าเกี่ยวกับมูลนิธิ
        </h3>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">หัวข้อหน้าเกี่ยวกับมูลนิธิ</label>
          <input
            type="text"
            value={form.aboutTitle}
            onChange={(e) => setForm({ ...form, aboutTitle: e.target.value })}
            className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">รายละเอียดความเป็นมาและภารกิจ</label>
          <textarea
            rows={4}
            value={form.aboutDescription}
            onChange={(e) => setForm({ ...form, aboutDescription: e.target.value })}
            className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">พันธกิจ (Mission)</label>
            <textarea
              rows={2}
              value={form.aboutMission}
              onChange={(e) => setForm({ ...form, aboutMission: e.target.value })}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">วิสัยทัศน์ (Vision)</label>
            <textarea
              rows={2}
              value={form.aboutVision}
              onChange={(e) => setForm({ ...form, aboutVision: e.target.value })}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
        </div>
        <div className="flex items-center gap-4 pt-1">
          <ImageWithFallback
            src={form.aboutImageUrl}
            alt="เกี่ยวกับมูลนิธิ"
            className="w-28 h-20 object-cover rounded-lg border border-slate-200"
          />
          <label className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-xs font-semibold rounded-lg cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            <span>เปลี่ยนภาพหน้าเกี่ยวกับมูลนิธิ</span>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              onChange={(e) => handleImageUpload('aboutImageUrl', e)}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Contact & Maps */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <h3 className="text-base font-bold text-[#0B1F3A] border-b border-slate-200 pb-2">
          ข้อมูลติดต่อประสานงานและแผนที่ Google Maps
        </h3>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">ที่อยู่สำนักงานใหญ่</label>
          <input
            type="text"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">เบอร์โทรหลัก</label>
            <input
              type="text"
              value={form.emergencyPhone}
              onChange={(e) => setForm({ ...form, emergencyPhone: e.target.value })}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm tabular-nums"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">เบอร์โทรรอง</label>
            <input
              type="text"
              value={form.emergencyPhoneSecondary}
              onChange={(e) => setForm({ ...form, emergencyPhoneSecondary: e.target.value })}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm tabular-nums"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">เบอร์ Line ประสานงาน</label>
            <input
              type="text"
              value={form.linePhone}
              onChange={(e) => setForm({ ...form, linePhone: e.target.value })}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm tabular-nums"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">อีเมลองค์กร</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">ลิงก์ Google Maps</label>
            <input
              type="url"
              value={form.mapsUrl}
              onChange={(e) => setForm({ ...form, mapsUrl: e.target.value })}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Latitude</label>
            <input
              type="number"
              step="any"
              value={form.mapsLat}
              onChange={(e) => setForm({ ...form, mapsLat: Number(e.target.value) })}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm tabular-nums"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Longitude</label>
            <input
              type="number"
              step="any"
              value={form.mapsLng}
              onChange={(e) => setForm({ ...form, mapsLng: Number(e.target.value) })}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm tabular-nums"
            />
          </div>
        </div>
      </div>

      {/* Donation Settings */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <h3 className="text-base font-bold text-[#0B1F3A] border-b border-slate-200 pb-2">
          เป้าหมายรับบริจาค บัญชีธนาคาร และ QR Code
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">เป้าหมายบริจาค (บาท)</label>
            <input
              type="number"
              value={form.donationGoal}
              onChange={(e) => setForm({ ...form, donationGoal: Number(e.target.value) || 0 })}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm tabular-nums"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">ธนาคาร</label>
            <input
              type="text"
              value={form.bankName}
              onChange={(e) => setForm({ ...form, bankName: e.target.value })}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">สาขา</label>
            <input
              type="text"
              value={form.bankBranch}
              onChange={(e) => setForm({ ...form, bankBranch: e.target.value })}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">เลขที่บัญชี</label>
            <input
              type="text"
              value={form.bankAccountNumber}
              onChange={(e) => setForm({ ...form, bankAccountNumber: e.target.value })}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm font-mono tabular-nums"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อบัญชี</label>
            <input
              type="text"
              value={form.bankAccountName}
              onChange={(e) => setForm({ ...form, bankAccountName: e.target.value })}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">รหัสอ้างอิง PromptPay</label>
            <input
              type="text"
              value={form.qrPromptpayRef}
              onChange={(e) => setForm({ ...form, qrPromptpayRef: e.target.value })}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
          <div className="flex items-center gap-4">
            <ImageWithFallback
              src={form.qrEdonationUrl}
              alt="QR e-Donation"
              className="w-20 h-24 object-contain border border-slate-200 rounded-lg"
            />
            <label className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-xs font-semibold rounded-lg cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>อัปโหลด QR e-Donation</span>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                onChange={(e) => handleImageUpload('qrEdonationUrl', e)}
                className="hidden"
              />
            </label>
          </div>
          <div className="flex items-center gap-4">
            <ImageWithFallback
              src={form.qrPromptpayUrl}
              alt="QR พร้อมเพย์"
              className="w-20 h-24 object-contain border border-slate-200 rounded-lg"
            />
            <label className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-xs font-semibold rounded-lg cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>อัปโหลด QR พร้อมเพย์</span>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                onChange={(e) => handleImageUpload('qrPromptpayUrl', e)}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>
    </form>
  );
};

/* =========================================================
 * 3. EXECUTIVES CRUD MANAGER
 * ========================================================= */
const EXEC_TIER_OPTIONS: { value: ExecutiveTier; label: string }[] = [
  { value: 'president', label: 'ประธานมูลนิธิ' },
  { value: 'vice_president_1', label: 'รองประธานคนที่ 1' },
  { value: 'vice_president_2', label: 'รองประธานคนที่ 2' },
  { value: 'manager', label: 'ผู้จัดการมูลนิธิร่วมกุศลสมุทรปราการ' },
  { value: 'assistant_manager', label: 'ผู้ช่วยผู้จัดการ' },
  { value: 'secretary', label: 'เลขานุการ' },
  { value: 'treasurer', label: 'เหรัญญิก' },
  { value: 'advisor', label: 'คณะที่ปรึกษา' },
];

export const AdminExecutivesView: React.FC<{
  state: AdminAppState;
  onRefresh: () => Promise<void>;
}> = ({ state, onRefresh }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Executive | null>(null);
  const [form, setForm] = useState({
    name: '',
    roleTier: 'manager' as ExecutiveTier,
    positionTitle: 'ผู้จัดการมูลนิธิร่วมกุศลสมุทรปราการ',
    bio: '',
    contact: '',
    photoUrl: '',
    sortOrder: 1,
  });

  const openNew = () => {
    setEditing(null);
    setForm({
      name: '',
      roleTier: 'president',
      positionTitle: 'ประธานมูลนิธิ',
      bio: '',
      contact: '',
      photoUrl: '',
      sortOrder: state.executives.length + 1,
    });
    setModalOpen(true);
  };

  const openEdit = (ex: Executive) => {
    setEditing(ex);
    setForm({
      name: ex.name,
      roleTier: ex.roleTier,
      positionTitle: ex.positionTitle,
      bio: ex.bio,
      contact: ex.contact,
      photoUrl: ex.photoUrl,
      sortOrder: ex.sortOrder,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      await apiRequest(`/api/admin/executives/${editing.id}`, {
        method: 'PUT',
        body: JSON.stringify(form),
      });
    } else {
      await apiRequest('/api/admin/executives', {
        method: 'POST',
        body: JSON.stringify(form),
      });
    }
    setModalOpen(false);
    await onRefresh();
  };

  const handleDelete = async (id: string) => {
    await apiRequest(`/api/admin/executives/${id}`, { method: 'DELETE' });
    await onRefresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-5">
        <div>
          <h2 className="text-lg font-bold text-[#0B1F3A]">จัดการคณะผู้บริหารและผังองค์กร</h2>
          <p className="text-xs text-slate-500">
            เพิ่ม แก้ไข ลบ และจัดลำดับตำแหน่งผู้บริหาร (รวมถึงผู้จัดการมูลนิธิร่วมกุศลสมุทรปราการ และผู้ช่วยผู้จัดการ)
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#C81E1E] hover:bg-[#9B1C1C] text-white text-sm font-semibold rounded-lg cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>เพิ่มคณะผู้บริหาร</span>
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
              <tr>
                <th className="px-4 py-3">ลำดับ</th>
                <th className="px-4 py-3">รูปภาพ</th>
                <th className="px-4 py-3">ชื่อ-นามสกุล</th>
                <th className="px-4 py-3">ตำแหน่ง</th>
                <th className="px-4 py-3">ระดับผังองค์กร</th>
                <th className="px-4 py-3">ติดต่อ</th>
                <th className="px-4 py-3 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {state.executives.map((ex) => (
                <tr key={ex.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 tabular-nums font-mono text-xs">{ex.sortOrder}</td>
                  <td className="px-4 py-3">
                    <ImageWithFallback
                      src={ex.photoUrl}
                      alt={ex.name}
                      fallbackLabel={ex.name.slice(0, 2)}
                      className="w-10 h-10 rounded-full object-cover border border-slate-200"
                    />
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{ex.name}</td>
                  <td className="px-4 py-3 text-slate-700">{ex.positionTitle}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {EXEC_TIER_OPTIONS.find((o) => o.value === ex.roleTier)?.label}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-slate-600">{ex.contact}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(ex)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-md cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>แก้ไข</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(ex.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-md cursor-pointer"
                        title="ลบ"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'แก้ไขข้อมูลผู้บริหาร' : 'เพิ่มข้อมูลผู้บริหาร'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">ระดับในผังองค์กร</label>
              <select
                value={form.roleTier}
                onChange={(e) => {
                  const tier = e.target.value as ExecutiveTier;
                  const lbl = EXEC_TIER_OPTIONS.find((o) => o.value === tier)?.label || '';
                  setForm({ ...form, roleTier: tier, positionTitle: lbl });
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              >
                {EXEC_TIER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">ลำดับแสดงผล</label>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) || 1 })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm tabular-nums"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อ-นามสกุล *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อตำแหน่ง *</label>
            <input
              type="text"
              required
              value={form.positionTitle}
              onChange={(e) => setForm({ ...form, positionTitle: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">ช่องทางติดต่อ</label>
            <input
              type="text"
              value={form.contact}
              onChange={(e) => setForm({ ...form, contact: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">ประวัติการทำงาน</label>
            <textarea
              rows={3}
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div className="flex items-center gap-4">
            <ImageWithFallback
              src={form.photoUrl}
              alt="รูปผู้บริหาร"
              className="w-16 h-16 rounded-full object-cover border border-slate-200"
            />
            <label className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-xs font-semibold rounded-lg cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>อัปโหลดรูปภาพ</span>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const r = await uploadAdminFile(f);
                  setForm({ ...form, photoUrl: r.url });
                }}
                className="hidden"
              />
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#0B1F3A] text-white text-sm font-semibold rounded-lg cursor-pointer"
            >
              บันทึกข้อมูล
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

/* =========================================================
 * 4. STAFF CRUD MANAGER
 * ========================================================= */
const STAFF_DEPTS: StaffDepartment[] = [
  'ฝ่ายบริหาร',
  'ฝ่ายธุรการ',
  'ฝ่ายรับบริจาค',
  'ฝ่ายสื่อสารองค์กร',
  'ฝ่ายปฏิบัติการ',
  'ฝ่ายอาคารสถานที่',
];

export const AdminStaffView: React.FC<{
  state: AdminAppState;
  onRefresh: () => Promise<void>;
}> = ({ state, onRefresh }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [form, setForm] = useState({
    employeeCode: '',
    name: '',
    position: 'ผู้จัดการมูลนิธิร่วมกุศลสมุทรปราการ',
    department: 'ฝ่ายบริหาร' as StaffDepartment,
    phone: '',
    email: '',
    photoUrl: '',
    systemRole: '',
    sortOrder: 1,
  });

  const openNew = () => {
    setEditing(null);
    setForm({
      employeeCode: `RKL-${String(state.staff.length + 1).padStart(3, '0')}`,
      name: '',
      position: 'ผู้จัดการมูลนิธิร่วมกุศลสมุทรปราการ',
      department: 'ฝ่ายบริหาร',
      phone: '',
      email: '',
      photoUrl: '',
      systemRole: '',
      sortOrder: state.staff.length + 1,
    });
    setModalOpen(true);
  };

  const openEdit = (s: StaffMember) => {
    setEditing(s);
    setForm({
      employeeCode: s.employeeCode,
      name: s.name,
      position: s.position,
      department: s.department,
      phone: s.phone,
      email: s.email,
      photoUrl: s.photoUrl,
      systemRole: s.systemRole,
      sortOrder: s.sortOrder,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      await apiRequest(`/api/admin/staff/${editing.id}`, {
        method: 'PUT',
        body: JSON.stringify(form),
      });
    } else {
      await apiRequest('/api/admin/staff', {
        method: 'POST',
        body: JSON.stringify(form),
      });
    }
    setModalOpen(false);
    await onRefresh();
  };

  const handleDelete = async (id: string) => {
    await apiRequest(`/api/admin/staff/${id}`, { method: 'DELETE' });
    await onRefresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-5">
        <div>
          <h2 className="text-lg font-bold text-[#0B1F3A]">จัดการข้อมูลพนักงานทั้งหมด ({state.staff.length} คน)</h2>
          <p className="text-xs text-slate-500">
            เพิ่ม แก้ไข ลบ และส่งออกข้อมูลพนักงานเป็นไฟล์ Excel / PDF
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => exportStaffToExcelCsv(state.staff)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>ส่งออก Excel</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>พิมพ์ PDF</span>
          </button>
          <button
            type="button"
            onClick={openNew}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#C81E1E] hover:bg-[#9B1C1C] text-white text-sm font-semibold rounded-lg cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มพนักงาน</span>
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
              <tr>
                <th className="px-4 py-3">รหัส</th>
                <th className="px-4 py-3">ชื่อ-สกุล</th>
                <th className="px-4 py-3">ตำแหน่ง</th>
                <th className="px-4 py-3">ฝ่าย/แผนก</th>
                <th className="px-4 py-3">เบอร์โทร</th>
                <th className="px-4 py-3 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {state.staff.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs tabular-nums text-slate-500">
                    {s.employeeCode}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{s.name}</td>
                  <td className="px-4 py-3 text-slate-700">{s.position}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{s.department}</td>
                  <td className="px-4 py-3 tabular-nums text-slate-600">{s.phone}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(s)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-md cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>แก้ไข</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(s.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-md cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'แก้ไขข้อมูลพนักงาน' : 'เพิ่มข้อมูลพนักงาน'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">รหัสพนักงาน</label>
              <input
                type="text"
                value={form.employeeCode}
                onChange={(e) => setForm({ ...form, employeeCode: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">ฝ่าย / แผนก</label>
              <select
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value as StaffDepartment })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              >
                {STAFF_DEPTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อ-สกุล *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              ตำแหน่ง * (เลือกจากรายการหรือพิมพ์เพิ่มเติมได้)
            </label>
            <input
              type="text"
              required
              list="staff-position-presets"
              value={form.position}
              onChange={(e) => setForm({ ...form, position: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
            <datalist id="staff-position-presets">
              {POSITION_PRESETS.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">เบอร์โทรศัพท์</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">อีเมล</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <ImageWithFallback
              src={form.photoUrl}
              alt="รูปพนักงาน"
              className="w-14 h-14 rounded-lg object-cover border border-slate-200"
            />
            <label className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-xs font-semibold rounded-lg cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>อัปโหลดรูปภาพ</span>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const r = await uploadAdminFile(f);
                  setForm({ ...form, photoUrl: r.url });
                }}
                className="hidden"
              />
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#0B1F3A] text-white text-sm font-semibold rounded-lg cursor-pointer"
            >
              บันทึกพนักงาน
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

/* =========================================================
 * 5. RESCUE UNITS 401-405 CRUD MANAGER
 * ========================================================= */
const UNITS: RescueUnitCode[] = [
  'หัวหน้าฝ่ายกู้ชีพ',
  '401',
  '402',
  '403',
  '404',
  '405',
  '400',
  'ศูนย์วิทยุ',
];

export const AdminRescueView: React.FC<{
  state: AdminAppState;
  onRefresh: () => Promise<void>;
}> = ({ state, onRefresh }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<RescuePersonnel | null>(null);
  const [form, setForm] = useState({
    officerCode: '',
    name: '',
    emtLevel: 'EMT',
    position: '',
    unit: '401' as RescueUnitCode,
    shift: '',
    ambulanceCode: 'รถกู้ชีพ 401',
    radioCallsign: 'บัวหลวง 401',
    phone: '',
    photoUrl: '',
    sortOrder: 1,
  });

  const openNew = () => {
    setEditing(null);
    setForm({
      officerCode: `EMT-${String(state.rescuePersonnel.length + 1).padStart(3, '0')}`,
      name: '',
      emtLevel: 'เจ้าหน้าที่กู้ภัย / EMT',
      position: 'เจ้าหน้าที่กู้ภัย 401',
      unit: '401',
      shift: 'ผลัดปฏิบัติการ 24 ชม.',
      ambulanceCode: 'รถกู้ชีพ 401',
      radioCallsign: 'บัวหลวง 401',
      phone: '',
      photoUrl: '',
      sortOrder: state.rescuePersonnel.length + 1,
    });
    setModalOpen(true);
  };

  const openEdit = (r: RescuePersonnel) => {
    setEditing(r);
    setForm({
      officerCode: r.officerCode,
      name: r.name,
      emtLevel: r.emtLevel,
      position: r.position,
      unit: r.unit,
      shift: r.shift,
      ambulanceCode: r.ambulanceCode,
      radioCallsign: r.radioCallsign,
      phone: r.phone,
      photoUrl: r.photoUrl,
      sortOrder: r.sortOrder,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      await apiRequest(`/api/admin/rescue/${editing.id}`, {
        method: 'PUT',
        body: JSON.stringify(form),
      });
    } else {
      await apiRequest('/api/admin/rescue', {
        method: 'POST',
        body: JSON.stringify(form),
      });
    }
    setModalOpen(false);
    await onRefresh();
  };

  const handleDelete = async (id: string) => {
    await apiRequest(`/api/admin/rescue/${id}`, { method: 'DELETE' });
    await onRefresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-5">
        <div>
          <h2 className="text-lg font-bold text-[#0B1F3A]">จัดการพนักงานกู้ชีพ-กู้ภัย (ชุด 401–405)</h2>
          <p className="text-xs text-slate-500">
            จัดกลุ่มตามชุดปฏิบัติการ ระดับ EMT เวรปฏิบัติงาน หมายเลขรถพยาบาล และวิทยุสื่อสาร
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#C81E1E] hover:bg-[#9B1C1C] text-white text-sm font-semibold rounded-lg cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>เพิ่มเจ้าหน้าที่กู้ชีพ</span>
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
              <tr>
                <th className="px-4 py-3">ชุดปฏิบัติการ</th>
                <th className="px-4 py-3">รหัส</th>
                <th className="px-4 py-3">ชื่อ-สกุล</th>
                <th className="px-4 py-3">ระดับ / ตำแหน่ง</th>
                <th className="px-4 py-3">รถ / วิทยุ</th>
                <th className="px-4 py-3">เบอร์โทร</th>
                <th className="px-4 py-3 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {state.rescuePersonnel.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-bold text-[#C81E1E]">{r.unit}</td>
                  <td className="px-4 py-3 font-mono text-xs tabular-nums">{r.officerCode}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{r.name}</td>
                  <td className="px-4 py-3 text-xs text-slate-700">
                    <div>{r.emtLevel}</div>
                    <div className="text-slate-500">{r.position}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    <div>{r.ambulanceCode}</div>
                    <div className="text-slate-500">{r.radioCallsign}</div>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-slate-600">{r.phone}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(r)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-md cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>แก้ไข</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(r.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-md cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'แก้ไขข้อมูลเจ้าหน้าที่กู้ชีพ' : 'เพิ่มเจ้าหน้าที่กู้ชีพ'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">ชุดปฏิบัติการ</label>
              <select
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value as RescueUnitCode })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">รหัสเจ้าหน้าที่</label>
              <input
                type="text"
                value={form.officerCode}
                onChange={(e) => setForm({ ...form, officerCode: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อ-สกุล *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">ระดับ EMT</label>
              <input
                type="text"
                value={form.emtLevel}
                onChange={(e) => setForm({ ...form, emtLevel: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">ตำแหน่ง</label>
              <input
                type="text"
                value={form.position}
                onChange={(e) => setForm({ ...form, position: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">เวรปฏิบัติงาน</label>
              <input
                type="text"
                value={form.shift}
                onChange={(e) => setForm({ ...form, shift: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">รถประจำหน่วย</label>
              <input
                type="text"
                value={form.ambulanceCode}
                onChange={(e) => setForm({ ...form, ambulanceCode: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">วิทยุสื่อสาร</label>
              <input
                type="text"
                value={form.radioCallsign}
                onChange={(e) => setForm({ ...form, radioCallsign: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">เบอร์โทรศัพท์</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm tabular-nums"
              />
            </div>
            <div className="flex items-center gap-3 pt-4">
              <ImageWithFallback
                src={form.photoUrl}
                alt="รูปเจ้าหน้าที่"
                className="w-12 h-12 rounded-lg object-cover border border-slate-200"
              />
              <label className="inline-flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-xs font-semibold rounded-lg cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>อัปโหลดรูป</span>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const r = await uploadAdminFile(f);
                    setForm({ ...form, photoUrl: r.url });
                  }}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#0B1F3A] text-white text-sm font-semibold rounded-lg cursor-pointer"
            >
              บันทึกข้อมูล
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
