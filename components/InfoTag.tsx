'use client'

import { useId, useState } from 'react'

/**
 * Tap to expand, tap to collapse. Deliberately not a hover popover: there is
 * no hover on a phone, and a floating tooltip near the top of the screen is
 * unreachable one-handed. Expanding inline pushes the axis buttons down, which
 * is fine — you read it once and then you know it.
 */
export function InfoTag({ label, text }: { label: string; text: string }) {
  const [open, setOpen] = useState(false)
  const id = useId()

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={id}
        aria-label={`More about ${label.toLowerCase()}`}
        // -m-2 p-2 keeps the tap target comfortably bigger than the glyph.
        className="-m-2 p-2 text-muted active:text-wine"
      >
        <span
          className={`flex h-[18px] w-[18px] items-center justify-center rounded-full border text-[11px] font-semibold leading-none ${
            open ? 'border-wine bg-wine text-white' : 'border-muted'
          }`}
        >
          i
        </span>
      </button>

      {open && (
        <p
          id={id}
          className="mt-1 basis-full rounded-lg bg-line/40 px-3 py-2.5 text-[14px] leading-relaxed text-ink"
        >
          {text}
        </p>
      )}
    </>
  )
}
