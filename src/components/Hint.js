export function Hint({ visible, row, preconditionTypes, answers }) {
  const React = globalThis.React;
  if (!visible || !row) return null;
  const infoIcon = React.createElement('span', { dangerouslySetInnerHTML: { __html: '&#8505;' } });
  return React.createElement('div', { className: 'hint-box' },
    React.createElement('h4', null, 'Hint'),
    React.createElement('div', null,
      React.createElement('strong', null, 'Verb:'), ' ', row.verb
    ),
    React.createElement('div', null,
      React.createElement('strong', null, 'Preposition:'), ' ', answers.join(' or ')
    ),
    row.type ? React.createElement('div', null,
      React.createElement('strong', null, 'Preposition type:'), ' ', row.type,
      preconditionTypes && preconditionTypes[row.type]
        ? React.createElement('span', { className: 'tooltip-container' },
            ' ', infoIcon,
            React.createElement('span', { className: 'tooltip-text key-hint', style: { fontSize: '14px', textAlign: 'left' } }, preconditionTypes[row.type])
          )
        : null
    ) : null
  );
}

