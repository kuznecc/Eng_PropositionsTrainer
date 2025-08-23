import { pickNewIndex } from '../utils/random.js';

export function useQueue(items) {
  const React = globalThis.React;
  const [index, setIndex] = React.useState(-1);
  const [lastIndex, setLastIndex] = React.useState(-1);

  React.useEffect(() => {
    if (!items || items.length === 0) {
      setIndex(-1);
      setLastIndex(-1);
      return;
    }
    // When items change, reset to a random index
    setIndex(prev => {
      const next = pickNewIndex(items.length, prev);
      return next;
    });
  }, [items]);

  function next() {
    setIndex(curr => {
      const nextIdx = pickNewIndex(items.length, curr);
      setLastIndex(curr);
      return nextIdx;
    });
  }

  return {
    index,
    item: index >= 0 && items && items.length > 0 ? items[index] : null,
    next,
    reset: () => setIndex(-1),
  };
}

