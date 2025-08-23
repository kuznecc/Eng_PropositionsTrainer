import { AnswerInput } from './AnswerInput.js';

export function QuizForm({ before, after, value, onChange, onSubmit, inputRef }) {
  const React = globalThis.React;
  return React.createElement('form', {
    className: 'row',
    onSubmit: e => { e.preventDefault(); onSubmit(); },
    'aria-live': 'polite'
  },
    React.createElement('span', { className: 'before' }, (before || '').trim(), '\u00A0'),
    React.createElement('span', { className: 'inputWrap' },
      React.createElement(AnswerInput, {
        inputRef,
        value,
        onChange,
        widthCh: value.length,
      })
    ),
    React.createElement('span', { className: 'after' }, '\u00A0', (after || '').trim()),
    React.createElement('button', { type: 'submit', className: 'sr-only' }, 'Check')
  );
}

