import { AnswerInput } from './AnswerInput.js';
import { splitAnswers } from '../utils/validation.js';

export function VerbFormsInputs({ item, values, setValues, activePos, setActivePos, inputRefs, promptBefore }) {
  const React = globalThis.React;
  const fields = [
    { key: 'past_simple', label: 'Past Simple' },
    { key: 'past_participle', label: 'Past Participle' },
  ];

  function sanitizeFieldInput(s) {
    return String(s || '').replace(/[^a-zA-Z-]/g, '');
  }

  function expectedParts(key) {
    if (!item) return [''];
    if (key === 'base') return [item.base || ''];
    return splitAnswers(item[key]);
  }

  function handleChange(key, idx, e) {
    const raw = e.target.value;
    const v = sanitizeFieldInput(raw);
    setValues(prev => {
      const arr = Array.isArray(prev[key]) ? prev[key].slice() : [];
      arr[idx] = v;
      return { ...prev, [key]: arr };
    });
  }

  function handleKeyDown(key, idx, e) {
    if (e.key === ' ') {
      // Prevent space character entering the field; global handler moves focus
      e.preventDefault();
      return;
    }
    if (e.key === 'Backspace') {
      const curr = (values[key] && values[key][idx]) || '';
      if (curr.length === 0) {
        // Prevent browser beep and let global handler move focus to previous
        e.preventDefault();
      }
      return;
    }
    // Allow normal typing of letters/hyphen; sanitization occurs in onChange
  }

  function displayValue(key, idx) {
    return (values[key] && values[key][idx]) || '';
  }

  return React.createElement('div', { className: 'forms-row', role: 'group', 'aria-label': 'Verb forms' },
    React.createElement('div', { className: 'form-block' },
      React.createElement('div', { className: 'form-label' },
        React.createElement('span', null, 'Base'),
      ),
      React.createElement('span', { className: 'before' }, (promptBefore || '').trim(), '\u00A0'),
    ),
    ...fields.map(f => {
      const parts = expectedParts(f.key);
      return React.createElement('div', { key: f.key, className: 'form-block' },
        React.createElement('div', { className: 'form-label' },
          React.createElement('span', null, f.label),
        ),
        React.createElement('div', { className: 'subgroup' },
          ...parts.flatMap((_, idx) => {
            const nodes = [
              React.createElement('span', { key: `${f.key}-input-${idx}`, className: 'inputWrap inputWrap--small' },
                React.createElement(AnswerInput, {
                  id: `vf-${f.key}-${idx}`,
                  inputRef: (el) => {
                    if (!inputRefs.current[f.key]) inputRefs.current[f.key] = [];
                    inputRefs.current[f.key][idx] = el;
                  },
                  value: displayValue(f.key, idx),
                  onChange: (e) => handleChange(f.key, idx, e),
                  onKeyDown: (e) => handleKeyDown(f.key, idx, e),
                  onFocus: () => setActivePos({ key: f.key, idx }),
                  widthCh: displayValue(f.key, idx).length,
                  ariaLabel: `${f.label} form ${idx + 1}`,
                })
              )
            ];
            if (idx < parts.length - 1) {
              nodes.push(React.createElement('span', { key: `${f.key}-sep-${idx}`, className: 'sub-sep' }, '+'));
            }
            return nodes;
          })
        )
      );
    })
  );
}

