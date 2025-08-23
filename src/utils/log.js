export function warn(message, context) {
  // Non-blocking warnings to console
  try {
    // eslint-disable-next-line no-console
    console.warn('[warn]', message, context || '');
  } catch {}
}

