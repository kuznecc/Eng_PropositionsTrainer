export function AnswerInput({ value, onChange, inputRef, widthCh = 1 }) {
  const React = globalThis.React;
  return React.createElement('input', {
    ref: inputRef,
    className: 'input',
    autoCapitalize: 'off',
    autoComplete: 'off',
    autoCorrect: 'off',
    spellCheck: false,
    value,
    onChange,
    pattern: '[a-zA-Z-]*',
    style: { width: `${Math.max(1, widthCh)}ch` },
    'aria-label': 'Missing preposition',
  });
}

