import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ShieldCheck, Edit3, Image as ImageIcon, Printer } from 'lucide-react';
import { isSafeUrl, formatCurrency, formatThaiDate } from '../lib/api';
import type { DonationRecord, SiteSettings } from '../types';

interface ImageWithFallbackProps {
  src?: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
  fallbackIcon?: React.ReactNode;
}

export const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  src,
  alt,
  className = '',
  fallbackLabel,
  fallbackIcon,
}) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || !isSafeUrl(src) || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-500 border border-slate-200 ${className}`}
        aria-label={alt}
      >
        {fallbackIcon || <ImageIcon className="w-8 h-8 mb-1.5 text-slate-400" />}
        {fallbackLabel && (
          <span className="text-xs font-medium text-slate-500 text-center px-2 line-clamp-2">
            {fallbackLabel}
          </span>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};

interface PageHeaderProps {
  kicker: string;
  title: string;
  subtitle?: string;
  isAdminAuthenticated?: boolean;
  onEditThisPage?: () => void;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  kicker,
  title,
  subtitle,
  isAdminAuthenticated,
  onEditThisPage,
  actions,
}) => {
  return (
    <section className="w-full bg-[#0B1F3A] text-white border-b border-slate-800">
      <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14 py-10 sm:py-12">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="max-w-4xl">
            <p className="text-xs font-medium tracking-wider text-slate-300 mb-2">
              {kicker}
            </p>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white [text-wrap:balance]">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed max-w-3xl">
                {subtitle}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {actions}
            {isAdminAuthenticated && onEditThisPage && (
              <button
                type="button"
                onClick={onEditThisPage}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Edit3 className="w-4 h-4" />
                <span>แก้ไขหน้านี้</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  maxWidthClass?: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  maxWidthClass = 'max-w-2xl',
  children,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={`w-full ${maxWidthClass} bg-white rounded-xl border border-slate-200 shadow-2xl max-h-[90vh] flex flex-col overflow-hidden`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 no-print">
          <h3 className="text-lg font-bold text-slate-900 truncate pr-4">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

interface ReceiptModalProps {
  donation: DonationRecord | null;
  settings: SiteSettings;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  donation,
  settings,
  onClose,
}) => {
  if (!donation) return null;

  return createPortal(
    <div
      className="receipt-print-portal fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label={`ใบสำคัญรับเงินบริจาค ${donation.receiptNo}`}
    >
      <div className="receipt-print-portal-card w-full max-w-2xl bg-white rounded-xl border border-slate-200 shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 no-print">
          <h3 className="text-lg font-bold text-slate-900 truncate pr-4">
            ใบสำคัญรับเงินบริจาค {donation.receiptNo}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="receipt-print-portal-body p-6 overflow-y-auto space-y-6">
          <div className="border-2 border-[#0B1F3A] rounded-lg p-6 sm:p-8 bg-white space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b-2 border-slate-200 pb-4">
              <div className="flex items-start gap-3">
                <ImageWithFallback
                  src={settings.logoUrl}
                  alt={settings.foundationName}
                  className="w-12 h-12 object-contain rounded-full shrink-0"
                />
                <div>
                  <h4 className="text-lg font-bold text-[#0B1F3A]">{settings.foundationName}</h4>
                  <p className="text-xs text-slate-600 mt-0.5">{settings.address}</p>
                  <p className="text-xs text-slate-600 tabular-nums">
                    โทรศัพท์ {settings.emergencyPhone}
                  </p>
                </div>
              </div>
              <div className="sm:text-right text-xs space-y-0.5 shrink-0">
                <p className="font-bold text-[#C81E1E] text-sm">ใบสำคัญรับเงินบริจาค</p>
                <p className="tabular-nums">
                  เลขที่: <strong className="font-mono">{donation.receiptNo}</strong>
                </p>
                <p className="tabular-nums">วันที่: {formatThaiDate(donation.donatedAt)}</p>
              </div>
            </div>

            <div className="divide-y divide-slate-100 text-sm">
              <div className="py-2.5 flex justify-between gap-4">
                <span className="text-slate-600">ได้รับเงินบริจาคจาก</span>
                <strong className="text-slate-900 text-right">{donation.donorName}</strong>
              </div>
              <div className="py-2.5 flex justify-between gap-4">
                <span className="text-slate-600">วัตถุประสงค์การบริจาค</span>
                <strong className="text-slate-900 text-right">{donation.purpose}</strong>
              </div>
              <div className="py-2.5 flex justify-between gap-4">
                <span className="text-slate-600">ช่องทางการบริจาค</span>
                <strong className="text-slate-900 text-right">{donation.channel}</strong>
              </div>
              <div className="py-2.5 flex justify-between gap-4">
                <span className="text-slate-600">สถานะการตรวจสอบ</span>
                <strong className="text-emerald-700 text-right">
                  {donation.status === 'verified'
                    ? 'ตรวจสอบแล้ว'
                    : donation.status === 'rejected'
                    ? 'ปฏิเสธ'
                    : 'รอตรวจสอบ'}
                </strong>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-300 rounded-lg p-4 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">จำนวนเงินบริจาคทั้งสิ้น</span>
              <span className="text-2xl font-extrabold text-[#C81E1E] tabular-nums">
                {formatCurrency(donation.amount)} บาท
              </span>
            </div>

            <div className="pt-6 flex flex-col sm:flex-row sm:items-end justify-between gap-6 text-xs text-slate-500">
              <p>ขออนุโมทนาบุญในจิตอันเป็นกุศลของท่าน</p>
              <div className="text-center w-52 border-t border-slate-400 pt-2">
                เจ้าหน้าที่การเงิน / ผู้รับเงิน
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 no-print">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              ปิด
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0B1F3A] hover:bg-[#122D52] text-white text-sm font-semibold rounded-lg cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์ / บันทึกเป็น PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

interface AdminShortcutBarProps {
  visible: boolean;
  label: string;
  onEdit: () => void;
  onOpenDashboard: () => void;
}

export const AdminFloatingBar: React.FC<AdminShortcutBarProps> = ({
  visible,
  label,
  onEdit,
  onOpenDashboard,
}) => {
  if (!visible) return null;
  return (
    <div className="fixed bottom-4 right-4 z-40 no-print flex items-center gap-2 bg-[#0B1F3A] text-white px-4 py-2.5 rounded-xl border border-slate-700 shadow-xl">
      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
      <span className="text-xs font-medium text-slate-200 hidden sm:inline whitespace-nowrap">
        โหมดผู้ดูแลระบบ
      </span>
      <button
        type="button"
        onClick={onEdit}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
      >
        <Edit3 className="w-3.5 h-3.5" />
        <span>แก้ไขหน้านี้ ({label})</span>
      </button>
      <button
        type="button"
        onClick={onOpenDashboard}
        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
      >
        หลังบ้าน
      </button>
    </div>
  );
};
