import { TOAST_DURATION_MS } from '../utils/constants.js';

export function useToast() {
  const React = globalThis.React;
  const [toast, setToast] = React.useState(null); // {key,type,text}

  React.useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), TOAST_DURATION_MS);
    return () => clearTimeout(t);
  }, [toast]);

  function showToast(type, text) {
    setToast({ key: Date.now(), type, text });
  }

  return { toast, showToast, clearToast: () => setToast(null) };
}

