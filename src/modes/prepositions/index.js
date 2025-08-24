import { schema } from './schema.js';
import { buildPrompt } from './sentence.js';
import { evaluate } from './evaluate.js';
import { fallback } from './fallback.js';

export const prepositionsMode = {
  id: 'prepositions',
  title: 'Preposition Trainer',
  datasetPath: 'assets/dataset/dataset_prepositions.csv',
  schema,
  fallback,
  parseRow(row) {
    const out = {};
    for (const k in row) {
      if (!Object.hasOwn(row, k)) continue;
      const v = row[k];
      out[k] = typeof v === 'string' ? v.trim() : v;
    }
    // Normalize legacy header
    if (out['usage case'] && !out['usage_case']) {
      out['usage_case'] = out['usage case'];
    }
    return out;
  },
  buildPrompt,
  evaluate,
  hint(item) {
    return `Verb: ${item.verb}\nPreposition: ${String(item.preposition).toLowerCase()}`;
  },
  levels(item) {
    return item.level || null;
  },
};
