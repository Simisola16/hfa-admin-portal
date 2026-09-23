/**
 * Resolves a file URL stored in the database to a full viewable URL.
 *
 * Handles:
 *   1. Absolute URLs (http/https) — returned as-is (S3 public, Cloudinary, etc.)
 *   2. New AWS S3 backend proxy paths (/api/files/s3/...) — prefixed with API URL
 *   3. Legacy MongoDB GridFS paths (/api/files/:id) — prefixed with API URL
 *   4. Any other relative path starting with / — prefixed with API URL
 *   5. Non-slash relative paths — joined to API URL with /
 */
export const getPdfUrl = (url) => {
  if (!url) return '';

  // Already a full absolute URL (S3 direct, CDN, Cloudinary, or HTTP/HTTPS)
  if (url.startsWith('http://') || url.startsWith('https://')) return url;

  const API_URL = import.meta.env.VITE_API_URL || 'https://backend.hfaportal.company';

  // Backend-proxied path (includes S3 streaming and legacy GridFS)
  if (url.startsWith('/')) return `${API_URL}${url}`;

  // Relative path without leading slash
  return `${API_URL}/${url}`;
};
