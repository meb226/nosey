'use client'

import { useEffect, useRef } from 'react'

/**
 * A tasting runs ~20 minutes with the phone face-up on the table.
 *
 * Screen Wake Lock is Safari 18.4+ and home-screen web apps only, so this is
 * a no-op in the browser and on older phones — hence the feature check rather
 * than a try/catch around a missing API. iOS also drops the lock whenever the
 * page is hidden, so re-acquire on visibilitychange.
 */
export function useWakeLock(active: boolean) {
  const lock = useRef<WakeLockSentinel | null>(null)

  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return

    let cancelled = false

    const acquire = async () => {
      if (document.visibilityState !== 'visible' || lock.current) return
      try {
        const sentinel = await navigator.wakeLock.request('screen')
        if (cancelled) {
          void sentinel.release()
          return
        }
        lock.current = sentinel
        sentinel.addEventListener('release', () => {
          lock.current = null
        })
      } catch {
        // Denied or unsupported. The screen dimming is a nuisance, not a fault.
      }
    }

    void acquire()
    document.addEventListener('visibilitychange', acquire)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', acquire)
      void lock.current?.release()
      lock.current = null
    }
  }, [active])
}
