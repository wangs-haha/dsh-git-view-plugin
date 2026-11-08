/** Plan the host event endpoint without depending on a page path or old port. */
export function reloadTarget(value) {
  if (!value) {
    throw new Error('Set DSH_WEB_URL or DSH_ORIGIN to the existing DSH instance; no default port is assumed.')
  }
  const base = new URL(value)
  if (!['http:', 'https:'].includes(base.protocol)) {
    throw new Error('DSH origin must use HTTP(S)')
  }
  return new URL('/plugins/events', base.origin)
}
