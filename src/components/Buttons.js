export function ActionButtons({ onHint, onSubmit, onSkip }) {
  const React = globalThis.React;
  const btn = (cls, text, handler, keyHint) => React.createElement('div', { className: 'button-container', key: text },
    React.createElement('button', { className: `action-button ${cls||''}`, onClick: handler, type: 'button' }, text),
    React.createElement('span', { className: 'key-hint' }, keyHint)
  );
  return React.createElement('div', { className: 'action-buttons' },
    btn('hint', 'Hint', onHint, '<?>'),
    btn('submit', 'Submit', onSubmit, '<enter>'),
    btn('', 'Skip', onSkip, '<esc>'),
  );
}
