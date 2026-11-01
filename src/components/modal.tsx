"use client";

import { useEffect } from "react";

export function Modal({
  title,
  wide = false,
  onClose,
  children,
}: {
  title: string;
  wide?: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`card max-h-[90vh] w-full overflow-y-auto ${wide ? "max-w-2xl" : "max-w-md"}`}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">{title}</h2>
          <button
            type="button"
            className="btn !px-2 !py-1"
            onClick={onClose}
            aria-label="Tutup"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
