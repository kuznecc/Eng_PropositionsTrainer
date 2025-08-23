export function LevelFilter({ levels, selected, onSelect, currentRowLevel }) {
  const React = globalThis.React;
  const container = React.createElement('div', { className: 'level-selector' },
    ...(levels || []).map(level => React.createElement('div', { key: level, className: 'level-container' },
      React.createElement('button', {
        className: `level-button ${selected === level ? 'selected' : ''}`,
        onClick: () => onSelect(level),
        type: 'button',
      }, level),
      selected === 'All Levels' && currentRowLevel === level
        ? React.createElement('div', { className: 'level-indicator' }, '^')
        : null
    ))
  );
  return container;
}

