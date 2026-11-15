import { useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react';
import { RECAPTCHA_ENABLED, RECAPTCHA_SITE_KEY } from '../lib/recaptcha';

let scriptLoadPromise = null;

function loadRecaptchaScript() {
  if (typeof window === 'undefined') return Promise.reject(new Error('Window unavailable'));
  if (window.grecaptcha && typeof window.grecaptcha.render === 'function') {
    return Promise.resolve(window.grecaptcha);
  }
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise((resolve, reject) => {
    const callbackName = '__hfaRecaptchaOnLoad';
    window[callbackName] = () => {
      if (window.grecaptcha && typeof window.grecaptcha.render === 'function') {
        resolve(window.grecaptcha);
      } else if (window.grecaptcha?.ready) {
        window.grecaptcha.ready(() => resolve(window.grecaptcha));
      } else {
        reject(new Error('reCAPTCHA failed to initialize'));
      }
    };

    const existing = document.querySelector('script[data-hfa-recaptcha="true"]');
    if (existing) {
      existing.addEventListener('error', () => {
        scriptLoadPromise = null;
        reject(new Error('Failed to load Google reCAPTCHA script'));
      });
      return;
    }

    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?onload=${callbackName}&render=explicit`;
    script.async = true;
    script.defer = true;
    script.setAttribute('data-hfa-recaptcha', 'true');
    script.onerror = () => {
      scriptLoadPromise = null;
      reject(new Error('Failed to load Google reCAPTCHA script'));
    };
    document.head.appendChild(script);
  });

  return scriptLoadPromise;
}

const ReCaptcha = forwardRef(function ReCaptcha({ onChange }, ref) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const [loadError, setLoadError] = useState(false);

  onChangeRef.current = onChange;

  useImperativeHandle(ref, () => ({
    reset: () => {
      onChangeRef.current?.('');
      if (widgetIdRef.current !== null && window.grecaptcha?.reset) {
        try {
          window.grecaptcha.reset(widgetIdRef.current);
        } catch {
          // Ignore reset errors if widget was unmounted
        }
      }
    },
  }));

  useEffect(() => {
    if (!RECAPTCHA_ENABLED) return;
    let cancelled = false;

    loadRecaptchaScript()
      .then((grecaptcha) => {
        if (cancelled || !containerRef.current) return;
        containerRef.current.innerHTML = '';
        widgetIdRef.current = grecaptcha.render(containerRef.current, {
          sitekey: RECAPTCHA_SITE_KEY,
          callback: (token) => onChangeRef.current?.(token || ''),
          'expired-callback': () => onChangeRef.current?.(''),
          'error-callback': () => onChangeRef.current?.(''),
        });
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });

    return () => {
      cancelled = true;
      widgetIdRef.current = null;
    };
  }, []);

  if (!RECAPTCHA_ENABLED) return null;

  return (
    <div style={{ margin: '16px 0 20px' }}>
      <div ref={containerRef} />
      {loadError && (
        <p style={{ fontSize: 12, color: '#dc2626', marginTop: 6 }}>
          Unable to load Google verification. Please disable ad blockers or refresh the page.
        </p>
      )}
    </div>
  );
});

export default ReCaptcha;

