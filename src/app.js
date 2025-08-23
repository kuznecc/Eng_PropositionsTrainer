import { prepositionsMode } from './modes/prepositions/index.js';
import { irregularVerbsMode } from './modes/irregular_verbs/index.js';
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
  const [selectedForms, setSelectedForms] = React.useState(
    Array.isArray(persisted?.selectedForms) && persisted.selectedForms.length ? persisted.selectedForms : ['past_simple']
  );
  const [formsValue, setFormsValue] = React.useState({ base: '', past_simple: '', past_participle: '' });
  const [activeForm, setActiveForm] = React.useState('base');
  const inputRefs = React.useRef({ base: null, past_simple: null, past_participle: null });
  const filtered = React.useMemo(() => {
    if (selectedLevel === 'All Levels') return rows;
    return rows.filter(r => (mode.levels(r) || '') === selectedLevel);
  }, [rows, selectedLevel, mode]);
  React.useEffect(() => { setPersisted(prev => ({ selectedLevel })); }, [selectedLevel]);
  React.useEffect(() => { if (mode.id === 'irregular_verbs') setPersisted(prev => ({ selectedForms })); }, [selectedForms, mode]);

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

  // Initialize forms for irregular verbs when item or selectedForms changes
  React.useEffect(() => {
    if (mode.id !== 'irregular_verbs' || !item) return;
    const order = ['base','past_simple','past_participle'];
    const nextValues = {};
    for (const k of order) {
      if (selectedForms.includes(k)) {
        nextValues[k] = '';
      } else {
        nextValues[k] = k === 'base' ? (item.base || '') : (item[k] || '');
      }
    }
    setFormsValue(nextValues);
    const firstEditable = order.find(k => selectedForms.includes(k));
    setActiveForm(firstEditable || 'base');
    setTimeout(() => {
      const el = inputRefs.current[firstEditable];
      if (el) el.focus();
    }, 0);
  }, [mode, item, selectedForms]);

  // Shared toggle handler for forms selection
  const toggleSelectedForm = React.useCallback((key) => {
    setSelectedForms(prev => {
      const wasSelected = prev.includes(key);
      if (wasSelected) {
        if (prev.length === 1) {
          showToast('warning', 'Select at least one mode');
          return prev;
        }
        // Deselect: set field to correct answer and move focus if needed
        setFormsValue(v => ({
          ...v,
          [key]: key === 'base' ? (item?.base || '') : (item?.[key] || ''),
        }));
        if (activeForm === key) {
          const order = ['base','past_simple','past_participle'];
          const remaining = prev.filter(k => k !== key);
          const editable = order.filter(k => remaining.includes(k));
          const nextKey = editable.find(k => k !== key) || editable[0];
          if (nextKey) {
            setActiveForm(nextKey);
            setTimeout(() => inputRefs.current[nextKey]?.focus(), 0);
          }
        }
        return prev.filter(k => k !== key);
      } else {
        // Select: blank field and focus if no active form
        setFormsValue(v => ({ ...v, [key]: '' }));
        const next = [...prev, key];
        const order = ['base','past_simple','past_participle'];
        if (!order.some(k => prev.includes(k))) {
          setActiveForm(key);
          setTimeout(() => inputRefs.current[key]?.focus(), 0);
        }
        return next;
      }
    });
  }, [item, activeForm]);

  const onSubmit = () => {
    if (!item) return;
    if (toast?.type === 'warning') clearToast();
    setShowHint(false);
    const evalRes = mode.id === 'irregular_verbs'
      ? mode.evaluate(formsValue, item, { selectedForms })
      : mode.evaluate(value, item, { selectedForms });
    const { correct } = evalRes;
    if (correct) {
      showToast('ok', 'OK');
      const prompt = mode.buildPrompt(item);
      if (mode.id === 'irregular_verbs') {
        const capTokens = (s) => String(s || '').split('|').map(t => t ? t.charAt(0).toUpperCase() + t.slice(1) : t).join('|');
        const baseVal = selectedForms.includes('base') ? (formsValue.base || '') : (item.base || '');
        const psVal = selectedForms.includes('past_simple') ? (formsValue.past_simple || '') : (item.past_simple || '');
        const ppVal = selectedForms.includes('past_participle') ? (formsValue.past_participle || '') : (item.past_participle || '');
        const prevIrregularForms = {
          base: capTokens(baseVal),
          past_simple: capTokens(psVal),
          past_participle: capTokens(ppVal),
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
        const wrongKeys = Array.isArray(evalRes.wrongKeys) ? evalRes.wrongKeys : [];
        if (wrongKeys.length > 0) {
          setFormsValue(v => {
            const patch = { ...v };
            wrongKeys.forEach(k => { if (selectedForms.includes(k)) patch[k] = ''; });
            return patch;
          });
          const order = ['base','past_simple','past_participle'];
          const focusKey = order.find(k => wrongKeys.includes(k)) || order.find(k => selectedForms.includes(k));
          if (focusKey) {
            setActiveForm(focusKey);
            setTimeout(() => inputRefs.current[focusKey]?.focus(), 0);
          }
        } else {
          // Fallback: clear all selected and focus first editable
          setFormsValue(v => {
            const patch = { ...v };
            selectedForms.forEach(k => { patch[k] = ''; });
            return patch;
          });
          const firstEditable = ['base','past_simple','past_participle'].find(k => selectedForms.includes(k));
          setTimeout(() => inputRefs.current[firstEditable]?.focus(), 0);
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
      const editable = order.filter(k => selectedForms.includes(k));
      const currIndex = editable.indexOf(activeForm);
      const firstEditable = editable[0];

      const focusForm = (key) => {
        setActiveForm(key);
        const el = inputRefs.current[key];
        if (el) el.focus();
      };

      if (event.key === 'Enter') {
        event.preventDefault();
        onSubmit();
        return;
      }

      if (event.key === ' ') {
        // Space: move to next editable
        if (editable.length > 0 && currIndex >= 0 && currIndex < editable.length - 1) {
          event.preventDefault();
          focusForm(editable[currIndex + 1]);
        }
        return;
      }
      if (event.key === 'Backspace') {
        // Backspace: if active empty, move prev; otherwise let default
        const currVal = formsValue[activeForm] || '';
        if (currVal.length === 0 && editable.length > 0 && currIndex > 0) {
          event.preventDefault();
          focusForm(editable[currIndex - 1]);
        }
        return;
      }
      if (/^[a-zA-Z-]$/.test(event.key) && !isTyping) {
        const target = editable.includes(activeForm) ? activeForm : firstEditable;
        if (target) {
          const ch = event.key;
          setFormsValue(v => ({ ...v, [target]: (v[target] || '') + ch }));
          focusForm(target);
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [next, mode, selectedForms, activeForm, formsValue]);

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
          ? React.createElement(React.Fragment, null,
              // Display base form in sentence style without input
              React.createElement('div', { className: 'row' },
                React.createElement('span', { className: 'before' }, (prompt.before || '').trim(), '\u00A0'),
                React.createElement('span', { className: 'after' }, '\u00A0')
              ),
              React.createElement(VerbFormsInputs, {
                item,
                selectedForms,
                values: formsValue,
                setValues: setFormsValue,
                activeForm,
                setActiveForm,
                inputRefs,
                onToggleSelectedForm: toggleSelectedForm,
                onMoveNext: () => {
                  const order = ['base','past_simple','past_participle'];
                  const editable = order.filter(k => selectedForms.includes(k));
                  const idx = editable.indexOf(activeForm);
                  if (idx >= 0 && idx < editable.length - 1) {
                    const nextKey = editable[idx + 1];
                    const el = inputRefs.current[nextKey];
                    if (el) el.focus();
                    setActiveForm(nextKey);
                  }
                },
                onMovePrev: () => {
                  const order = ['base','past_simple','past_participle'];
                  const editable = order.filter(k => selectedForms.includes(k));
                  const idx = editable.indexOf(activeForm);
                  if (idx > 0) {
                    const prevKey = editable[idx - 1];
                    const el = inputRefs.current[prevKey];
                    if (el) el.focus();
                    setActiveForm(prevKey);
                  }
                },
                onGlobalType: () => {}
              })
            )
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
      mode.id === 'irregular_verbs' && item.meaning_en ? React.createElement('div', { className: 'key-hint', style: { fontSize: '14px', textAlign: 'center' } },
        React.createElement('strong', null, 'Meaning:'), ' ', item.meaning_en
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
