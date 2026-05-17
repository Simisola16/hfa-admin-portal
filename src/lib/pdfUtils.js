export const getPdfUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (url.startsWith('/')) return `${import.meta.env.VITE_API_URL}${url}`;
  return `${import.meta.env.VITE_API_URL}/${url}`;
};
