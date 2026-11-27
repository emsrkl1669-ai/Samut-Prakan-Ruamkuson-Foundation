import React, { useState } from 'react';
import {
  HeartHandshake,
  Upload,
  CheckCircle2,
  FileText,
  Printer,
  Copy,
  Check,
  MapPin,
  Phone,
  Mail,
  ExternalLink,
  AlertTriangle,
  Send,
  RotateCcw,
} from 'lucide-react';
import type {
  PublicAppState,
  DonationPurpose,
  DonationChannel,
  AdminSectionId,
} from '../types';
import {
  apiRequest,
  uploadPublicFile,
  formatCurrency,
  formatThaiDate,
  printDonationReceipt,
  isSafeUrl,
} from '../lib/api';
import { PageHeader, ImageWithFallback } from './SharedUI';

interface ActionPagesProps {
  state: PublicAppState;
  isAdminAuthenticated: boolean;
  onOpenAdminSection: (section: AdminSectionId) => void;
  onRefreshPublic: () => Promise<void>;
}

/* =========================================================
 * 1. DONATIONS PORTAL PAGE
 * ========================================================= */
const PURPOSES: DonationPurpose[] = [
  'รถพยาบาล',
  'อุปกรณ์การแพทย์',
  'ช่วยเหลือผู้ประสบภัย',
  'ทุนฝึกอบรมกู้ชีพ',
  'ทั่วไป',
];

export const DonationsPage: React.FC<ActionPagesProps> = ({
  state,
  isAdminAuthenticated,
  onOpenAdminSection,
  onRefreshPublic,
}) => {
  const { settings, donations } = state;
  const verifiedDonations = donations.filter((d) => d.status === 'verified');
  const totalRaised = verifiedDonations.reduce((sum, d) => sum + d.amount, 0);
  const goal = Math.max(1, settings.donationGoal || 2000000);
  const pct = Math.min(100, Math.round((totalRaised / goal) * 100));

  const [donorName, setDonorName] = useState('');
  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState<DonationPurpose>('รถพยาบาล');
  const [channel, setChannel] = useState<DonationChannel>('QR e-Donation');
  const [note, setNote] = useState('');
  const [slipUrl, setSlipUrl] = useState('');
  const [slipName, setSlipName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [copiedAcc, setCopiedAcc] = useState(false);

  const handleCopyBank = () => {
    navigator.clipboard?.writeText(settings.bankAccountNumber.replace(/-/g, ''));
    setCopiedAcc(true);
    setTimeout(() => setCopiedAcc(false), 2000);
  };

  const handleSlipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setFeedback(null);
    try {
      const res = await uploadPublicFile('/api/public/upload-slip', file);
      setSlipUrl(res.url);
      setSlipName(res.filename);
    } catch (err) {
      setFeedback({ type: 'err', text: (err as Error).message });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      await apiRequest('/api/public/donations', {
        method: 'POST',
        body: JSON.stringify({
          donorName,
          amount: Number(amount),
          purpose,
          channel,
          slipUrl,
          note,
        }),
      });
      setDonorName('');
      setAmount('');
      setNote('');
      setSlipUrl('');
      setSlipName('');
      setFeedback({
        type: 'ok',
        text: 'บันทึกข้อมูลการบริจาคเรียบร้อยแล้ว เจ้าหน้าที่ฝ่ายการเงินจะตรวจสอบและอัปเดตยอดพร้อมใบเสร็จให้โดยเร็ว',
      });
      await onRefreshPublic();
    } catch (err) {
      setFeedback({ type: 'err', text: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full">
      <PageHeader
        kicker="บอร์ดการรับบริจาคออนไลน์ · e-Donation"
        title="ร่วมบริจาคสนับสนุนภารกิจ มูลนิธิร่วมกุศลสมุทรปราการ"
        subtitle="สมทบทุนจัดซื้อรถพยาบาล อุปกรณ์การแพทย์ ช่วยเหลือผู้ประสบภัย และสงเคราะห์ผู้ยากไร้"
        isAdminAuthenticated={isAdminAuthenticated}
        onEditThisPage={() => onOpenAdminSection('donations')}
      />

      <section className="w-full py-10 px-4 sm:px-6 lg:px-10 xl:px-14 bg-slate-50 space-y-10">
        {/* Progress Summary Banner */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            <div>
              <p className="text-xs font-medium text-slate-500">ยอดรับบริจาคที่ตรวจสอบแล้ว</p>
              <p className="text-3xl sm:text-4xl font-extrabold text-[#C81E1E] tabular-nums mt-1">
                {formatCurrency(totalRaised)} บาท
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">เป้าหมายการระดมทุน</p>
              <p className="text-2xl font-bold text-[#0B1F3A] tabular-nums mt-1">
                {formatCurrency(goal)} บาท
              </p>
            </div>
            <div className="md:text-right">
              <p className="text-xs font-medium text-slate-500">ความคืบหน้า</p>
              <p className="text-2xl font-bold text-[#0B1F3A] tabular-nums mt-1">{pct}%</p>
            </div>
          </div>
          <div className="w-full h-4 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#C81E1E] transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Donation Channels + Submission Form */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Official QR Codes & Bank Account */}
          <div className="lg:col-span-6 space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <h2 className="text-lg font-bold text-[#0B1F3A]">บัญชีธนาคารอย่างเป็นทางการของมูลนิธิ</h2>
              <div className="p-4 rounded-xl bg-[#0B1F3A] text-white space-y-2">
                <p className="text-xs text-slate-300">
                  {settings.bankName} · {settings.bankBranch}
                </p>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-2xl font-mono font-bold tracking-wider tabular-nums">
                    {settings.bankAccountNumber}
                  </p>
                  <button
                    type="button"
                    onClick={handleCopyBank}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded-lg text-xs font-medium cursor-pointer"
                  >
                    {copiedAcc ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedAcc ? 'คัดลอกแล้ว' : 'คัดลอกเลขบัญชี'}</span>
                  </button>
                </div>
                <p className="text-sm text-slate-200">ชื่อบัญชี: {settings.bankAccountName}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="bg-white border border-slate-200 rounded-xl p-5 text-center space-y-3">
                <div className="aspect-3/4 w-full bg-slate-50 rounded-lg overflow-hidden border border-slate-100">
                  <ImageWithFallback
                    src={settings.qrEdonationUrl}
                    alt="QR e-Donation มูลนิธิร่วมกุศลสมุทรปราการ"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0B1F3A]">QR Code e-Donation</h3>
                  <p className="text-xs text-slate-500 mt-0.5">ลดหย่อนภาษีผ่านระบบสรรพากรอัตโนมัติ</p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-5 text-center space-y-3">
                <div className="aspect-3/4 w-full bg-slate-50 rounded-lg overflow-hidden border border-slate-100">
                  <ImageWithFallback
                    src={settings.qrPromptpayUrl}
                    alt="QR PromptPay กสิกรไทย"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0B1F3A]">QR พร้อมเพย์ กสิกรไทย</h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{settings.qrPromptpayRef}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Notify Donation & Upload Slip */}
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
            <h2 className="text-xl font-bold text-[#0B1F3A] flex items-center gap-2 mb-2">
              <HeartHandshake className="w-5 h-5 text-[#C81E1E]" />
              <span>แจ้งการโอนเงินบริจาค / ขอรับใบเสร็จ</span>
            </h2>
            <p className="text-sm text-slate-600 mb-6">
              หลังโอนเงินผ่าน QR Code หรือบัญชีธนาคารกสิกรไทย กรุณากรอกข้อมูลด้านล่างเพื่อออกใบสำคัญรับเงิน
            </p>

            {feedback && (
              <div
                className={`mb-5 p-4 rounded-lg text-sm flex items-start gap-2.5 ${
                  feedback.type === 'ok'
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                    : 'bg-red-50 text-red-900 border border-red-200'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{feedback.text}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  ชื่อผู้บริจาค / นามนิติบุคคล *
                </label>
                <input
                  type="text"
                  required
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                  placeholder="ระบุชื่อ-นามสกุล หรือชื่อบริษัท"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0B1F3A]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    จำนวนเงิน (บาท) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="เช่น 500"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[#0B1F3A]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    ช่องทางการโอน
                  </label>
                  <select
                    value={channel}
                    onChange={(e) => setChannel(e.target.value as DonationChannel)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0B1F3A]"
                  >
                    <option value="QR e-Donation">QR e-Donation</option>
                    <option value="QR พร้อมเพย์">QR พร้อมเพย์</option>
                    <option value="โอนธนาคารกสิกรไทย">โอนธนาคารกสิกรไทย</option>
                    <option value="เงินสด">เงินสด</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  วัตถุประสงค์การบริจาค
                </label>
                <div className="flex flex-wrap gap-2">
                  {PURPOSES.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPurpose(p)}
                      className={`px-3.5 py-2 text-xs font-medium rounded-lg border cursor-pointer transition-colors ${
                        purpose === p
                          ? 'bg-[#0B1F3A] text-white border-[#0B1F3A]'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  แนบหลักฐานการโอนเงิน (สลิป JPG/PNG/PDF)
                </label>
                <label className="flex items-center justify-center gap-2 w-full px-4 py-4 border-2 border-dashed border-slate-300 hover:border-[#0B1F3A] rounded-lg cursor-pointer bg-slate-50 text-sm text-slate-600">
                  <Upload className="w-4 h-4 text-slate-500" />
                  <span>
                    {uploading
                      ? 'กำลังอัปโหลดสลิป...'
                      : slipName
                      ? `อัปโหลดแล้ว: ${slipName}`
                      : 'คลิกเพื่อเลือกไฟล์สลิปการโอน'}
                  </span>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.pdf"
                    onChange={handleSlipUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  หมายเหตุ / ที่อยู่จัดส่งใบเสร็จ (ถ้ามี)
                </label>
                <textarea
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="ระบุข้อมูลเพิ่มเติมสำหรับการออกใบอนุโมทนาบัตรหรือใบเสร็จ"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0B1F3A]"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || uploading}
                className="w-full py-3 bg-[#C81E1E] hover:bg-[#9B1C1C] disabled:opacity-60 text-white font-semibold rounded-lg transition-colors cursor-pointer"
              >
                {submitting ? 'กำลังส่งข้อมูล...' : 'ส่งข้อมูลแจ้งการบริจาค'}
              </button>
            </form>
          </div>
        </div>

        {/* Verified Donors Table */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-base font-bold text-[#0B1F3A]">
              รายนามผู้บริจาคที่ตรวจสอบแล้ว ({verifiedDonations.length} รายการ)
            </h2>
          </div>
          {verifiedDonations.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              ยังไม่มีรายการผู้บริจาคที่บันทึกในระบบ
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <tr>
                    <th className="px-6 py-3.5">เลขที่ใบเสร็จ</th>
                    <th className="px-6 py-3.5">ชื่อผู้บริจาค</th>
                    <th className="px-6 py-3.5">วัตถุประสงค์</th>
                    <th className="px-6 py-3.5">ช่องทาง</th>
                    <th className="px-6 py-3.5">วันที่</th>
                    <th className="px-6 py-3.5 text-right">จำนวนเงิน</th>
                    <th className="px-6 py-3.5 text-right">ใบเสร็จ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {verifiedDonations.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/70">
                      <td className="px-6 py-3.5 font-mono text-xs text-slate-600 tabular-nums">
                        {d.receiptNo}
                      </td>
                      <td className="px-6 py-3.5 font-semibold text-slate-900">{d.donorName}</td>
                      <td className="px-6 py-3.5 text-slate-600">{d.purpose}</td>
                      <td className="px-6 py-3.5 text-slate-600">{d.channel}</td>
                      <td className="px-6 py-3.5 text-slate-600 tabular-nums">
                        {formatThaiDate(d.donatedAt)}
                      </td>
                      <td className="px-6 py-3.5 text-right font-bold text-[#C81E1E] tabular-nums">
                        {formatCurrency(d.amount)} บาท
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            printDonationReceipt(
                              d,
                              settings.foundationName,
                              settings.address,
                              settings.emergencyPhone
                            )
                          }
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#0B1F3A] bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>PDF</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

/* =========================================================
 * 2. VOLUNTEER REGISTRATION PAGE
 * ========================================================= */
export const VolunteerPage: React.FC<ActionPagesProps> = ({
  isAdminAuthenticated,
  onOpenAdminSection,
}) => {
  const [fullName, setFullName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [skills, setSkills] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');
  const [docName, setDocName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setFeedback(null);
    try {
      const res = await uploadPublicFile('/api/public/upload-doc', file);
      setDocumentUrl(res.url);
      setDocName(res.filename);
    } catch (err) {
      setFeedback({ type: 'err', text: (err as Error).message });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      await apiRequest('/api/public/volunteers', {
        method: 'POST',
        body: JSON.stringify({
          fullName,
          nationalId,
          birthDate,
          address,
          phone,
          email,
          skills,
          documentUrl,
        }),
      });
      setFullName('');
      setNationalId('');
      setBirthDate('');
      setAddress('');
      setPhone('');
      setEmail('');
      setSkills('');
      setDocumentUrl('');
      setDocName('');
      setFeedback({
        type: 'ok',
        text: 'ส่งใบสมัครอาสาสมัครเรียบร้อยแล้ว เจ้าหน้าที่จะตรวจสอบเอกสารและติดต่อกลับตามหมายเลขโทรศัพท์ที่แจ้งไว้',
      });
    } catch (err) {
      setFeedback({ type: 'err', text: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full">
      <PageHeader
        kicker="ร่วมเป็นส่วนหนึ่งของจิตอาสา"
        title="สมัครอาสาสมัคร มูลนิธิร่วมกุศลสมุทรปราการ"
        subtitle="เปิดรับสมัครอาสาสมัครกู้ชีพ กู้ภัย บรรเทาสาธารณภัย และจิตอาสางานสาธารณกุศล"
        isAdminAuthenticated={isAdminAuthenticated}
        onEditThisPage={() => onOpenAdminSection('volunteers')}
      />

      <section className="w-full py-10 px-4 sm:px-6 lg:px-10 xl:px-14 bg-slate-50">
        <div className="max-w-4xl mx-auto bg-white border border-slate-200 rounded-xl p-6 sm:p-10">
          <h2 className="text-xl font-bold text-[#0B1F3A] mb-2">แบบฟอร์มสมัครอาสาสมัคร</h2>
          <p className="text-sm text-slate-600 mb-6">
            กรุณากรอกข้อมูลจริงให้ครบถ้วน เพื่อใช้ประกอบการพิจารณาอนุมัติและจัดอบรมเบื้องต้น
          </p>

          {feedback && (
            <div
              className={`mb-6 p-4 rounded-lg text-sm flex items-start gap-2.5 ${
                feedback.type === 'ok'
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                  : 'bg-red-50 text-red-900 border border-red-200'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{feedback.text}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  ชื่อ-นามสกุล *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0B1F3A]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  เลขประจำตัวประชาชน *
                </label>
                <input
                  type="text"
                  required
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                  placeholder="13 หลัก"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-[#0B1F3A]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  วันเกิด
                </label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0B1F3A]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  เบอร์โทรศัพท์ติดต่อ *
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[#0B1F3A]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  อีเมล
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0B1F3A]"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                ที่อยู่ปัจจุบัน *
              </label>
              <textarea
                rows={3}
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0B1F3A]"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                ประสบการณ์ / ความสามารถพิเศษ / วุฒิบัตรกู้ชีพ (ถ้ามี)
              </label>
              <input
                type="text"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                placeholder="เช่น ผ่านการอบรม CPR, EMR, ขับรถพยาบาล, จิตอาสาสังคมสงเคราะห์"
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0B1F3A]"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                แนบเอกสารประกอบการสมัคร (สำเนาบัตรประชาชน / ใบรับรอง JPG, PNG, PDF)
              </label>
              <label className="flex items-center justify-center gap-2 w-full px-4 py-4 border-2 border-dashed border-slate-300 hover:border-[#0B1F3A] rounded-lg cursor-pointer bg-slate-50 text-sm text-slate-600">
                <FileText className="w-4 h-4 text-slate-500" />
                <span>
                  {uploading
                    ? 'กำลังอัปโหลดเอกสาร...'
                    : docName
                    ? `อัปโหลดแล้ว: ${docName}`
                    : 'คลิกเพื่อเลือกไฟล์เอกสาร'}
                </span>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.pdf"
                  onChange={handleDocUpload}
                  className="hidden"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting || uploading}
              className="px-8 py-3 bg-[#0B1F3A] hover:bg-[#122D52] disabled:opacity-60 text-white font-semibold rounded-lg transition-colors cursor-pointer"
            >
              {submitting ? 'กำลังส่งใบสมัคร...' : 'ส่งใบสมัครอาสาสมัคร'}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
};

/* =========================================================
 * 3. CONTACT & EMERGENCY REPORT PAGE
 * ========================================================= */
export const ContactPage: React.FC<ActionPagesProps> = ({
  state,
  isAdminAuthenticated,
  onOpenAdminSection,
}) => {
  const { settings } = state;
  const [formType, setFormType] = useState<'contact' | 'emergency'>('contact');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [location, setLocation] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const handleReset = () => {
    setName('');
    setPhone('');
    setEmail('');
    setSubject('');
    setLocation('');
    setDetails('');
    setFeedback(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      await apiRequest('/api/public/contacts', {
        method: 'POST',
        body: JSON.stringify({
          type: formType,
          name,
          phone,
          email,
          subject,
          location,
          details,
        }),
      });
      handleReset();
      setFeedback({
        type: 'ok',
        text:
          formType === 'emergency'
            ? 'ส่งข้อมูลแจ้งเหตุฉุกเฉินเข้าสู่ศูนย์วิทยุบัวหลวงแล้ว หากเป็นเหตุเร่งด่วนโปรดโทรสายตรง 02-175-8668 ทันที'
            : 'ส่งข้อความติดต่อประสานงานเรียบร้อยแล้ว เจ้าหน้าที่จะติดต่อกลับโดยเร็วที่สุด',
      });
    } catch (err) {
      setFeedback({ type: 'err', text: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  const embedMapSrc = `https://maps.google.com/maps?q=${settings.mapsLat || 13.5780814},${
    settings.mapsLng || 100.5940229
  }&z=17&output=embed`;

  return (
    <div className="w-full">
      <PageHeader
        kicker="ศูนย์วิทยุบัวหลวง · สำนักงานใหญ่"
        title="ข้อมูลการติดต่อประสานงาน และแจ้งเหตุฉุกเฉินออนไลน์"
        subtitle={settings.address}
        isAdminAuthenticated={isAdminAuthenticated}
        onEditThisPage={() => onOpenAdminSection('contacts')}
      />

      <section className="w-full py-10 px-4 sm:px-6 lg:px-10 xl:px-14 bg-slate-50 space-y-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: HQ Contact Info + Map */}
          <div className="lg:col-span-6 space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <h2 className="text-lg font-bold text-[#0B1F3A]">สำนักงานใหญ่ {settings.foundationName}</h2>
              <div className="space-y-3 text-sm text-slate-700">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-[#C81E1E] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-900">ที่อยู่</p>
                    <p>{settings.address}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-[#C81E1E] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-900">โทรศัพท์ (ตลอด 24 ชั่วโมง)</p>
                    <p className="tabular-nums font-semibold text-[#0B1F3A]">
                      {settings.emergencyPhone}
                      {settings.emergencyPhoneSecondary ? ` , ${settings.emergencyPhoneSecondary}` : ''}
                    </p>
                    {settings.linePhone && (
                      <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                        Line / ประสานงาน: {settings.linePhone}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-[#C81E1E] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-900">อีเมล</p>
                    <p>{settings.email}</p>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-3">
                {settings.facebookUrl && isSafeUrl(settings.facebookUrl) && (
                  <a
                    href={settings.facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg"
                  >
                    <span>Facebook</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                {settings.lineUrl && isSafeUrl(settings.lineUrl) && (
                  <a
                    href={settings.lineUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg"
                  >
                    <span>Line Official</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                {settings.mapsUrl && isSafeUrl(settings.mapsUrl) && (
                  <a
                    href={settings.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#0B1F3A] text-white text-xs font-semibold rounded-lg"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>นำทาง Google Maps</span>
                  </a>
                )}
              </div>
            </div>

            {/* Embedded Google Map */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <iframe
                title="แผนที่มูลนิธิร่วมกุศลสมุทรปราการ"
                src={embedMapSrc}
                className="w-full h-80 border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>

          {/* Right: Contact & Emergency Form */}
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
            <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-lg mb-6">
              <button
                type="button"
                onClick={() => setFormType('contact')}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-md transition-colors cursor-pointer ${
                  formType === 'contact' ? 'bg-white text-[#0B1F3A] shadow-xs' : 'text-slate-600'
                }`}
              >
                ติดต่อประสานงานทั่วไป
              </button>
              <button
                type="button"
                onClick={() => setFormType('emergency')}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-md transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5 ${
                  formType === 'emergency' ? 'bg-[#C81E1E] text-white shadow-xs' : 'text-slate-600'
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
                <span>แจ้งเหตุฉุกเฉินออนไลน์</span>
              </button>
            </div>

            {feedback && (
              <div
                className={`mb-5 p-4 rounded-lg text-sm flex items-start gap-2.5 ${
                  feedback.type === 'ok'
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                    : 'bg-red-50 text-red-900 border border-red-200'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{feedback.text}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    ชื่อผู้ติดต่อ / ผู้แจ้ง *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0B1F3A]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    เบอร์โทรศัพท์ *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[#0B1F3A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  อีเมล
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0B1F3A]"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  {formType === 'emergency' ? 'ลักษณะเหตุฉุกเฉิน *' : 'หัวข้อ *'}
                </label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder={
                    formType === 'emergency'
                      ? 'เช่น อุบัติเหตุจราจร / ผู้ป่วยฉุกเฉิน / ขอรถรับ-ส่งผู้ป่วย'
                      : 'ระบุหัวข้อที่ต้องการประสานงาน'
                  }
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0B1F3A]"
                />
              </div>

              {formType === 'emergency' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    สถานที่เกิดเหตุ / จุดสังเกต
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="ระบุถนน ซอย จุดสังเกตใกล้เคียง"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C81E1E]"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  รายละเอียด *
                </label>
                <textarea
                  rows={4}
                  required
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0B1F3A]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className={`inline-flex items-center gap-2 px-6 py-3 font-semibold text-white rounded-lg transition-colors cursor-pointer ${
                    formType === 'emergency'
                      ? 'bg-[#C81E1E] hover:bg-[#9B1C1C]'
                      : 'bg-[#0B1F3A] hover:bg-[#122D52]'
                  }`}
                >
                  <Send className="w-4 h-4" />
                  <span>{submitting ? 'กำลังส่ง...' : 'ส่งข้อความ'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center gap-2 px-5 py-3 border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium rounded-lg transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>ล้างข้อมูล</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
};
