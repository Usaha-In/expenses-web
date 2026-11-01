"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, api } from "./api";

type Query = Record<string, string | number | undefined | null>;

/** GET helper with loading/error state; refetches when path/query change. */
export function useApi<T>(path: string, query?: Query) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const queryKey = JSON.stringify(query ?? {});
  const seq = useRef(0);

  useEffect(() => {
    const id = ++seq.current;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    api<T>(path, { query: JSON.parse(queryKey) as Query })
      .then((d) => {
        if (id !== seq.current) return;
        setData(d);
        setError(null);
      })
      .catch((e: unknown) => {
        if (id !== seq.current) return;
        setError(e instanceof ApiError ? e.message : "Terjadi kesalahan.");
      })
      .finally(() => {
        if (id === seq.current) setLoading(false);
      });
  }, [path, queryKey, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, error, loading, reload };
}
