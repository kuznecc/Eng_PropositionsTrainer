import { prepositionsMode } from './modes/prepositions/index.js';
import { irregularVerbsMode } from './modes/irregular_verbs/index.js';
import { Title } from './components/Title.js';
import { LevelFilter } from './components/LevelFilter.js';
import { QuizForm } from './components/QuizForm.js';
import { ActionButtons } from './components/Buttons.js';
import { Hint } from './components/Hint.js';
import { Toast } from './components/Toast.js';
import { DebugPanel } from './components/DebugPanel.js';
import { useDataset } from './hooks/useDataset.js';
import { useQueue } from './hooks/useQueue.js';
import { useToast } from './hooks/useToast.js';
import { sanitizeAnswer } from './utils/validation.js';

const React = globalThis.React;
const ReactDOM = globalThis.ReactDOM;

const MODES = {
  prepositions: prepositionsMode,
  irregular_verbs: irregularVerbsMode,
};

function usePreconditionTypes() {
  const [types, setTypes] = React.useState({});
  React.useEffect(() => {
    let alive = true;
    async function run() {
      try {
        const res = await fetch('assets/precondition_types.md');
        if (!res.ok) return;
        const text = await res.text();
        const map = {};
        const sections = text.split('## ').slice(1);
        sections.forEach(section => {
          const lines = section.split('\n').filter(line => line.trim() !== '');
          if (lines.length > 0) {
            const title = lines[0].replace(':', '').trim();
            const content = lines.slice(1).map(line => line.trim().replace(/^- /, '')).join('\n');
            map[title] = content;
          }
        });
        if (alive) setTypes(map);
      } catch {}
    }
    run();
    return () => { alive = false; };
  }, []);
  return types;
}

function ModeView({ mode, persisted, setPersisted }) {
  const { rows, levels, loading } = useDataset(mode);
  const [selectedLevel, setSelectedLevel] = React.useState(persisted?.selectedLevel || 'All Levels');
  const filtered = React.useMemo(() => {
    if (selectedLevel === 'All Levels') return rows;
    return rows.filter(r => (mode.levels(r) || '') === selectedLevel);
  }, [rows, selectedLevel, mode]);
  React.useEffect(() => { setPersisted(prev => ({ selectedLevel })); }, [selectedLevel]);

  const { index, item, next } = useQueue(filtered);
  const inputRef = React.useRef(null);
  const [value, setValue] = React.useState('');
  const [showHint, setShowHint] = React.useState(false);
  const [showDebug, setShowDebug] = React.useState(!!persisted?.showDebug);
  React.useEffect(() => { setPersisted(prev => ({ showDebug })); }, [showDebug]);
  const { toast, showToast, clearToast } = useToast();
  const preconditionTypes = usePreconditionTypes();

  React.useEffect(() => {
    setValue('');
    setShowHint(false);
    setTimeout(() => inputRef.current && inputRef.current.focus(), 0);
  }, [index]);

  const onSubmit = () => {
    if (!item) return;
    if (toast?.type === 'warning') clearToast();
    setShowHint(false);
    const { correct } = mode.evaluate(value, item);
    if (correct) {
      showToast('ok', 'OK');
      const prompt = mode.buildPrompt(item);
      const prevAnswerParts = { before: prompt.before, preposition: sanitizeAnswer(value), after: prompt.after };
      setPersisted(state => ({ solvedCount: (state.solvedCount || 0) + 1, prevAnswerParts }));
      next();
    } else {
      showToast('bad', 'Wrong');
      setValue('');
      setTimeout(() => inputRef.current && inputRef.current.focus(), 0);
    }
  };

  function handleInputChange(e) {
    const newValue = e.target.value;
    const lastChar = newValue.slice(-1);
    if (/[a-zA-Z-]/.test(lastChar) || newValue === '') {
      if (toast?.type === 'warning') clearToast();
    } else if (/\p{L}/u.test(lastChar)) {
      showToast('warning', `Non-English layout. [${lastChar}]`);
    }
    setValue(newValue.replace(/[^a-zA-Z-]/g, ''));
  }

  React.useEffect(() => {
    const handleKeyDown = (event) => {
      const activeEl = document.activeElement;
      const isTyping = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable);
      if (event.key === 'Escape') { next(); return; }
      if (event.key === '?') { setShowHint(prev => !prev); return; }
      if ((/^[a-zA-Z-]$/.test(event.key) || event.key === 'Backspace') && !isTyping) {
        inputRef.current && inputRef.current.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [next]);

  const prompt = item ? mode.buildPrompt(item) : { before: '', after: '' };
  const datasetStats = React.useMemo(() => {
    if (!rows || rows.length === 0) return 'Dataset size: 0';
    const counts = rows.reduce((acc, r) => { const lvl = r.level || 'Unknown'; acc[lvl] = (acc[lvl] || 0) + 1; return acc; }, {});
    const parts = Object.entries(counts).sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => `${k}:${v}`).join(', ');
    return `Dataset size: ${rows.length} [${parts}]`;
  }, [rows]);

  const answers = item ? String(item.preposition || '').toLowerCase().split('|').map(s => s.trim()).filter(Boolean) : [];

  return React.createElement(React.Fragment, null,
    React.createElement(Title, { text: mode.title }),
    React.createElement('div', { className: 'spacer-1' }),
    React.createElement(LevelFilter, { levels, selected: selectedLevel, onSelect: setSelectedLevel, currentRowLevel: item?.level }),
    loading ? React.createElement('div', null, 'Loading...') : (
      item ? React.createElement(QuizForm, {
        before: prompt.before,
        after: prompt.after,
        value,
        onChange: handleInputChange,
        onSubmit,
        inputRef,
      }) : React.createElement('div', null, 'No items')
    ),
    item ? React.createElement('div', { style: { marginTop: '12px' } },
      item.meaning ? React.createElement('div', { className: 'key-hint', style: { fontSize: '14px', textAlign: 'center' } },
        React.createElement('strong', null, 'Meaning:'), ' ', item.meaning
      ) : null,
      item.type ? React.createElement('div', { className: 'key-hint', style: { fontSize: '14px', textAlign: 'center', marginTop: '4px' } },
        React.createElement('strong', null, 'Preposition type:'), ' ', item.type
      ) : null,
      React.createElement('div', { className: 'key-hint', style: { fontSize: '14px', textAlign: 'center', marginTop: '4px' } },
        React.createElement('strong', null, 'Solved:'), ' ', React.createElement('span', { style: { color: 'var(--ok)', fontWeight: 'bold' } }, String(persisted?.solvedCount || 0))
      )
    ) : null,
    React.createElement(Toast, { toast }),
    React.createElement(ActionButtons, { onHint: () => setShowHint(v => !v), onSubmit, onSkip: next }),
    React.createElement(Hint, { visible: showHint && !!item, row: item, preconditionTypes, answers }),
    React.createElement('div', { className: 'key-hint', style: { fontSize: '14px', textAlign: 'center', marginTop: '12px' } },
      React.createElement('strong', null, 'Last:'), ' ', persisted?.prevAnswerParts
        ? [persisted.prevAnswerParts.before || '', persisted.prevAnswerParts.before ? ' ' : '', React.createElement('strong', { key: 'p' }, persisted.prevAnswerParts.preposition), persisted.prevAnswerParts.after ? ' ' : '', persisted.prevAnswerParts.after || '']
        : '---'
    ),
    React.createElement('div', { className: 'debug-toggle' },
      React.createElement('input', { type: 'checkbox', id: `show-debug-${mode.id}`, checked: showDebug, onChange: e => setShowDebug(e.target.checked) }),
      React.createElement('label', { htmlFor: `show-debug-${mode.id}` }, 'Debug Info')
    ),
    React.createElement(DebugPanel, { visible: showDebug, row: item, datasetStats }),
    React.createElement('div', { className: 'spacer-2' })
  );
}

function App() {
  const [modeId, setModeId] = React.useState('prepositions');
  const mode = MODES[modeId];
  const [perMode, setPerMode] = React.useState({});
  const defaultState = { selectedLevel: 'All Levels', showDebug: false, solvedCount: 0, prevAnswerParts: null };
  const persisted = perMode[modeId] || defaultState;
  const setPersisted = (update) => {
    setPerMode(prev => {
      const current = prev[modeId] || defaultState;
      const patch = typeof update === 'function' ? update(current) : update;
      return { ...prev, [modeId]: { ...current, ...patch } };
    });
  };

  const modeButtons = ['prepositions','irregular_verbs'].map(m => React.createElement('button', {
    key: m,
    className: `mode-button ${modeId === m ? 'selected' : ''}`,
    onClick: () => setModeId(m),
    type: 'button',
  }, m === 'prepositions' ? 'Prepositions' : 'Irregular verbs'));

  return React.createElement('div', { className: 'app' },
    React.createElement('div', { className: 'mode-bar' }, ...modeButtons),
    React.createElement(ModeView, { mode, persisted, setPersisted })
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));
