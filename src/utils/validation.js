export function sanitizeAnswer(input) {
  if (!input) return '';
  return String(input)
    .toLowerCase()
    .trim()
    .replace(/[^a-z-]/g, '');
}

export function splitAnswers(value) {
  if (!value) return [];
  return String(value)
    .toLowerCase()
    .split('|')
    .map(s => s.trim())
    .filter(Boolean);
}

