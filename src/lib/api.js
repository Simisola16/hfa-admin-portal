const API_URL = import.meta.env.VITE_API_URL || 'https://backend.hfaportal.company';

function getToken() {
  return localStorage.getItem('hfa_token');
}

async function request(method, path, body, isFormData = false) {
  const token = getToken();
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const isForm = isFormData || (typeof FormData !== 'undefined' && body instanceof FormData);
  if (!isForm) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
  });

  let data;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await res.json().catch(() => ({}));
  } else {
    const text = await res.text().catch(() => '');
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text || res.statusText || 'Request failed' };
    }
  }

  if (!res.ok) throw new Error(data?.error || data?.message || `Request failed with status ${res.status}`);
  return data;
}

export const api = {
  get: (path, options) => {
    let url = path;
    const params = options?.params;
    if (params && typeof params === 'object') {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          searchParams.append(key, val);
        }
      });
      const qs = searchParams.toString();
      if (qs) {
        url += (url.includes('?') ? '&' : '?') + qs;
      }
    }
    return request('GET', url);
  },
  post: (path, body, isFormData) => request('POST', path, body, isFormData),
  put: (path, body, isFormData) => request('PUT', path, body, isFormData),
  patch: (path, body, isFormData) => request('PATCH', path, body, isFormData),
  delete: (path) => request('DELETE', path),

  downloadBlob: async (method, path, body) => {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Request failed with status ${res.status}`);
    }
    return res.blob();
  },

  /**
   * Upload a PDF (or image) to Supabase Storage via the backend.
   * @param {File}   file   - The File object from an <input type="file">
   * @param {string} folder - Storage folder, e.g. 'proposals', 'invoices'
   * @returns {Promise<string>} public Supabase URL
   */
  uploadPdf: async (file, folder = 'general') => {
    const form = new FormData();
    form.append('file', file);
    form.append('folder', folder);
    const data = await request('POST', '/api/upload', form, true);
    return data.url;
  },
};

export default api;
