const controls = 'button, [role="button"], a.nav-link, a.btn, a.primary-action, a.secondary-action, a.text-action, a.icon-button, .avatar-upload-button, summary'

// Delegation also covers controls mounted later, including teleported dialogs.
export function initializeInteractionMotion() {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  const animations = new Map()

  function onClick(event) {
    if (reducedMotion.matches || !(event.target instanceof Element)) return
    const control = event.target.closest(controls)
    if (!control || control.matches(':disabled, [aria-disabled="true"], [aria-busy="true"]') || control.closest('[inert]') || !control.animate) return

    animations.get(control)?.cancel()
    const animation = control.animate(
      [{ scale: '.97' }, { scale: '1.012', offset: .65 }, { scale: '1' }],
      { duration: 240, easing: 'cubic-bezier(.2, .7, .2, 1)' },
    )
    animations.set(control, animation)
    const clear = () => { if (animations.get(control) === animation) animations.delete(control) }
    animation.onfinish = clear
    animation.oncancel = clear
  }

  const cancelAnimations = () => {
    for (const animation of animations.values()) animation.cancel()
    animations.clear()
  }
  // Capture feedback before click handlers disable or remove a control; never delay its action.
  document.addEventListener('click', onClick, true)
  reducedMotion.addEventListener('change', cancelAnimations)
  return () => {
    document.removeEventListener('click', onClick, true)
    reducedMotion.removeEventListener('change', cancelAnimations)
    cancelAnimations()
  }
}
