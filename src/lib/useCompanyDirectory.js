import { useState, useEffect } from 'react';
import api from './api';

// In-memory singleton cache to prevent repeated fetches across tabs and pages
let cachedDirectory = null;
let fetchPromise = null;

export async function fetchCompanyDirectory() {
  if (cachedDirectory && cachedDirectory.length > 0) {
    return cachedDirectory;
  }
  if (!fetchPromise) {
    fetchPromise = (async () => {
      // 1. Try dedicated endpoint first
      try {
        const res = await api.get('/api/users/companies-directory');
        const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        if (list.length > 0) {
          cachedDirectory = list;
          return list;
        }
      } catch (err) {
        console.warn('Dedicated companies-directory endpoint unavailable, falling back to /api/sites:', err.message);
      }

      // 2. Resilient Fallback: Extract all companies & sites from /api/sites (universally live and available on all environments)
      try {
        const sitesRes = await api.get('/api/sites');
        const rawSites = Array.isArray(sitesRes?.data) ? sitesRes.data : (Array.isArray(sitesRes) ? sitesRes : []);
        const companyMap = new Map();

        rawSites.forEach(s => {
          const compName = (s.profiles?.company_name || s.est_name || s.trading_name || s.company_name || '').trim();
          if (!compName || compName === '—') return;
          const key = compName.toLowerCase();
          if (!companyMap.has(key)) {
            const rawCid = s.client_id;
            const cid = rawCid ? (typeof rawCid === 'object' ? String(rawCid._id || rawCid.id || '') : String(rawCid)) : String(s._id);
            companyMap.set(key, {
              id: cid,
              name: compName,
              sites: []
            });
          }
          const entry = companyMap.get(key);
          const siteName = (s.name || s.est_name || s.trading_name || '').trim();
          if (siteName && !entry.sites.some(st => st.name.toLowerCase() === siteName.toLowerCase())) {
            entry.sites.push({
              id: String(s._id || s.id),
              name: siteName
            });
          }
        });

        const list = Array.from(companyMap.values()).sort((a, b) => a.name.localeCompare(b.name));
        if (list.length > 0) {
          cachedDirectory = list;
          return list;
        }
      } catch (err2) {
        console.error('Failed to load company directory fallback from /api/sites:', err2);
      }

      return cachedDirectory || [];
    })().finally(() => {
      fetchPromise = null;
    });
  }
  return fetchPromise;
}

export function useCompanyDirectory() {
  const [companies, setCompanies] = useState(cachedDirectory || []);
  const [loading, setLoading] = useState(!cachedDirectory);

  useEffect(() => {
    let mounted = true;
    fetchCompanyDirectory().then(list => {
      if (mounted) {
        setCompanies(list);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  return { companies, loading };
}

export default useCompanyDirectory;
