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
  schema: { required: ['base', 'past_simple', 'past_participle'], optional: ['meaning_en', 'level'] },
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
      meaning_en: sanitize(row.meaning_en) || null,
    };
    return out;
  },
  buildPrompt(item) {
    const cap = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
    return { before: cap(item.base), placeholder: '', after: '' };
  },
  evaluate(inputOrValues, item, opts) {
    const selected = Array.isArray(opts?.selectedForms) && opts.selectedForms.length
      ? opts.selectedForms
      : ['past_simple'];

    // Multi-field evaluation: inputOrValues is an object of { key: value }
    if (inputOrValues && typeof inputOrValues === 'object' && !Array.isArray(inputOrValues)) {
      const wrongKeys = [];
      for (const k of selected) {
        const expected = k === 'base' ? [sanitizeAnswer(item.base)] : splitAnswers(item[k]);
        const user = sanitizeAnswer(inputOrValues[k]);
        if (!expected.includes(user)) wrongKeys.push(k);
      }
      return { correct: wrongKeys.length === 0, wrongKeys };
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
    return `Past Simple: ${item.past_simple}\nPast Participle: ${item.past_participle}`;
  },
  levels(item) {
    return item.level || null;
  },
};
