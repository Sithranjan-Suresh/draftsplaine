import { useEffect, useState } from "react";
import { fetchPlayer } from "../lib/api";

export default function usePlayer(gsisId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!gsisId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchPlayer(gsisId)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [gsisId]);

  return { data, loading, error };
}
