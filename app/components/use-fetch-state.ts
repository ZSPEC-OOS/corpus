'use client';

import { useEffect, useRef, useState } from 'react';

type FetchState<T> = {
  loading: boolean;
  error: string | null;
  data: T;
  refresh: () => void;
};

export function useFetchState<T>(url: string, fallback: T, refreshIntervalMs?: number): FetchState<T> {
  const fallbackRef = useRef(fallback);
  fallbackRef.current = fallback;

  const [tick, setTick] = useState(0);
  const refresh = () => setTick((n) => n + 1);

  const [state, setState] = useState<Omit<FetchState<T>, 'refresh'>>({
    loading: true,
    error: null,
    data: fallback,
  });

  useEffect(() => {
    let mounted = true;
    setState((prev) => ({ ...prev, loading: true, error: null, data: fallbackRef.current }));

    fetch(url)
      .then(async (res) => {
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        return res.json() as Promise<T>;
      })
      .then((data) => mounted && setState({ loading: false, error: null, data }))
      .catch(
        (err: unknown) =>
          mounted &&
          setState({ loading: false, error: err instanceof Error ? err.message : 'Unknown error', data: fallbackRef.current }),
      );

    return () => {
      mounted = false;
    };
    // tick is intentionally included so manual refresh() triggers a re-fetch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, tick]);

  // Interval-based polling
  useEffect(() => {
    if (!refreshIntervalMs || refreshIntervalMs <= 0) return;
    const id = setInterval(refresh, refreshIntervalMs);
    return () => clearInterval(id);
  }, [refreshIntervalMs]);

  return { ...state, refresh };
}
