export function scrollBehavior(to, from, savedPosition) {
  // History navigation should restore the reader's previous position.
  if (savedPosition) return { ...savedPosition, behavior: 'instant' }

  // Query updates represent controls within the current page, not a new page.
  // Returning false leaves the viewport alone, including after content resizes.
  if (to.path === from.path && to.hash === from.hash) return false

  if (to.hash) return { el: to.hash, behavior: 'instant' }
  return { top: 0, left: 0, behavior: 'instant' }
}
