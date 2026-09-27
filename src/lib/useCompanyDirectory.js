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
    fetchPromise = api.get('/api/users/companies-directory')
      .then(res => {
        const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        cachedDirectory = list;
        fetchPromise = null;
        return list;
      })
      .catch(err => {
        fetchPromise = null;
        console.error('Failed to load company directory:', err);
        return cachedDirectory || [];
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
