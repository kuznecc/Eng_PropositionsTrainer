import { warn } from './log.js';

export async function fetchText(path) {
  try {
    const res = await fetch(path, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch (e) {
    return null;
  }
}

export function parseCsv(text) {
  if (!text) return [];
  const Papa = globalThis.Papa;
  try {
    const out = Papa.parse(text.trim(), { header: true, skipEmptyLines: 'greedy' });
    if (out.errors && out.errors.length) {
      warn('CSV parse errors', out.errors);
    }
    return Array.isArray(out.data) ? out.data : [];
  } catch (e) {
    warn('CSV parse failed', e);
    return [];
  }
}

export async function loadCsv(path, schema) {
  // Try to fetch and parse; return rows or [] on failure
  const text = await fetchText(path);
  if (!text) return [];
  const rows = parseCsv(text);
  return rows
    .map(trimRow)
    .filter(r => validateRow(r, schema));
}

export function trimRow(row) {
  const out = {};
  for (const k in row) {
    if (!Object.hasOwn(row, k)) continue;
    const v = row[k];
    out[k] = typeof v === 'string' ? v.trim() : v;
  }
  return out;
}

export function validateRow(row, schema) {
  if (!schema || !schema.required) return true;
  for (const key of schema.required) {
    if (!row[key] || String(row[key]).trim() === '') {
      warn('Skipping invalid row: missing required field', { key, row });
      return false;
    }
  }
  return true;
}

