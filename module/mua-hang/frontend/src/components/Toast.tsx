import React from 'react';

interface ToastProps {
  message: string | null;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, onClose }) => {
  if (!message) return null;

  return (
    <div className="fixed bottom-16 right-4 z-50 max-w-md bg-[#0E1220] text-white px-4 py-3 rounded shadow-xl border border-white/20 flex items-start justify-between gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200">
      <div className="flex items-start gap-2.5">
        <span className="material-symbols-outlined text-[#4557b2] text-[20px] mt-0.5">
          check_circle
        </span>
        <div className="text-[13px] leading-snug">{message}</div>
      </div>
      <button
        onClick={onClose}
        className="text-white/60 hover:text-white p-0.5 rounded"
      >
        <span className="material-symbols-outlined text-[16px]">close</span>
      </button>
    </div>
  );
};
