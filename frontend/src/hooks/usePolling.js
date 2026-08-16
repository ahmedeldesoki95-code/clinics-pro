import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Runs `fetchFn` immediately and then every `intervalMs`, exposing
 * { data, error, loading, refresh }. Polling stops automatically when the
 * component unmounts or when `enabled` becomes false.
 */
export function usePolling(fetchFn, { intervalMs = 5000, enabled = true, deps = [] } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const savedFetchFn = useRef(fetchFn);
  savedFetchFn.current = fetchFn;

  const refresh = useCallback(async () => {
    try {
      const result = await savedFetchFn.current();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    setLoading(true);
    refresh();
    const id = setInterval(refresh, intervalMs);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, intervalMs, refresh, ...deps]);

  return { data, error, loading, refresh };
}
