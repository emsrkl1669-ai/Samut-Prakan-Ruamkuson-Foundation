import React, { useState } from 'react';
import {
  Plus,
  Edit3,
  Trash2,
  Upload,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Pin,
  Printer,
  FileText,
  ImagePlus,
} from 'lucide-react';
import type {
  AdminAppState,
  NewsItem,
  ActivityItem,
  ActivityCategory,
  AnnualEvent,
  DonationRecord,
  DonationPurpose,
  DonationChannel,
  GalleryItem,
  GalleryCategory,
  VolunteerApplication,
  ContactMessage,
} from '../types';
import {
  apiRequest,
  uploadAdminFile,
  uploadAdminMultipleFiles,
  formatCurrency,
  formatThaiDate,
  isSafeUrl,
} from '../lib/api';
import { ImageWithFallback, Modal, ReceiptModal } from './SharedUI';

/* =========================================================
 * 1. NEWS CRUD MANAGER
 * ========================================================= */
export const AdminNewsView: React.FC<{
  state: AdminAppState;
  onRefresh: () => Promise<void>;
}> = ({ state, onRefresh }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<NewsItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [form, setForm] = useState({
    title: '',
    summary: '',
    content: '',
    coverImageUrl: '',
    galleryUrls: [] as string[],
    pdfUrl: '',
    publishedAt: new Date().toISOString().slice(0, 10),
    isPublished: true,
    isApproved: true,
  });

  const openNew = () => {
    setEditing(null);
    setErrMsg('');
    setForm({
      title: '',
      summary: '',
      content: '',
      coverImageUrl: '',
      galleryUrls: [],
      pdfUrl: '',
      publishedAt: new Date().toISOString().slice(0, 10),
      isPublished: true,
      isApproved: true,
    });
    setModalOpen(true);
  };

  const openEdit = (n: NewsItem) => {
    setEditing(n);
    setErrMsg('');
    setForm({
      title: n.title,
      summary: n.summary,
      content: n.content,
      coverImageUrl: n.coverImageUrl,
      galleryUrls: n.galleryUrls,
      pdfUrl: n.pdfUrl,
      publishedAt: n.publishedAt,
      isPublished: n.isPublished,
      isApproved: n.isApproved,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrMsg('');
    try {
      if (editing) {
        await apiRequest(`/api/admin/news/${editing.id}`, {
          method: 'PUT',
          body: JSON.stringify(form),
        });
      } else {
        await apiRequest('/api/admin/news', {
          method: 'POST',
          body: JSON.stringify(form),
        });
      }
      setModalOpen(false);
      await onRefresh();
    } catch (err) {
      setErrMsg((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const toggleField = async (n: NewsItem, field: 'isPublished' | 'isApproved') => {
    setErrMsg('');
    try {
      await apiRequest(`/api/admin/news/${n.id}`, {
        method: 'PUT',
        body: JSON.stringify({ [field]: !n[field] }),
      });
      await onRefresh();
    } catch (err) {
      setErrMsg((err as Error).message);
    }
  };

  const handleDelete = async (id: string) => {
    setErrMsg('');
    try {
      await apiRequest(`/api/admin/news/${id}`, { method: 'DELETE' });
      await onRefresh();
    } catch (err) {
      setErrMsg((err as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      {errMsg && !modalOpen && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl text-sm">
          {errMsg}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-5">
        <div>
          <h2 className="text-lg font-bold text-[#0B1F3A]">จัดการข่าวประชาสัมพันธ์ ({state.news.length} ข่าว)</h2>
          <p className="text-xs text-slate-500">
            เพิ่ม แก้ไข ลบ ซ่อน/แสดง อนุมัติข่าว แนบหลายรูปภาพ และแนบไฟล์ PDF
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#C81E1E] hover:bg-[#9B1C1C] text-white text-sm font-semibold rounded-lg cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>เพิ่มข่าวประชาสัมพันธ์</span>
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {state.news.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            ยังไม่มีข่าวประชาสัมพันธ์ คลิก &ldquo;เพิ่มข่าวประชาสัมพันธ์&rdquo; เพื่อเริ่มต้น
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-4 py-3">วันที่</th>
                  <th className="px-4 py-3">หัวข้อข่าว</th>
                  <th className="px-4 py-3">เผยแพร่</th>
                  <th className="px-4 py-3">อนุมัติ</th>
                  <th className="px-4 py-3 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {state.news.map((n) => (
                  <tr key={n.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 tabular-nums text-xs text-slate-600">
                      {formatThaiDate(n.publishedAt)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{n.title}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => toggleField(n, 'isPublished')}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold cursor-pointer ${
                          n.isPublished ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {n.isPublished ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        <span>{n.isPublished ? 'แสดงอยู่' : 'ซ่อนอยู่'}</span>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => toggleField(n, 'isApproved')}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold cursor-pointer ${
                          n.isApproved ? 'bg-blue-50 text-blue-800' : 'bg-amber-50 text-amber-800'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{n.isApproved ? 'อนุมัติแล้ว' : 'รออนุมัติ'}</span>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(n)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-xs font-semibold rounded-md cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>แก้ไข</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(n.id)}
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
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'แก้ไขข่าวประชาสัมพันธ์' : 'เพิ่มข่าวประชาสัมพันธ์'}
        maxWidthClass="max-w-3xl"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {errMsg && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded-lg text-xs">
              {errMsg}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">หัวข้อข่าว *</label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">วันที่เผยแพร่</label>
              <input
                type="date"
                value={form.publishedAt}
                onChange={(e) => setForm({ ...form, publishedAt: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">รายละเอียดย่อ</label>
            <textarea
              rows={2}
              value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">เนื้อหาข่าวฉบับเต็ม</label>
            <textarea
              rows={5}
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">ภาพปกข่าว</label>
              <div className="flex items-center gap-3">
                <ImageWithFallback
                  src={form.coverImageUrl}
                  alt="ภาพปก"
                  className="w-20 h-14 rounded-lg object-cover border border-slate-200"
                />
                <label className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-xs font-semibold rounded-lg cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploading ? 'กำลังอัปโหลด...' : 'อัปโหลดภาพปก'}</span>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp"
                    disabled={uploading}
                    onChange={async (e) => {
                      const input = e.target;
                      const f = input.files?.[0];
                      if (!f) return;
                      setUploading(true);
                      setErrMsg('');
                      try {
                        const r = await uploadAdminFile(f);
                        setForm((prev) => ({ ...prev, coverImageUrl: r.url }));
                      } catch (err) {
                        setErrMsg((err as Error).message);
                      } finally {
                        setUploading(false);
                        input.value = '';
                      }
                    }}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">แนบไฟล์เอกสาร PDF</label>
              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-xs font-semibold rounded-lg cursor-pointer">
                  <FileText className="w-3.5 h-3.5" />
                  <span>{uploading ? 'กำลังอัปโหลด...' : form.pdfUrl ? 'เปลี่ยนไฟล์ PDF' : 'อัปโหลดไฟล์ PDF'}</span>
                  <input
                    type="file"
                    accept=".pdf"
                    disabled={uploading}
                    onChange={async (e) => {
                      const input = e.target;
                      const f = input.files?.[0];
                      if (!f) return;
                      setUploading(true);
                      setErrMsg('');
                      try {
                        const r = await uploadAdminFile(f);
                        setForm((prev) => ({ ...prev, pdfUrl: r.url }));
                      } catch (err) {
                        setErrMsg((err as Error).message);
                      } finally {
                        setUploading(false);
                        input.value = '';
                      }
                    }}
                    className="hidden"
                  />
                </label>
                {form.pdfUrl && (
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, pdfUrl: '' }))}
                    className="text-xs text-red-600 hover:underline cursor-pointer"
                  >
                    ลบ PDF
                  </button>
                )}
              </div>
              {form.pdfUrl && <p className="text-xs text-emerald-700 mt-1 truncate">{form.pdfUrl}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700">
              รูปภาพประกอบเพิ่มเติม ({form.galleryUrls.length} รูป)
            </label>
            <label className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-xs font-semibold rounded-lg cursor-pointer">
              <ImagePlus className="w-3.5 h-3.5" />
              <span>{uploading ? 'กำลังอัปโหลด...' : 'อัปโหลดหลายรูปภาพ'}</span>
              <input
                type="file"
                multiple
                accept=".jpg,.jpeg,.png,.webp"
                disabled={uploading}
                onChange={async (e) => {
                  const input = e.target;
                  const files = Array.from(input.files || []);
                  if (!files.length) return;
                  setUploading(true);
                  setErrMsg('');
                  try {
                    const res = await uploadAdminMultipleFiles(files);
                    setForm((prev) => ({
                      ...prev,
                      galleryUrls: [...prev.galleryUrls, ...res.files.map((x) => x.url)],
                    }));
                  } catch (err) {
                    setErrMsg((err as Error).message);
                  } finally {
                    setUploading(false);
                    input.value = '';
                  }
                }}
                className="hidden"
              />
            </label>
            {form.galleryUrls.length > 0 && (
              <div className="grid grid-cols-4 gap-2 pt-2">
                {form.galleryUrls.map((url, idx) => (
                  <div key={`${url}-${idx}`} className="relative group">
                    <ImageWithFallback
                      src={url}
                      alt=""
                      className="w-full h-16 object-cover rounded border border-slate-200"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          galleryUrls: prev.galleryUrls.filter((_, i) => i !== idx),
                        }))
                      }
                      aria-label="ลบรูปภาพ"
                      className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold cursor-pointer"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-6 pt-1 text-sm">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isPublished}
                onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
              />
              <span>เผยแพร่บนหน้าเว็บไซต์</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isApproved}
                onChange={(e) => setForm({ ...form, isApproved: e.target.checked })}
              />
              <span>อนุมัติข่าว</span>
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
              disabled={saving || uploading}
              className="px-5 py-2 bg-[#0B1F3A] disabled:opacity-50 text-white text-sm font-semibold rounded-lg cursor-pointer"
            >
              {saving ? 'กำลังบันทึก...' : 'บันทึกข่าว'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

/* =========================================================
 * 2. ACTIVITIES CRUD MANAGER
 * ========================================================= */
const ACT_CATEGORIES: ActivityCategory[] = [
  'ช่วยเหลือผู้ประสบอัคคีภัย',
  'โครงการใจถึงใจช่วยผู้ป่วยติดเตียงและยากไร้',
  'ช่วยเหลือผู้ประสบภัยหนาว',
  'มอบโลงศพประชาชนทั่วไปและผู้ยากไร้',
  'มอบโลงศพประจำปี ปีละ 2 ครั้ง',
  'สงเคราะห์เผาศพผู้ยากไร้',
  'อบรมกู้ชีพ-CPR',
  'ปฏิบัติการกู้ชีพ-กู้ภัย',
];

export const AdminActivitiesView: React.FC<{
  state: AdminAppState;
  onRefresh: () => Promise<void>;
}> = ({ state, onRefresh }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ActivityItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'ช่วยเหลือผู้ประสบอัคคีภัย' as ActivityCategory,
    eventDate: new Date().toISOString().slice(0, 10),
    location: '',
    participantCount: 0,
    mapUrl: '',
    galleryUrls: [] as string[],
  });

  const openNew = () => {
    setEditing(null);
    setErrMsg('');
    setForm({
      title: '',
      description: '',
      category: 'ช่วยเหลือผู้ประสบอัคคีภัย',
      eventDate: new Date().toISOString().slice(0, 10),
      location: 'จังหวัดสมุทรปราการ',
      participantCount: 0,
      mapUrl: '',
      galleryUrls: [],
    });
    setModalOpen(true);
  };

  const openEdit = (a: ActivityItem) => {
    setEditing(a);
    setErrMsg('');
    setForm({
      title: a.title,
      description: a.description,
      category: a.category,
      eventDate: a.eventDate,
      location: a.location,
      participantCount: a.participantCount,
      mapUrl: a.mapUrl,
      galleryUrls: a.galleryUrls,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrMsg('');
    try {
      if (editing) {
        await apiRequest(`/api/admin/activities/${editing.id}`, {
          method: 'PUT',
          body: JSON.stringify(form),
        });
      } else {
        await apiRequest('/api/admin/activities', {
          method: 'POST',
          body: JSON.stringify(form),
        });
      }
      setModalOpen(false);
      await onRefresh();
    } catch (err) {
      setErrMsg((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setErrMsg('');
    try {
      await apiRequest(`/api/admin/activities/${id}`, { method: 'DELETE' });
      await onRefresh();
    } catch (err) {
      setErrMsg((err as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      {errMsg && !modalOpen && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl text-sm">
          {errMsg}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-5">
        <div>
          <h2 className="text-lg font-bold text-[#0B1F3A]">จัดการกิจกรรมมูลนิธิ ({state.activities.length} กิจกรรม)</h2>
          <p className="text-xs text-slate-500">
            เพิ่ม แก้ไข ลบ กิจกรรม แนบรูปภาพ Gallery ไม่จำกัด และพิกัด Google Maps
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#C81E1E] hover:bg-[#9B1C1C] text-white text-sm font-semibold rounded-lg cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>เพิ่มกิจกรรม</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {state.activities.map((a) => (
          <div key={a.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
            <ImageWithFallback
              src={a.galleryUrls[0]}
              alt={a.title}
              className="w-full h-44 object-cover"
            />
            <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
              <div>
                <p className="text-xs font-semibold text-[#C81E1E]">{a.category}</p>
                <h3 className="text-base font-bold text-slate-900 mt-0.5 line-clamp-2">{a.title}</h3>
                <p className="text-xs text-slate-500 mt-1 tabular-nums">
                  {formatThaiDate(a.eventDate)} · {a.galleryUrls.length} รูป
                </p>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => openEdit(a)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-xs font-semibold rounded-md cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>แก้ไข</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(a.id)}
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-md cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'แก้ไขกิจกรรมมูลนิธิ' : 'เพิ่มกิจกรรมมูลนิธิ'}
        maxWidthClass="max-w-3xl"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {errMsg && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded-lg text-xs">
              {errMsg}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อกิจกรรม *</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">หมวดหมู่กิจกรรม</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as ActivityCategory })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              >
                {ACT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">วันที่จัดกิจกรรม</label>
              <input
                type="date"
                value={form.eventDate}
                onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">สถานที่</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">จำนวนผู้เข้าร่วม</label>
              <input
                type="number"
                min="0"
                value={form.participantCount}
                onChange={(e) => setForm({ ...form, participantCount: Number(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm tabular-nums"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">ลิงก์ Google Maps สถานที่</label>
            <input
              type="url"
              value={form.mapUrl}
              onChange={(e) => setForm({ ...form, mapUrl: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">รายละเอียดกิจกรรม</label>
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700">
              รูปภาพ Gallery ({form.galleryUrls.length} รูป)
            </label>
            <label className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-xs font-semibold rounded-lg cursor-pointer">
              <ImagePlus className="w-3.5 h-3.5" />
              <span>{uploading ? 'กำลังอัปโหลด...' : 'อัปโหลดรูปภาพเพิ่ม (เลือกได้หลายรูป)'}</span>
              <input
                type="file"
                multiple
                accept=".jpg,.jpeg,.png,.webp"
                disabled={uploading}
                onChange={async (e) => {
                  const input = e.target;
                  const files = Array.from(input.files || []);
                  if (!files.length) return;
                  setUploading(true);
                  setErrMsg('');
                  try {
                    const res = await uploadAdminMultipleFiles(files);
                    setForm((prev) => ({
                      ...prev,
                      galleryUrls: [...prev.galleryUrls, ...res.files.map((x) => x.url)],
                    }));
                  } catch (err) {
                    setErrMsg((err as Error).message);
                  } finally {
                    setUploading(false);
                    input.value = '';
                  }
                }}
                className="hidden"
              />
            </label>
            {form.galleryUrls.length > 0 && (
              <div className="grid grid-cols-4 gap-2 pt-2">
                {form.galleryUrls.map((url, idx) => (
                  <div key={`${url}-${idx}`} className="relative group">
                    <ImageWithFallback
                      src={url}
                      alt=""
                      className="w-full h-16 object-cover rounded border border-slate-200"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          galleryUrls: prev.galleryUrls.filter((_, i) => i !== idx),
                        }))
                      }
                      aria-label="ลบรูปภาพ"
                      className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold cursor-pointer"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
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
              disabled={saving || uploading}
              className="px-5 py-2 bg-[#0B1F3A] disabled:opacity-50 text-white text-sm font-semibold rounded-lg cursor-pointer"
            >
              {saving ? 'กำลังบันทึก...' : 'บันทึกกิจกรรม'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

/* =========================================================
 * 3. ANNUAL EVENTS CRUD MANAGER
 * ========================================================= */
export const AdminAnnualEventsView: React.FC<{
  state: AdminAppState;
  onRefresh: () => Promise<void>;
}> = ({ state, onRefresh }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AnnualEvent | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [form, setForm] = useState({
    title: '',
    description: '',
    eventDate: new Date().toISOString().slice(0, 10),
    endDate: '',
    location: '',
    isPinned: false,
    imageUrl: '',
    pdfUrl: '',
  });

  const openNew = () => {
    setEditing(null);
    setErrMsg('');
    setForm({
      title: '',
      description: '',
      eventDate: new Date().toISOString().slice(0, 10),
      endDate: '',
      location: 'สำนักงานใหญ่มูลนิธิร่วมกุศลสมุทรปราการ',
      isPinned: false,
      imageUrl: '',
      pdfUrl: '',
    });
    setModalOpen(true);
  };

  const openEdit = (evt: AnnualEvent) => {
    setEditing(evt);
    setErrMsg('');
    setForm({
      title: evt.title,
      description: evt.description,
      eventDate: evt.eventDate,
      endDate: evt.endDate,
      location: evt.location,
      isPinned: evt.isPinned,
      imageUrl: evt.imageUrl,
      pdfUrl: evt.pdfUrl,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrMsg('');
    try {
      if (editing) {
        await apiRequest(`/api/admin/annual-events/${editing.id}`, {
          method: 'PUT',
          body: JSON.stringify(form),
        });
      } else {
        await apiRequest('/api/admin/annual-events', {
          method: 'POST',
          body: JSON.stringify(form),
        });
      }
      setModalOpen(false);
      await onRefresh();
    } catch (err) {
      setErrMsg((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setErrMsg('');
    try {
      await apiRequest(`/api/admin/annual-events/${id}`, { method: 'DELETE' });
      await onRefresh();
    } catch (err) {
      setErrMsg((err as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      {errMsg && !modalOpen && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl text-sm">
          {errMsg}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-5">
        <div>
          <h2 className="text-lg font-bold text-[#0B1F3A]">จัดการปฏิทินงานประจำปี ({state.annualEvents.length} รายการ)</h2>
          <p className="text-xs text-slate-500">
            เพิ่ม แก้ไข ปักหมุดกิจกรรมสำคัญ แนบรูปภาพ และแนบไฟล์ PDF ลงบนปฏิทิน
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#C81E1E] hover:bg-[#9B1C1C] text-white text-sm font-semibold rounded-lg cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>เพิ่มงานประจำปี</span>
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {state.annualEvents.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            ยังไม่มีงานประจำปีในปฏิทิน คลิก &ldquo;เพิ่มงานประจำปี&rdquo; เพื่อเริ่มต้น
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-4 py-3">วันที่</th>
                  <th className="px-4 py-3">ชื่องานประจำปี</th>
                  <th className="px-4 py-3">สถานที่</th>
                  <th className="px-4 py-3">ปักหมุด</th>
                  <th className="px-4 py-3 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {state.annualEvents.map((evt) => (
                  <tr key={evt.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 tabular-nums text-xs">{formatThaiDate(evt.eventDate)}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{evt.title}</td>
                    <td className="px-4 py-3 text-slate-600">{evt.location}</td>
                    <td className="px-4 py-3">
                      {evt.isPinned && <Pin className="w-4 h-4 text-[#C81E1E]" />}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(evt)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-xs font-semibold rounded-md cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>แก้ไข</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(evt.id)}
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
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'แก้ไขงานประจำปี' : 'เพิ่มงานประจำปี'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          {errMsg && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded-lg text-xs">
              {errMsg}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่องานประจำปี *</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">วันที่จัดงาน *</label>
              <input
                type="date"
                required
                value={form.eventDate}
                onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">สถานที่</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">รายละเอียด</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-xs font-semibold rounded-lg cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploading ? 'กำลังอัปโหลด...' : form.imageUrl ? 'เปลี่ยนรูปภาพ' : 'แนบรูปภาพ'}</span>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp"
                    disabled={uploading}
                    onChange={async (e) => {
                      const input = e.target;
                      const f = input.files?.[0];
                      if (!f) return;
                      setUploading(true);
                      setErrMsg('');
                      try {
                        const r = await uploadAdminFile(f);
                        setForm((prev) => ({ ...prev, imageUrl: r.url }));
                      } catch (err) {
                        setErrMsg((err as Error).message);
                      } finally {
                        setUploading(false);
                        input.value = '';
                      }
                    }}
                    className="hidden"
                  />
                </label>
                {form.imageUrl && (
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, imageUrl: '' }))}
                    className="text-xs text-red-600 hover:underline cursor-pointer"
                  >
                    ลบรูป
                  </button>
                )}
              </div>
              {form.imageUrl && (
                <ImageWithFallback
                  src={form.imageUrl}
                  alt="ภาพประกอบงานประจำปี"
                  className="w-28 h-20 rounded-lg object-cover border border-slate-200"
                />
              )}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-xs font-semibold rounded-lg cursor-pointer">
                  <FileText className="w-3.5 h-3.5" />
                  <span>{uploading ? 'กำลังอัปโหลด...' : form.pdfUrl ? 'เปลี่ยนไฟล์ PDF' : 'แนบไฟล์ PDF'}</span>
                  <input
                    type="file"
                    accept=".pdf"
                    disabled={uploading}
                    onChange={async (e) => {
                      const input = e.target;
                      const f = input.files?.[0];
                      if (!f) return;
                      setUploading(true);
                      setErrMsg('');
                      try {
                        const r = await uploadAdminFile(f);
                        setForm((prev) => ({ ...prev, pdfUrl: r.url }));
                      } catch (err) {
                        setErrMsg((err as Error).message);
                      } finally {
                        setUploading(false);
                        input.value = '';
                      }
                    }}
                    className="hidden"
                  />
                </label>
                {form.pdfUrl && (
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, pdfUrl: '' }))}
                    className="text-xs text-red-600 hover:underline cursor-pointer"
                  >
                    ลบ PDF
                  </button>
                )}
              </div>
              {form.pdfUrl && (
                <p className="text-xs text-emerald-700 truncate">แนบแล้ว: {form.pdfUrl}</p>
              )}
            </div>
          </div>
          <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={form.isPinned}
              onChange={(e) => setForm({ ...form, isPinned: e.target.checked })}
            />
            <span>ปักหมุดกิจกรรมสำคัญไว้ด้านบน</span>
          </label>
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
              disabled={saving || uploading}
              className="px-5 py-2 bg-[#0B1F3A] disabled:opacity-50 text-white text-sm font-semibold rounded-lg cursor-pointer"
            >
              {saving ? 'กำลังบันทึก...' : 'บันทึกงานประจำปี'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

/* =========================================================
 * 4. DONATIONS CRUD & RECEIPTS MANAGER
 * ========================================================= */
export const AdminDonationsView: React.FC<{
  state: AdminAppState;
  onRefresh: () => Promise<void>;
}> = ({ state, onRefresh }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DonationRecord | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [receiptDonation, setReceiptDonation] = useState<DonationRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [form, setForm] = useState({
    donorName: '',
    amount: 0,
    purpose: 'รถพยาบาล' as DonationPurpose,
    channel: 'โอนธนาคารกสิกรไทย' as DonationChannel,
    donatedAt: new Date().toISOString().slice(0, 10),
    status: 'verified' as 'pending' | 'verified' | 'rejected',
    note: '',
  });

  const openNew = () => {
    setEditing(null);
    setErrMsg('');
    setForm({
      donorName: '',
      amount: 500,
      purpose: 'รถพยาบาล',
      channel: 'โอนธนาคารกสิกรไทย',
      donatedAt: new Date().toISOString().slice(0, 10),
      status: 'verified',
      note: '',
    });
    setModalOpen(true);
  };

  const openEdit = (d: DonationRecord) => {
    setEditing(d);
    setErrMsg('');
    setForm({
      donorName: d.donorName,
      amount: d.amount,
      purpose: d.purpose,
      channel: d.channel,
      donatedAt: d.donatedAt,
      status: d.status,
      note: d.note,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrMsg('');
    try {
      if (editing) {
        await apiRequest(`/api/admin/donations/${editing.id}`, {
          method: 'PUT',
          body: JSON.stringify(form),
        });
      } else {
        await apiRequest('/api/admin/donations', {
          method: 'POST',
          body: JSON.stringify(form),
        });
      }
      setModalOpen(false);
      await onRefresh();
    } catch (err) {
      setErrMsg((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (id: string, status: 'verified' | 'rejected') => {
    setErrMsg('');
    try {
      await apiRequest(`/api/admin/donations/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      await onRefresh();
    } catch (err) {
      setErrMsg((err as Error).message);
    }
  };

  const handleDelete = async (id: string) => {
    setErrMsg('');
    try {
      await apiRequest(`/api/admin/donations/${id}`, { method: 'DELETE' });
      await onRefresh();
    } catch (err) {
      setErrMsg((err as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      {errMsg && !modalOpen && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl text-sm">
          {errMsg}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-5">
        <div>
          <h2 className="text-lg font-bold text-[#0B1F3A]">จัดการรายการบริจาคและออกใบเสร็จ ({state.donations.length} รายการ)</h2>
          <p className="text-xs text-slate-500">
            ตรวจสอบสลิปการโอน อนุมัติยอดบริจาค เพิ่ม/แก้ไขรายการ และพิมพ์ใบเสร็จ PDF
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#C81E1E] hover:bg-[#9B1C1C] text-white text-sm font-semibold rounded-lg cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>บันทึกรายการบริจาค</span>
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {state.donations.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            ยังไม่มีรายการบริจาคในระบบ
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-4 py-3">เลขที่ใบเสร็จ</th>
                  <th className="px-4 py-3">ผู้บริจาค</th>
                  <th className="px-4 py-3">จำนวนเงิน</th>
                  <th className="px-4 py-3">สลิป</th>
                  <th className="px-4 py-3">สถานะ</th>
                  <th className="px-4 py-3 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {state.donations.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs tabular-nums">{d.receiptNo}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{d.donorName}</div>
                      <div className="text-xs text-slate-500">{d.purpose} · {d.channel}</div>
                    </td>
                    <td className="px-4 py-3 font-bold text-[#C81E1E] tabular-nums">
                      {formatCurrency(d.amount)} บาท
                    </td>
                    <td className="px-4 py-3">
                      {d.slipUrl && isSafeUrl(d.slipUrl) ? (
                        <button
                          type="button"
                          onClick={() => setSlipPreview(d.slipUrl)}
                          className="text-xs font-semibold text-blue-700 hover:underline cursor-pointer"
                        >
                          ดูสลิป
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-semibold ${
                          d.status === 'verified'
                            ? 'text-emerald-700'
                            : d.status === 'rejected'
                            ? 'text-red-700'
                            : 'text-amber-700'
                        }`}
                      >
                        {d.status === 'verified' ? 'ตรวจสอบแล้ว' : d.status === 'rejected' ? 'ปฏิเสธ' : 'รอตรวจสอบ'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {d.status === 'pending' && (
                          <>
                            <button
                              type="button"
                              onClick={() => setStatus(d.id, 'verified')}
                              className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded cursor-pointer"
                              title="ยืนยันยอด"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setStatus(d.id, 'rejected')}
                              className="p-1.5 text-red-700 hover:bg-red-50 rounded cursor-pointer"
                              title="ปฏิเสธ"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => setReceiptDonation(d)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-xs font-semibold rounded cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>ใบเสร็จ</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(d)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-xs font-semibold rounded cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>แก้ไข</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(d.id)}
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
        )}
      </div>

      <Modal open={Boolean(slipPreview)} onClose={() => setSlipPreview(null)} title="หลักฐานการโอนเงิน">
        {slipPreview && (
          <ImageWithFallback src={slipPreview} alt="สลิปโอนเงิน" className="w-full max-h-[70vh] object-contain" />
        )}
      </Modal>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'แก้ไขรายการบริจาค' : 'บันทึกรายการบริจาค'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          {errMsg && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded-lg text-xs">
              {errMsg}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อผู้บริจาค *</label>
            <input
              type="text"
              required
              value={form.donorName}
              onChange={(e) => setForm({ ...form, donorName: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">จำนวนเงิน (บาท) *</label>
              <input
                type="number"
                required
                min="1"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: Number(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">วันที่บริจาค</label>
              <input
                type="date"
                value={form.donatedAt}
                onChange={(e) => setForm({ ...form, donatedAt: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">วัตถุประสงค์</label>
              <select
                value={form.purpose}
                onChange={(e) => setForm({ ...form, purpose: e.target.value as DonationPurpose })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              >
                <option value="รถพยาบาล">รถพยาบาล</option>
                <option value="อุปกรณ์การแพทย์">อุปกรณ์การแพทย์</option>
                <option value="ช่วยเหลือผู้ประสบภัย">ช่วยเหลือผู้ประสบภัย</option>
                <option value="ทุนฝึกอบรมกู้ชีพ">ทุนฝึกอบรมกู้ชีพ</option>
                <option value="ทั่วไป">ทั่วไป</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">ช่องทาง</label>
              <select
                value={form.channel}
                onChange={(e) => setForm({ ...form, channel: e.target.value as DonationChannel })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              >
                <option value="QR e-Donation">QR e-Donation</option>
                <option value="QR พร้อมเพย์">QR พร้อมเพย์</option>
                <option value="โอนธนาคารกสิกรไทย">โอนธนาคารกสิกรไทย</option>
                <option value="เงินสด">เงินสด</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">สถานะ</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              >
                <option value="verified">ตรวจสอบแล้ว</option>
                <option value="pending">รอตรวจสอบ</option>
                <option value="rejected">ปฏิเสธ</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">หมายเหตุ</label>
            <textarea
              rows={2}
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
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
              className="px-5 py-2 bg-[#0B1F3A] disabled:opacity-50 text-white text-sm font-semibold rounded-lg cursor-pointer"
            >
              {saving ? 'กำลังบันทึก...' : 'บันทึกรายการ'}
            </button>
          </div>
        </form>
      </Modal>

      <ReceiptModal
        donation={receiptDonation}
        settings={state.settings}
        onClose={() => setReceiptDonation(null)}
      />
    </div>
  );
};

/* =========================================================
 * 5. GALLERY DRAG-AND-DROP UPLOAD & MANAGER
 * ========================================================= */
const GAL_CATEGORIES: GalleryCategory[] = [
  'งานกู้ชีพ',
  'กู้ภัย',
  'อบรม',
  'งานประจำปี',
  'ช่วยเหลือประชาชน',
  'ผู้บริจาค',
];

export const AdminGalleryView: React.FC<{
  state: AdminAppState;
  onRefresh: () => Promise<void>;
}> = ({ state, onRefresh }) => {
  const [uploadCat, setUploadCat] = useState<GalleryCategory>('งานกู้ชีพ');
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [editing, setEditing] = useState<GalleryItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCat, setEditCat] = useState<GalleryCategory>('งานกู้ชีพ');

  const handleFiles = async (files: File[]) => {
    if (!files.length) return;
    setUploading(true);
    setErrMsg('');
    try {
      const uploaded = await uploadAdminMultipleFiles(files);
      await apiRequest('/api/admin/gallery', {
        method: 'POST',
        body: JSON.stringify({
          items: uploaded.files.map((f) => ({
            title: f.filename.replace(/\.[^.]+$/, ''),
            category: uploadCat,
            imageUrl: f.url,
          })),
        }),
      });
      await onRefresh();
    } catch (err) {
      setErrMsg((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setErrMsg('');
    try {
      await apiRequest(`/api/admin/gallery/${editing.id}`, {
        method: 'PUT',
        body: JSON.stringify({ title: editTitle, category: editCat }),
      });
      setEditing(null);
      await onRefresh();
    } catch (err) {
      setErrMsg((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setErrMsg('');
    try {
      await apiRequest(`/api/admin/gallery/${id}`, { method: 'DELETE' });
      await onRefresh();
    } catch (err) {
      setErrMsg((err as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      {errMsg && !editing && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl text-sm">
          {errMsg}
        </div>
      )}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-[#0B1F3A]">คลังภาพมูลนิธิ ({state.gallery.length} ภาพ)</h2>
            <p className="text-xs text-slate-500">ลากวาง (Drag & Drop) ไฟล์ JPG, PNG, WEBP เพื่ออัปโหลดได้ทันที</p>
          </div>
          <select
            value={uploadCat}
            onChange={(e) => setUploadCat(e.target.value as GalleryCategory)}
            className="px-3.5 py-2 border border-slate-300 rounded-lg text-sm bg-white"
          >
            {GAL_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                หมวดหมู่: {c}
              </option>
            ))}
          </select>
        </div>

        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            handleFiles(Array.from(e.dataTransfer.files));
          }}
          className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
            dragging ? 'border-[#C81E1E] bg-red-50/40' : 'border-slate-300 bg-slate-50 hover:border-[#0B1F3A]'
          }`}
        >
          <Upload className="w-7 h-7 text-[#0B1F3A] mb-2" />
          <p className="text-sm font-semibold text-slate-800">
            {uploading ? 'กำลังอัปโหลดรูปภาพ...' : 'ลากไฟล์รูปภาพมาวางที่นี่ หรือคลิกเพื่อเลือกหลายไฟล์'}
          </p>
          <p className="text-xs text-slate-500 mt-1">รองรับ JPG, PNG, WEBP ขนาดไม่เกิน 10MB ต่อไฟล์</p>
          <input
            type="file"
            multiple
            accept=".jpg,.jpeg,.png,.webp"
            disabled={uploading}
            onChange={async (e) => {
              const input = e.target;
              await handleFiles(Array.from(input.files || []));
              input.value = '';
            }}
            className="hidden"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {state.gallery.map((g) => (
          <div key={g.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
            <ImageWithFallback src={g.imageUrl} alt={g.title} className="w-full h-44 object-cover" />
            <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
              <div>
                <p className="text-xs font-semibold text-[#C81E1E]">{g.category}</p>
                <p className="text-sm font-semibold text-slate-900 line-clamp-2 mt-0.5">{g.title}</p>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(g);
                    setEditTitle(g.title);
                    setEditCat(g.category);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-xs font-semibold rounded cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>แก้ไข</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(g.id)}
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title="แก้ไขข้อมูลรูปภาพ">
        <form onSubmit={saveEdit} className="space-y-4">
          {errMsg && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded-lg text-xs">
              {errMsg}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">คำบรรยายภาพ</label>
            <input
              type="text"
              required
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">หมวดหมู่</label>
            <select
              value={editCat}
              onChange={(e) => setEditCat(e.target.value as GalleryCategory)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
            >
              {GAL_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-[#0B1F3A] disabled:opacity-50 text-white text-sm font-semibold rounded-lg cursor-pointer"
            >
              {saving ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

/* =========================================================
 * 6. VOLUNTEERS & CONTACTS MANAGERS
 * ========================================================= */
export const AdminVolunteersView: React.FC<{
  state: AdminAppState;
  onRefresh: () => Promise<void>;
}> = ({ state, onRefresh }) => {
  const [editing, setEditing] = useState<VolunteerApplication | null>(null);
  const [note, setNote] = useState('');
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setErrMsg('');
    try {
      await apiRequest(`/api/admin/volunteers/${editing.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status, adminNote: note }),
      });
      setEditing(null);
      await onRefresh();
    } catch (err) {
      setErrMsg((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setErrMsg('');
    try {
      await apiRequest(`/api/admin/volunteers/${id}`, { method: 'DELETE' });
      await onRefresh();
    } catch (err) {
      setErrMsg((err as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      {errMsg && !editing && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl text-sm">
          {errMsg}
        </div>
      )}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="text-lg font-bold text-[#0B1F3A]">จัดการใบสมัครอาสาสมัคร ({state.volunteers.length} คน)</h2>
        <p className="text-xs text-slate-500">ตรวจสอบเอกสาร อนุมัติ หรือปฏิเสธใบสมัครอาสาสมัคร</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {state.volunteers.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">ยังไม่มีใบสมัครอาสาสมัคร</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-4 py-3">ชื่อ-สกุล</th>
                  <th className="px-4 py-3">เบอร์โทร / อีเมล</th>
                  <th className="px-4 py-3">เอกสาร</th>
                  <th className="px-4 py-3">สถานะ</th>
                  <th className="px-4 py-3 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {state.volunteers.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{v.fullName}</div>
                      <div className="text-xs text-slate-500 font-mono">{v.nationalId}</div>
                    </td>
                    <td className="px-4 py-3 text-xs tabular-nums">
                      <div>{v.phone}</div>
                      <div className="text-slate-500">{v.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      {v.documentUrl && isSafeUrl(v.documentUrl) ? (
                        <a
                          href={v.documentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-semibold text-blue-700 hover:underline"
                        >
                          เปิดดูเอกสาร
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold">
                      <span
                        className={
                          v.status === 'approved'
                            ? 'text-emerald-700'
                            : v.status === 'rejected'
                            ? 'text-red-700'
                            : 'text-amber-700'
                        }
                      >
                        {v.status === 'approved' ? 'อนุมัติแล้ว' : v.status === 'rejected' ? 'ไม่ผ่านเกณฑ์' : 'รอพิจารณา'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setErrMsg('');
                            setEditing(v);
                            setStatus(v.status);
                            setNote(v.adminNote);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-xs font-semibold rounded cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>พิจารณา / แก้ไข</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(v.id)}
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
        )}
      </div>

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title="พิจารณาใบสมัครอาสาสมัคร">
        {editing && (
          <form onSubmit={saveEdit} className="space-y-4">
            {errMsg && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded-lg text-xs">
                {errMsg}
              </div>
            )}
            <div className="text-sm space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <p><strong>ชื่อ:</strong> {editing.fullName}</p>
              <p><strong>ที่อยู่:</strong> {editing.address}</p>
              <p><strong>ความสามารถ:</strong> {editing.skills || '-'}</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">ผลการพิจารณา</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              >
                <option value="pending">รอพิจารณา</option>
                <option value="approved">อนุมัติเป็นอาสาสมัคร</option>
                <option value="rejected">ไม่อนุมัติ</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">บันทึกเจ้าหน้าที่</label>
              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 bg-[#0B1F3A] disabled:opacity-50 text-white text-sm font-semibold rounded-lg cursor-pointer"
              >
                {saving ? 'กำลังบันทึก...' : 'บันทึกสถานะ'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export const AdminContactsView: React.FC<{
  state: AdminAppState;
  onRefresh: () => Promise<void>;
}> = ({ state, onRefresh }) => {
  const [editing, setEditing] = useState<ContactMessage | null>(null);
  const [status, setStatus] = useState<'new' | 'in_progress' | 'resolved'>('new');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setErrMsg('');
    try {
      await apiRequest(`/api/admin/contacts/${editing.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status, adminNote: note }),
      });
      setEditing(null);
      await onRefresh();
    } catch (err) {
      setErrMsg((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setErrMsg('');
    try {
      await apiRequest(`/api/admin/contacts/${id}`, { method: 'DELETE' });
      await onRefresh();
    } catch (err) {
      setErrMsg((err as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      {errMsg && !editing && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl text-sm">
          {errMsg}
        </div>
      )}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="text-lg font-bold text-[#0B1F3A]">รายการแจ้งเหตุฉุกเฉินและติดต่อประสานงาน ({state.contacts.length} รายการ)</h2>
        <p className="text-xs text-slate-500">ติดตามสถานะการรับแจ้งเหตุและข้อความติดต่อจากหน้าเว็บไซต์</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {state.contacts.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">ยังไม่มีรายการแจ้งเหตุหรือข้อความติดต่อ</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-4 py-3">ประเภท</th>
                  <th className="px-4 py-3">ผู้ติดต่อ</th>
                  <th className="px-4 py-3">หัวข้อ / รายละเอียด</th>
                  <th className="px-4 py-3">สถานะ</th>
                  <th className="px-4 py-3 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {state.contacts.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-xs font-bold">
                      <span className={c.type === 'emergency' ? 'text-[#C81E1E]' : 'text-[#0B1F3A]'}>
                        {c.type === 'emergency' ? 'แจ้งเหตุฉุกเฉิน' : 'ติดต่อทั่วไป'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div className="font-semibold text-slate-900">{c.name}</div>
                      <div className="tabular-nums text-slate-500">{c.phone}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{c.subject}</div>
                      <div className="text-xs text-slate-500 line-clamp-1">{c.details}</div>
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold">
                      {c.status === 'resolved' ? 'ดำเนินการแล้ว' : c.status === 'in_progress' ? 'กำลังดำเนินการ' : 'เรื่องใหม่'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setErrMsg('');
                            setEditing(c);
                            setStatus(c.status);
                            setNote(c.adminNote);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-xs font-semibold rounded cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>อัปเดต</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(c.id)}
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
        )}
      </div>

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title="อัปเดตสถานะการประสานงาน">
        {editing && (
          <form onSubmit={saveEdit} className="space-y-4">
            {errMsg && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded-lg text-xs">
                {errMsg}
              </div>
            )}
            <div className="text-sm space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <p><strong>ผู้แจ้ง:</strong> {editing.name} ({editing.phone})</p>
              {editing.location && <p><strong>พิกัด/สถานที่:</strong> {editing.location}</p>}
              <p><strong>รายละเอียด:</strong> {editing.details}</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">สถานะดำเนินการ</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              >
                <option value="new">เรื่องใหม่</option>
                <option value="in_progress">กำลังดำเนินการ</option>
                <option value="resolved">ดำเนินการแล้ว</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">หมายเหตุการดำเนินการ</label>
              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 bg-[#0B1F3A] disabled:opacity-50 text-white text-sm font-semibold rounded-lg cursor-pointer"
              >
                {saving ? 'กำลังบันทึก...' : 'บันทึกสถานะ'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
