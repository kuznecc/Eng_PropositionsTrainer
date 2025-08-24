import { prepositionsMode } from './modes/prepositions/index.js';
import { irregularVerbsMode } from './modes/irregular_verbs/index.js';
import { DEFAULT_MODE_ID } from './utils/constants.js';
import { Title } from './components/Title.js';
import { LevelFilter } from './components/LevelFilter.js';
import { QuizForm } from './components/QuizForm.js';
import { ActionButtons } from './components/Buttons.js';
import { Hint } from './components/Hint.js';
import { Toast } from './components/Toast.js';
import { DebugPanel } from './components/DebugPanel.js';
// ExerciseModeSelector removed from UI; per-field checkboxes handle selection
import { VerbFormsInputs } from './components/VerbFormsInputs.js';
import { useDataset } from './hooks/useDataset.js';
import { useQueue } from './hooks/useQueue.js';
import { useToast } from './hooks/useToast.js';
import { sanitizeAnswer, splitAnswers } from './utils/validation.js';

const React = globalThis.React;
const ReactDOM = globalThis.ReactDOM;

const MODES = {
  prepositions: prepositionsMode,
  irregular_verbs: irregularVerbsMode,
};
const STORAGE_KEY = 'vk_app_state_v1';

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
  
  const [formsValue, setFormsValue] = React.useState({ base: [''], past_simple: [''], past_participle: [''] });
  const [activePos, setActivePos] = React.useState({ key: 'base', idx: 0 });
  const inputRefs = React.useRef({ base: [], past_simple: [], past_participle: [] });
  const filtered = React.useMemo(() => {
    if (selectedLevel === 'All Levels') return rows;
    return rows.filter(r => (mode.levels(r) || '') === selectedLevel);
  }, [rows, selectedLevel, mode]);
  React.useEffect(() => { setPersisted(prev => ({ selectedLevel })); }, [selectedLevel]);
  

  const { index, item, next } = useQueue(filtered);
  const inputRef = React.useRef(null);
  const [value, setValue] = React.useState('');
  const [showHint, setShowHint] = React.useState(false);
  const [showDebug, setShowDebug] = React.useState(false);
  const { toast, showToast, clearToast } = useToast();
  const preconditionTypes = usePreconditionTypes();

  // Initialize forms for irregular verbs when item changes
  React.useEffect(() => {
    if (mode.id !== 'irregular_verbs' || !item) return;
    const partsFor = (k) => String(item[k] || '').toLowerCase().split('|').map(s => s.trim()).filter(Boolean).length
          ? String(item[k] || '').toLowerCase().split('|').map(s => s.trim()).filter(Boolean)
          : [item[k] || ''];
    const nextValues = {};
    const order = ['past_simple', 'past_participle'];
    for (const k of order) {
      const count = partsFor(k).length;
      nextValues[k] = Array(count).fill('');
    }
    setFormsValue(nextValues);
    setActivePos({ key: 'past_simple', idx: 0 });
    setTimeout(() => {
      const el = inputRefs.current['past_simple']?.[0];
      if (el) el.focus();
    }, 0);
  }, [mode, item]);

  React.useEffect(() => {
    setValue('');
    setShowHint(false);
    setTimeout(() => inputRef.current && inputRef.current.focus(), 0);
  }, [index]);

  

  

  const onSubmit = () => {
    if (!item) return;
    if (toast?.type === 'warning') clearToast();
    setShowHint(false);
    const evalRes = mode.id === 'irregular_verbs'
      ? mode.evaluate(formsValue, item, { selectedForms: ['past_simple', 'past_participle'] })
      : mode.evaluate(value, item);
    const { correct } = evalRes;
    if (correct) {
      showToast('ok', 'OK');
      const prompt = mode.buildPrompt(item);
      if (mode.id === 'irregular_verbs') {
        const partsFor = (k) => k === 'base'
          ? [item.base || '']
          : (String(item[k] || '').toLowerCase().split('|').map(s => s.trim()).filter(Boolean).length
              ? String(item[k] || '').toLowerCase().split('|').map(s => s.trim()).filter(Boolean)
              : [item[k] || '']
            );
        const capArr = (arr) => (arr || []).map(t => t ? t.charAt(0).toUpperCase() + t.slice(1) : t).join('|');
        const baseArr = partsFor('base');
        const psArr = (formsValue.past_simple || []);
        const ppArr = (formsValue.past_participle || []);
        const prevIrregularForms = {
          base: capArr(baseArr),
          past_simple: capArr(psArr),
          past_participle: capArr(ppArr),
        };
        setPersisted(state => ({ solvedCount: (state.solvedCount || 0) + 1, prevIrregularForms }));
      } else {
        const prevAnswerParts = { before: prompt.before, preposition: sanitizeAnswer(value), after: prompt.after };
        setPersisted(state => ({ solvedCount: (state.solvedCount || 0) + 1, prevAnswerParts }));
      }
      next();
    } else {
      showToast('bad', 'Wrong');
      if (mode.id === 'irregular_verbs') {
        // Clear only wrongly typed fields; focus the leftmost wrong one
        const wrongPositions = Array.isArray(evalRes.wrongPositions) ? evalRes.wrongPositions : [];
        if (wrongPositions.length > 0) {
          setFormsValue(v => {
            const patch = { ...v };
            wrongPositions.forEach(pos => {
              const arr = Array.isArray(patch[pos.key]) ? patch[pos.key].slice() : [];
              arr[pos.idx] = '';
              patch[pos.key] = arr;
            });
            return patch;
          });
          const order = ['past_simple','past_participle'];
          const leftmostWrong = order.flatMap(k => (formsValue[k] || []).map((_, idx) => ({ key: k, idx })))
            .find(p => wrongPositions.some(w => w.key === p.key && w.idx === p.idx));
          const target = leftmostWrong || order.flatMap(k => (formsValue[k] || []).map((_, idx) => ({ key: k, idx })))[0];
          if (target) {
            setActivePos(target);
            setTimeout(() => inputRefs.current[target.key]?.[target.idx]?.focus(), 0);
          }
        } else {
          // Fallback: clear all selected and focus first editable
          setFormsValue(v => {
            const patch = { ...v };
            [ 'past_simple', 'past_participle' ].forEach(k => { patch[k] = (v[k] || []).map(() => ''); });
            return patch;
          });
          const firstEditable = ['past_simple','past_participle']
            .flatMap(k => (formsValue[k] || []).map((_, idx) => ({ key: k, idx })))
            [0];
          setTimeout(() => firstEditable && inputRefs.current[firstEditable.key]?.[firstEditable.idx]?.focus(), 0);
        }
      } else {
        setValue('');
        setTimeout(() => inputRef.current && inputRef.current.focus(), 0);
      }
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
      if (mode.id !== 'irregular_verbs') {
        if ((/^[a-zA-Z-]$/.test(event.key) || event.key === 'Backspace') && !isTyping) {
          inputRef.current && inputRef.current.focus();
        }
        return;
      }
      // Irregular verbs keyboard handling
      const order = ['base','past_simple','past_participle'];
      const editablePairs = order.flatMap(k => (formsValue[k] || []).map((_, idx) => ({ key: k, idx })));
      const currIndex = editablePairs.findIndex(p => p.key === activePos.key && p.idx === activePos.idx);
      const firstEditable = editablePairs[0];

      const focusPos = (pos) => {
        setActivePos(pos);
        const el = inputRefs.current[pos.key]?.[pos.idx];
        if (el) el.focus();
      };

      if (event.key === 'Enter') {
        event.preventDefault();
        onSubmit();
        return;
      }

      if (event.key === ' ') {
        // Space: move to next editable
        if (editablePairs.length > 0 && currIndex >= 0 && currIndex < editablePairs.length - 1) {
          event.preventDefault();
          focusPos(editablePairs[currIndex + 1]);
        }
        return;
      }
      if (event.key === 'Backspace') {
        // Backspace: if active empty, move prev; otherwise let default
        const currArr = formsValue[activePos.key] || [];
        const currVal = currArr[activePos.idx] || '';
        if (currVal.length === 0 && editablePairs.length > 0 && currIndex > 0) {
          event.preventDefault();
          focusPos(editablePairs[currIndex - 1]);
        }
        return;
      }
      if (/^[a-zA-Z-]$/.test(event.key) && !isTyping) {
        const target = editablePairs.find(p => p.key === activePos.key && p.idx === activePos.idx) || firstEditable;
        if (target) {
          focusPos(target);
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [next, mode, activePos, formsValue]);

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
    null,
    loading ? React.createElement('div', null, 'Loading...') : (
      item ? (
        mode.id === 'irregular_verbs'
          ? React.createElement(VerbFormsInputs, {
              item,
              values: formsValue,
              setValues: setFormsValue,
              activePos,
              setActivePos,
              inputRefs,
              promptBefore: prompt.before,
            })
          : React.createElement(QuizForm, {
              before: prompt.before,
              after: prompt.after,
              value,
              onChange: handleInputChange,
              onSubmit,
              inputRef,
              ariaLabel: 'Missing preposition',
            })
      ) : React.createElement('div', null, 'No items')
    ),
    item ? React.createElement('div', { style: { marginTop: '12px' } },
      mode.id === 'prepositions' && item.meaning ? React.createElement('div', { className: 'key-hint', style: { fontSize: '14px', textAlign: 'center' } },
        React.createElement('strong', null, 'Meaning:'), ' ', item.meaning
      ) : null,
      mode.id === 'prepositions' && item.type ? React.createElement('div', { className: 'key-hint', style: { fontSize: '14px', textAlign: 'center', marginTop: '4px' } },
        React.createElement('strong', null, 'Preposition type:'), ' ', item.type
      ) : null,
      mode.id === 'irregular_verbs' && item.meaning ? React.createElement('div', { className: 'key-hint', style: { fontSize: '14px', textAlign: 'center' } },
        React.createElement('strong', null, 'Meaning:'), ' ', item.meaning
      ) : null,
      React.createElement('div', { className: 'key-hint', style: { fontSize: '14px', textAlign: 'center', marginTop: '4px' } },
        React.createElement('strong', null, 'Solved:'), ' ', React.createElement('span', { style: { color: 'var(--ok)', fontWeight: 'bold' } }, String(persisted?.solvedCount || 0))
      )
    ) : null,
    React.createElement(Toast, { toast }),
    React.createElement(ActionButtons, { onHint: () => setShowHint(v => !v), onSubmit, onSkip: next }),
    mode.id === 'prepositions'
      ? React.createElement(Hint, { visible: showHint && !!item, row: item, preconditionTypes, answers })
      : (showHint && !!item
          ? React.createElement('div', { className: 'hint-box' },
              React.createElement('h4', null, 'Hint'),
              React.createElement('div', null, React.createElement('strong', null, 'Past Simple:'), ' ', item.past_simple),
              React.createElement('div', null, React.createElement('strong', null, 'Past Participle:'), ' ', item.past_participle)
            )
          : null
        ),
    React.createElement('div', { className: 'key-hint', style: { fontSize: '14px', textAlign: 'center', marginTop: '12px' } },
      React.createElement('strong', null, 'Last:'), ' ', (
        mode.id === 'irregular_verbs'
          ? (persisted?.prevIrregularForms
              ? [
                  React.createElement('strong', { key: 'b' }, persisted.prevIrregularForms.base || ''),
                  ' — ',
                  React.createElement('strong', { key: 'ps' }, persisted.prevIrregularForms.past_simple || ''),
                  ' — ',
                  React.createElement('strong', { key: 'pp' }, persisted.prevIrregularForms.past_participle || ''),
                ]
              : '---'
            )
          : (persisted?.prevAnswerParts
              ? [persisted.prevAnswerParts.before || '', persisted.prevAnswerParts.before ? ' ' : '', React.createElement('strong', { key: 'p' }, persisted.prevAnswerParts.preposition), persisted.prevAnswerParts.after ? ' ' : '', persisted.prevAnswerParts.after || '']
              : '---'
            )
      )
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
  const [modeId, setModeId] = React.useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return DEFAULT_MODE_ID;
      const parsed = JSON.parse(raw);
      const storedMode = typeof parsed?.modeId === 'string' ? parsed.modeId : DEFAULT_MODE_ID;
      return MODES[storedMode] ? storedMode : DEFAULT_MODE_ID;
    } catch {
      return DEFAULT_MODE_ID;
    }
  });
  const mode = MODES[modeId];
  const [perMode, setPerMode] = React.useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return (parsed && typeof parsed.perMode === 'object' && parsed.perMode) || {};
    } catch {
      return {};
    }
  });
  const defaultState = { selectedLevel: 'All Levels', solvedCount: 0, prevAnswerParts: null };
  const persisted = perMode[modeId] || defaultState;
  const setPersisted = (update) => {
    setPerMode(prev => {
      const current = prev[modeId] || defaultState;
      const patch = typeof update === 'function' ? update(current) : update;
      return { ...prev, [modeId]: { ...current, ...patch } };
    });
  };

  // Persist mode and per-mode state to localStorage
  React.useEffect(() => {
    try {
      const payload = JSON.stringify({ modeId, perMode });
      localStorage.setItem(STORAGE_KEY, payload);
    } catch {}
  }, [modeId, perMode]);

  const modeButtons = ['prepositions','irregular_verbs'].map(m => React.createElement('button', {
    key: m,
    className: `mode-button ${modeId === m ? 'selected' : ''}`,
    onClick: () => setModeId(m),
    type: 'button',
  }, m === 'prepositions' ? 'Prepositions' : 'Irregular verbs'));

  return React.createElement('div', { className: 'app' },
    React.createElement('div', { className: 'mode-bar' }, ...modeButtons),
    React.createElement(ModeView, { key: modeId, mode, persisted, setPersisted })
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));
