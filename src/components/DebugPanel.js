export function DebugPanel({ visible, row, datasetStats }) {
  const React = globalThis.React;
  if (!visible || !row) return null;
  const lines = Object.entries(row).map(([k, v]) => `${k}: ${v}`).join('\n') + '\n\n' + datasetStats;
  return React.createElement('div', { className: 'debug-box' },
    React.createElement('pre', null, lines)
  );
}

