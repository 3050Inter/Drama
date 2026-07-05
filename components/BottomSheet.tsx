"use client";
import type { ReactNode } from "react";

export default function BottomSheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  if (!open) return null;
  return <><div className="sheet-backdrop" onClick={onClose}/><div className="bottom-sheet"><div className="sheet-handle"/>{children}</div></>;
}
