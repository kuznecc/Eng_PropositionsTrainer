export function ExerciseModeSelector({ selected, onToggle }) {
  const React = globalThis.React;
  const opts = [
    { key: 'base', label: 'Base' },
    { key: 'past_simple', label: 'Past Simple' },
    { key: 'past_participle', label: 'Past Participle' },
  ];

  function handleToggle(key) { onToggle(key); }

  return React.createElement('div', { className: 'exercise-selector', role: 'group', 'aria-label': 'Exercise mode' },
    ...opts.map(opt => React.createElement('button', {
      key: opt.key,
      type: 'button',
      className: `exercise-button ${selected.includes(opt.key) ? 'selected' : ''}`,
      onClick: () => handleToggle(opt.key),
      'aria-pressed': selected.includes(opt.key),
    }, opt.label))
  );
}
