import React, { useState } from 'react';
import {
  Plus,
  Edit3,
  Trash2,
  Download,
  ShieldCheck,
  Database,
  History,
  BookOpen,
} from 'lucide-react';
import type { AdminAppState, AdminRole, AdminUserPublic } from '../types';
import { apiRequest, getAuthToken, formatThaiDate } from '../lib/api';
import { Modal } from './SharedUI';

const ROLES: AdminRole[] = [
  'Super Admin',
  'Admin',
  'ประชาสัมพันธ์',
  'การเงิน',
  'หัวหน้ากู้ชีพ',
];

export const AdminUsersView: React.FC<{
  state: AdminAppState;
  onRefresh: () => Promise<void>;
}> = ({ state, onRefresh }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUserPublic | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [pageError, setPageError] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    username: '',
    fullName: '',
    email: '',
    role: 'Admin' as AdminRole,
    password: '',
    active: true,
  });

  const openNew = () => {
    setEditing(null);
    setErrorMsg('');
    setForm({
      username: '',
      fullName: '',
      email: '',
      role: 'Admin',
      password: '',
      active: true,
    });
    setModalOpen(true);
  };

  const openEdit = (u: AdminUserPublic) => {
    setEditing(u);
    setErrorMsg('');
    setForm({
      username: u.username,
      fullName: u.fullName,
      email: u.email,
      role: u.role,
      password: '',
      active: u.active,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setPageError('');
    setSaving(true);
    try {
      if (editing) {
        await apiRequest(`/api/admin/users/${editing.id}`, {
          method: 'PUT',
          body: JSON.stringify(form),
        });
      } else {
        await apiRequest('/api/admin/users', {
          method: 'POST',
          body: JSON.stringify(form),
        });
      }
      setModalOpen(false);
      await onRefresh();
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    setPageError('');
    try {
      await apiRequest(`/api/admin/users/${id}`, { method: 'DELETE' });
      await onRefresh();
    } catch (err) {
      setPageError((err as Error).message);
    }
  };

  const handleDownloadBackup = async () => {
    setPageError('');
    try {
      const token = getAuthToken();
      const res = await fetch('/api/admin/backup', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        throw new Error('ไม่สามารถสำรองฐานข้อมูลได้');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ruamkusol-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setPageError((err as Error).message);
    }
  };

  return (
    <div className="space-y-8">
      {pageError && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-900 text-sm font-medium">
          {pageError}
        </div>
      )}
      {/* Header & Backup */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-5">
        <div>
          <h2 className="text-lg font-bold text-[#0B1F3A]">
            จัดการบัญชีผู้ใช้แอดมิน สิทธิ์การใช้งาน และความปลอดภัย
          </h2>
          <p className="text-xs text-slate-500">
            กำหนดสิทธิ์ Super Admin, Admin, ประชาสัมพันธ์, การเงิน, หัวหน้ากู้ชีพ พร้อมระบบ Audit Log และสำรองฐานข้อมูล
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadBackup}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold rounded-lg cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>สำรองฐานข้อมูล (Backup JSON)</span>
          </button>
          <button
            type="button"
            onClick={openNew}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#C81E1E] hover:bg-[#9B1C1C] text-white text-sm font-semibold rounded-lg cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มบัญชีผู้ดูแลระบบ</span>
          </button>
        </div>
      </div>

      {/* Role Permission Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          ['Super Admin', 'จัดการทุกระบบและบัญชีผู้ใช้'],
          ['Admin', 'ข่าว กิจกรรม บุคลากร อาสาสมัคร'],
          ['ประชาสัมพันธ์', 'ข่าวประชาสัมพันธ์ กิจกรรม คลังภาพ'],
          ['การเงิน', 'รับบริจาค สลิป ใบเสร็จ บัญชี/QR'],
          ['หัวหน้ากู้ชีพ', 'ชุดกู้ชีพ 401–405 สถิติรายเดือน'],
        ].map(([role, desc]) => (
          <div key={role} className="bg-white border border-slate-200 rounded-xl p-4 space-y-1">
            <div className="flex items-center gap-1.5 text-sm font-bold text-[#0B1F3A]">
              <ShieldCheck className="w-4 h-4 text-[#C81E1E]" />
              <span>{role}</span>
            </div>
            <p className="text-xs text-slate-600">{desc}</p>
          </div>
        ))}
      </div>

      {/* Users Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
              <tr>
                <th className="px-4 py-3">ชื่อผู้ใช้</th>
                <th className="px-4 py-3">ชื่อ-นามสกุล</th>
                <th className="px-4 py-3">สิทธิ์การใช้งาน</th>
                <th className="px-4 py-3">สถานะ</th>
                <th className="px-4 py-3 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {state.adminUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-900">
                    {u.username}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{u.fullName}</div>
                    <div className="text-xs text-slate-500">{u.email}</div>
                  </td>
                  <td className="px-4 py-3 font-semibold text-[#0B1F3A]">{u.role}</td>
                  <td className="px-4 py-3 text-xs font-semibold">
                    <span className={u.active ? 'text-emerald-700' : 'text-red-700'}>
                      {u.active ? 'ใช้งานได้' : 'ระงับสิทธิ์'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(u)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-xs font-semibold rounded cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>แก้ไข</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteUser(u.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded cursor-pointer"
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

      {/* Audit Log Viewer */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2">
          <History className="w-4 h-4 text-[#0B1F3A]" />
          <h3 className="text-base font-bold text-[#0B1F3A]">ประวัติการใช้งานระบบ (Audit Log)</h3>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {state.auditLogs.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">ยังไม่มีบันทึกประวัติการใช้งาน</div>
          ) : (
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="px-4 py-2.5">เวลา</th>
                  <th className="px-4 py-2.5">ผู้ดำเนินการ</th>
                  <th className="px-4 py-2.5">สิทธิ์</th>
                  <th className="px-4 py-2.5">กิจกรรม</th>
                  <th className="px-4 py-2.5">เป้าหมาย</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {state.auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-4 py-2 font-mono tabular-nums text-slate-500">
                      {formatThaiDate(log.timestamp)} {new Date(log.timestamp).toLocaleTimeString('th-TH')}
                    </td>
                    <td className="px-4 py-2 font-semibold text-slate-800">{log.actor}</td>
                    <td className="px-4 py-2 text-slate-600">{log.role}</td>
                    <td className="px-4 py-2 text-[#0B1F3A] font-medium">{log.action}</td>
                    <td className="px-4 py-2 text-slate-600">{log.target}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'แก้ไขบัญชีผู้ดูแลระบบ' : 'เพิ่มบัญชีผู้ดูแลระบบ'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-lg">
              {errorMsg}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อผู้ใช้ (Username) *</label>
              <input
                type="text"
                required
                disabled={Boolean(editing)}
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">สิทธิ์การใช้งาน</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as AdminRole })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อ-นามสกุล *</label>
              <input
                type="text"
                required
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
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

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {editing ? 'รหัสผ่านใหม่ (เว้นว่างไว้หากไม่ต้องการเปลี่ยน)' : 'รหัสผ่าน (อย่างน้อย 8 ตัวอักษร) *'}
            </label>
            <input
              type="password"
              required={!editing}
              minLength={editing ? undefined : 8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center gap-6 text-sm">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
              />
              <span>เปิดใช้งานบัญชี</span>
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
              disabled={saving}
              className="px-5 py-2 bg-[#0B1F3A] text-white text-sm font-semibold rounded-lg cursor-pointer disabled:opacity-50"
            >
              {saving ? 'กำลังบันทึก...' : 'บันทึกบัญชีผู้ใช้'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

/* =========================================================
 * SYSTEM ARCHITECTURE, SCHEMA & USER MANUAL VIEW
 * ========================================================= */
export const AdminArchitectureView: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-2">
        <div className="flex items-center gap-2 text-[#0B1F3A]">
          <BookOpen className="w-5 h-5 text-[#C81E1E]" />
          <h2 className="text-lg font-bold">คู่มือการใช้งานระบบหลังบ้าน & โครงสร้างฐานข้อมูลกลาง</h2>
        </div>
        <p className="text-sm text-slate-600">
          เอกสารสรุปโครงสร้างข้อมูล (Database Schema & ER Relationships), แผนผังเว็บไซต์ (Sitemap), และ REST API พร้อมระบบซิงค์เรียลไทม์ (Server-Sent Events)
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-[#0B1F3A] font-bold">
            <Database className="w-4 h-4 text-[#C81E1E]" />
            <h3>โครงสร้างฐานข้อมูลกลาง (Central Server Schema)</h3>
          </div>
          <ul className="text-xs sm:text-sm text-slate-700 space-y-2 leading-relaxed">
            <li><strong>SiteSettings:</strong> ชื่อมูลนิธิ, โลโก้, แบนเนอร์, หน้าเกี่ยวกับมูลนิธิ, ข้อมูลติดต่อ, พิกัด Google Maps, เป้าหมายรับบริจาค, เลขบัญชีธนาคาร, QR e-Donation/PromptPay</li>
            <li><strong>Executives:</strong> คณะผู้บริหารและที่ปรึกษา (ประธาน, รองประธาน 1-2, ผู้จัดการมูลนิธิร่วมกุศลสมุทรปราการ, ผู้ช่วยผู้จัดการ, เลขานุการ, เหรัญญิก, คณะที่ปรึกษา)</li>
            <li><strong>StaffMembers:</strong> ทำเนียบพนักงานทั้งหมดแบ่งตามฝ่าย (รหัสพนักงาน, ชื่อ, ตำแหน่ง, แผนก, โทร, อีเมล)</li>
            <li><strong>RescuePersonnel:</strong> บุคลากรกู้ชีพชุด 401–405, 400, ศูนย์วิทยุ (ระดับ EMT, เวร, รถพยาบาล, วิทยุสื่อสาร)</li>
            <li><strong>News / Activities / AnnualEvents / Gallery:</strong> สื่อประชาสัมพันธ์ กิจกรรม ปฏิทิน และคลังภาพ</li>
            <li><strong>Donations / Volunteers / Contacts / MonthlyStats / AdminUsers / AuditLogs:</strong> ข้อมูลปฏิบัติการและบันทึกความปลอดภัย</li>
          </ul>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
          <h3 className="font-bold text-[#0B1F3A]">การซิงค์ข้อมูลข้ามเครื่องอัตโนมัติ (Server-Sent Events)</h3>
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
            ทุกครั้งที่มีการเพิ่ม แก้ไข หรือลบข้อมูลในระบบหลังบ้าน หรือมีการส่งฟอร์มจากหน้าเว็บสาธารณะ เซิร์ฟเวอร์จะบันทึกลงฐานข้อมูลกลางบนเซิร์ฟเวอร์ทันที และส่งสัญญาณ <code className="font-mono bg-slate-100 px-1 rounded">event: sync</code> ผ่าน <code className="font-mono bg-slate-100 px-1 rounded">GET /api/events</code> ไปยังทุกเครื่องและทุกเบราว์เซอร์ที่เปิดใช้งานอยู่ เพื่ออัปเดตหน้าจอตรงกันโดยไม่ต้องรีเฟรช
          </p>
          <h4 className="font-bold text-[#0B1F3A] pt-2">คู่มือการใช้งานเบื้องต้นสำหรับแอดมิน</h4>
          <ol className="list-decimal list-inside text-xs sm:text-sm text-slate-700 space-y-1.5">
            <li>เมื่อเข้าสู่ระบบแอดมินแล้ว สามารถคลิกปุ่ม <strong>&ldquo;แก้ไขหน้านี้&rdquo;</strong> จากหน้าเว็บสาธารณะเพื่อข้ามมาแก้ไขข้อมูลหน้านั้นได้ทันที</li>
            <li>ใช้เมนู <strong>ตั้งค่าเว็บไซต์</strong> เพื่อเปลี่ยนโลโก้ ภาพแบนเนอร์ เป้าหมายบริจาค และ QR Code ได้ด้วยตนเอง</li>
            <li>แนะนำให้กดปุ่ม <strong>สำรองฐานข้อมูล (Backup JSON)</strong> ในเมนูบัญชีผู้ใช้เป็นประจำ</li>
          </ol>
        </div>
      </div>
    </div>
  );
};
