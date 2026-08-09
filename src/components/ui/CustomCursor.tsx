import { useEffect, useRef } from 'react'

/**
 * Executive custom cursor: a small dot plus a thin ring that expands over
 * interactive elements. Mounted once at the app root.
 *
 * - Desktop only: activates exclusively on `(pointer: fine)` devices and
 *   only when `prefers-reduced-motion` is NOT set; touch/coarse devices and
 *   reduced-motion users keep the fully native cursor.
 * - Zero React re-renders: pointer tracking writes DOM transforms directly
 *   inside one requestAnimationFrame loop (ring position is lightly
 *   interpolated; the dot tracks 1:1).
 * - Native cursors are preserved where they matter: text caret on inputs/
 *   textareas, native select behavior, and `not-allowed` on disabled
 *   controls (the custom cursor fades out there — see index.css).
 */

const INTERACTIVE_SELECTOR = [
  'a',
  'button',
  '[role="button"]',
  '[role="tab"]',
  '[role="menuitem"]',
  '.cursor-pointer', // clickable table rows use this Tailwind class
  '[data-cursor="interactive"]',
].join(', ')

/** Zones where the native cursor stays visible and the custom one hides. */
const NATIVE_SELECTOR = 'input, textarea, select, [aria-disabled="true"]'

const DISABLED_SELECTOR = ':disabled, [aria-disabled="true"]'

export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const finePointer = window.matchMedia('(pointer: fine)')
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const dot = dotRef.current
    const ring = ringRef.current
    if (!dot || !ring) return

    let active = false
    let rafId = 0
    let visible = false
    const target = { x: -100, y: -100 }
    const ringPos = { x: -100, y: -100 }

    function applyActive() {
      const shouldActivate = finePointer.matches && !reducedMotion.matches
      if (shouldActivate === active) return
      active = shouldActivate
      document.documentElement.classList.toggle('custom-cursor', active)
      if (!active) hide()
    }

    function hide() {
      visible = false
      dot!.style.opacity = '0'
      ring!.style.opacity = '0'
      cancelAnimationFrame(rafId)
      rafId = 0
    }

    function loop() {
      // Light interpolation gives the ring its premium trailing feel; the
      // loop only runs while the cursor is visible.
      ringPos.x += (target.x - ringPos.x) * 0.3
      ringPos.y += (target.y - ringPos.y) * 0.3
      ring!.style.transform = `translate3d(${ringPos.x}px, ${ringPos.y}px, 0) translate(-50%, -50%)`
      rafId = visible ? requestAnimationFrame(loop) : 0
    }

    function onMouseMove(e: MouseEvent) {
      if (!active) return
      target.x = e.clientX
      target.y = e.clientY
      dot!.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -50%)`
      if (!visible) {
        visible = true
        ringPos.x = e.clientX
        ringPos.y = e.clientY
        dot!.style.opacity = '1'
        ring!.style.opacity = '1'
        if (!rafId) rafId = requestAnimationFrame(loop)
      }
    }

    function onMouseOver(e: MouseEvent) {
      if (!active) return
      const el = e.target as Element | null
      if (!el || !(el instanceof Element)) return
      // Native zones (text fields, selects, disabled controls): fade the
      // custom cursor out and let the browser cursor take over.
      const nativeZone = el.closest(NATIVE_SELECTOR)
      const disabled = el.closest(DISABLED_SELECTOR)
      if (nativeZone || disabled) {
        dot!.dataset.state = 'hidden'
        ring!.dataset.state = 'hidden'
        return
      }
      const interactive = el.closest(INTERACTIVE_SELECTOR)
      const state = interactive ? 'interactive' : 'default'
      dot!.dataset.state = state
      ring!.dataset.state = state
    }

    function onLeave() {
      hide()
    }

    applyActive()
    finePointer.addEventListener('change', applyActive)
    reducedMotion.addEventListener('change', applyActive)
    document.addEventListener('mousemove', onMouseMove, { passive: true })
    document.addEventListener('mouseover', onMouseOver, { passive: true })
    document.documentElement.addEventListener('mouseleave', onLeave)

    return () => {
      finePointer.removeEventListener('change', applyActive)
      reducedMotion.removeEventListener('change', applyActive)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseover', onMouseOver)
      document.documentElement.removeEventListener('mouseleave', onLeave)
      document.documentElement.classList.remove('custom-cursor')
      cancelAnimationFrame(rafId)
    }
  }, [])

  return (
    <>
      <div ref={dotRef} data-cursor-dot data-state="default" aria-hidden />
      <div ref={ringRef} data-cursor-ring data-state="default" aria-hidden />
    </>
  )
}
