export function Toast({ toast }) {
  const React = globalThis.React;
  if (!toast) return React.createElement('div', { style: { visibility: 'hidden' } },
    React.createElement('div', { className: 'result' }, '\u00A0')
  );
  return React.createElement('div', { key: toast.key, className: 'fade2s', 'aria-live': 'polite' },
    React.createElement('div', { className: `result ${toast.type}` }, toast.text)
  );
}

