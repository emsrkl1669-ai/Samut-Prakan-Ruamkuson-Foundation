import React, { useState } from 'react';
import { X, ShieldCheck, Edit3, Image as ImageIcon } from 'lucide-react';
import { isSafeUrl } from '../lib/api';

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
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
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
