function sanitize(value) {
  if (value == null) return '';
  return String(value).trim();
}

function toPipes(value) {
  // Convert common separators ("/", ",") into pipes to reuse splitAnswers
  return sanitize(value).replace(/[\/,+]/g, '|').replace(/\s*\|\s*/g, '|');
}

import { sanitizeAnswer, splitAnswers } from '../../utils/validation.js';

export const irregularVerbsMode = {
  id: 'irregular_verbs',
  title: 'Irregular Verbs',
  datasetPath: 'assets/dataset/dataset_irregular_verbs.csv',
  schema: { required: ['base', 'past_simple', 'past_participle'], optional: ['meaning', 'level'] },
  fallback: [
    { level: 'A1', base: 'be', past_simple: 'was|were', past_participle: 'been', meaning_en: 'exist or have identity' },
    { level: 'A1', base: 'go', past_simple: 'went', past_participle: 'gone', meaning_en: 'move or travel somewhere' },
    { level: 'A1', base: 'do', past_simple: 'did', past_participle: 'done', meaning_en: 'perform or carry out' },
  ],
  parseRow(row) {
    // Normalize and keep only relevant fields
    const base = sanitize(row.base);
    const past_simple = toPipes(row.past_simple);
    const past_participle = toPipes(row.past_participle);
    if (!base || !past_simple || !past_participle) return null;
    const out = {
      level: sanitize(row.level) || null,
      base,
      past_simple,
      past_participle,
      meaning: sanitize(row.meaning) || null,
    };
    return out;
  },
  buildPrompt(item) {
    const cap = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
    return { before: cap(item.base), placeholder: '', after: '' };
  },
  evaluate(inputOrValues, item, opts) {
    const selected = ['past_simple', 'past_participle'];

    // Multi-field evaluation: inputOrValues is an object of { key: value }
    if (inputOrValues && typeof inputOrValues === 'object' && !Array.isArray(inputOrValues)) {
      const wrongPositions = [];
      for (const k of selected) {
        const expectedRaw = k === 'base' ? [item.base] : splitAnswers(item[k]);
        const expected = expectedRaw.map(sanitizeAnswer);
        const userRaw = inputOrValues[k];
        const userArr = Array.isArray(userRaw) ? userRaw : [userRaw];
        // Build expected counts to allow order-agnostic matching
        const counts = new Map();
        expected.forEach(t => counts.set(t, (counts.get(t) || 0) + 1));
        userArr.forEach((u, idx) => {
          const token = sanitizeAnswer(u);
          const have = counts.get(token) || 0;
          if (have > 0) {
            counts.set(token, have - 1);
          } else {
            wrongPositions.push({ key: k, idx });
          }
        });
        // Any remaining expected tokens not matched imply wrong (likely blanks). Mark remaining unmatched positions as wrong
        // Mark blanks explicitly where possible
        userArr.forEach((u, idx) => {
          const token = sanitizeAnswer(u);
          if (!token) {
            wrongPositions.push({ key: k, idx });
          }
        });
      }
      return { correct: wrongPositions.length === 0, wrongPositions };
    }

    // Back-compat: single-field (shouldn't be used for this mode now)
    const pool = new Set();
    selected.forEach(k => {
      const val = item[k];
      splitAnswers(val).forEach(ans => pool.add(ans));
    });
    const v = sanitizeAnswer(inputOrValues);
    const correct = pool.has(v);
    return { correct, correctAnswers: Array.from(pool) };
  },
  hint(item) {
    return `Past Simple: ${item.past_simple}
Past Participle: ${item.past_participle}`;
  },
  levels(item) {
    return item.level || null;
  },
};


// --- 
// Initial state for the form
export const initialVerbFormState = {
  values: { past_simple: [''], past_participle: [''] },
  selectedForms: ['past_simple', 'past_participle'],
  activePos: { key: 'past_simple', idx: 0 },
};

export function useVerbFormState() {
  const React = globalThis.React;
  const [state, setState] = React.useState(initialVerbFormState);

  const setValues = React.useCallback((updater) => {
    setState(prev => ({ ...prev, values: typeof updater === 'function' ? updater(prev.values) : updater }));
  }, []);

  const setSelectedForms = React.useCallback((updater) => {
    setState(prev => ({ ...prev, selectedForms: typeof updater === 'function' ? updater(prev.selectedForms) : updater }));
  }, []);

  const setActivePos = React.useCallback((pos) => {
    setState(prev => ({ ...prev, activePos: pos }));
  }, []);

  const onToggleSelectedForm = React.useCallback((key) => {
    setSelectedForms(prev => {
      const s = new Set(prev);
      if (s.has(key)) {
        s.delete(key);
      } else {
        s.add(key);
      }
      return Array.from(s);
    });
  }, [setSelectedForms]);

  const resetValues = React.useCallback(() => {
    setValues(initialVerbFormState.values);
  }, [setValues]);

  return {
    ...state,
    setValues,
    setSelectedForms,
    setActivePos,
    onToggleSelectedForm,
    resetValues,
  };
}

