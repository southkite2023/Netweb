// Resolve taps in the narrow gap around controls using the browser's visible hit surface.
(() => {
  const controls = 'button, summary, a[href], [role="button"], [role="tab"], [role="option"], [role="switch"], .avatar-upload-button, input:is([type="button"],[type="submit"],[type="reset"],[type="image"])'
  const protectedArea = controls + ', input, select, textarea, label, [contenteditable]:not([contenteditable="false"])'
  const disabled = ':disabled, [inert], [aria-disabled="true"], [aria-busy="true"]'
  let press

  function nearby(event, radius) {
    const origin = document.elementFromPoint(event.clientX, event.clientY)
    if (!origin || origin.closest(protectedArea)) return null
    let nearest = null
    let best = Infinity
    for (const dx of [-radius, 0, radius]) {
      for (const dy of [-radius, 0, radius]) {
        if (!dx && !dy) continue
        const stack = document.elementsFromPoint(event.clientX + dx, event.clientY + dy)
        const hit = stack[0]
        const control = hit?.closest(controls)
        if (!control || (!origin.contains(control) && !stack.includes(origin)) || control.closest(disabled)) continue
        if (control.matches('a') && getComputedStyle(control).display === 'inline' &&
            !control.matches('[role], .btn, .text-action, .nav-link, .icon-button') && !control.querySelector('img,svg')) continue
        const rect = control.getBoundingClientRect()
        const distance = Math.hypot(Math.max(rect.left - event.clientX, 0, event.clientX - rect.right),
          Math.max(rect.top - event.clientY, 0, event.clientY - rect.bottom))
        if (distance <= radius && distance < best) {
          nearest = control
          best = distance
        }
      }
    }
    return nearest
  }

  document.addEventListener('pointerdown', event => {
    press = null
    if (!event.isPrimary || event.button !== 0) return
    const radius = event.pointerType === 'touch' ? 8 : 4
    const control = nearby(event, radius)
    if (control) press = { control, radius, x: event.clientX, y: event.clientY }
  }, true)
  document.addEventListener('pointercancel', () => { press = null }, true)
  document.addEventListener('click', event => {
    const start = press
    press = null
    if (!start || !event.isTrusted || !event.detail || event.defaultPrevented ||
        Math.hypot(event.clientX - start.x, event.clientY - start.y) > start.radius ||
        nearby(event, start.radius) !== start.control) return
    event.preventDefault()
    event.stopImmediatePropagation()
    start.control.focus({ preventScroll: true })
    start.control.dispatchEvent(new MouseEvent('click', event))
  }, true)
})()
