import { loadCsv } from '../utils/csv.js';
import { warn } from '../utils/log.js';

export function useDataset(mode) {
  const React = globalThis.React;
  const [rows, setRows] = React.useState([]);
  const [levels, setLevels] = React.useState(['All Levels']);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let alive = true;
    async function run() {
      setLoading(true);
      let data = await loadCsv(mode.datasetPath, mode.schema);
      if (!data || data.length === 0) {
        // Fallback
        if (Array.isArray(mode.fallback) && mode.fallback.length) {
          data = mode.fallback;
        } else {
          warn('No dataset loaded and no fallback provided for mode', mode.id);
          data = [];
        }
      }
      // Normalize/parse each row via mode
      const normalized = [];
      for (const r of data) {
        try {
          const out = mode.parseRow(r);
          if (out) normalized.push(out);
        } catch (e) {
          warn('Failed to parse row', { row: r, error: e });
        }
      }
      if (!alive) return;
      setRows(normalized);
      const uniqueLevels = Array.from(new Set(
        normalized.map(mode.levels).filter(Boolean)
      ));
      uniqueLevels.sort((a, b) => a.localeCompare(b));
      setLevels(['All Levels', ...uniqueLevels]);
      setLoading(false);
    }
    run();
    return () => { alive = false; };
  }, [mode]);

  return { rows, levels, loading };
}

