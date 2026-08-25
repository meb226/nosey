'use client'

import { useState } from 'react'

/**
 * Lives inside the open folder body, not in its header. Two reasons: the
 * header is itself a button and a button cannot nest one, and you only ever
 * open a row when you are about to answer it — which is exactly when the
 * definition is worth reading.
 */
export function InfoTag({ label, text }: { label: string; text: string }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex min-h-[38px] items-center gap-2 self-start text-[14px] font-semibold text-muted active:text-ink"
      >
        <span
          className={`flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 text-[11px] font-bold leading-none ${
            open ? 'border-ink bg-ink text-white' : 'border-muted'
          }`}
        >
          i
        </span>
        What {label.toLowerCase()} means
      </button>

      {open && (
        <p className="mb-1 rounded-[9px] border-2 border-hairline px-3 py-2.5 text-[15px] leading-relaxed text-ink">
          {text}
        </p>
      )}
    </div>
  )
}
