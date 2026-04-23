'use client';

import { useEffect, useRef, useState } from 'react';

type FetchState<T> = {
  loading: boolean;
  error: string | null;
  data: T;
};

export function useFetchState<T>(url: string, fallback: T): FetchState<T> {
  const fallbackRef = useRef(fallback);
  fallbackRef.current = fallback;

  const [state, setState] = useState<FetchState<T>>({ loading: true, error: null, data: fallback });

  useEffect(() => {
    let mounted = true;
    setState({ loading: true, error: null, data: fallbackRef.current });

    fetch(url)
      .then(async (res) => {
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        return res.json() as Promise<T>;
      })
      .then((data) => mounted && setState({ loading: false, error: null, data }))
      .catch((err: unknown) => mounted && setState({ loading: false, error: err instanceof Error ? err.message : 'Unknown error', data: fallbackRef.current }));

    return () => {
      mounted = false;
    };
  }, [url]);

  return state;
}
