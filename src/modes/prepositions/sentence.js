export function buildPrompt(item) {
  // usage_case or legacy 'usage case'
  const usage = item['usage_case'] || item['usage case'] || '';
  const parts = String(usage).split('---');
  const before = (parts[0] || '').trim();
  const after = (parts[1] || '').trim();
  return { before, placeholder: '', after };
}

