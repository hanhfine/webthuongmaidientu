/**
 * Utility for sanitizing and escaping text inputs against XSS attacks.
 */

const HTML_TAG_REGEX = /<[^>]*>/g;
const DANGEROUS_PROTOCOLS = /^(javascript|data|vbscript):/i;

export function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function stripHtml(str) {
  if (typeof str !== 'string') return str;
  return str.replace(HTML_TAG_REGEX, '').trim();
}

export function sanitizeText(str) {
  if (typeof str !== 'string') return str;
  return stripHtml(str);
}

export function isSafeUrl(url) {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  return !DANGEROUS_PROTOCOLS.test(trimmed);
}
