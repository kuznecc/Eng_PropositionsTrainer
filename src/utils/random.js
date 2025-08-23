export function pickNewIndex(length, lastIndex) {
  if (!Number.isFinite(length) || length <= 0) return -1;
  if (length === 1) return 0;
  let next = Math.floor(Math.random() * length);
  if (next === lastIndex) {
    next = (next + 1) % length;
  }
  return next;
}

