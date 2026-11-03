import { useEffect, useRef } from 'react';

// The value from the latest render, for a callback that outlives the render it was made in.
export function useLatest<Value>(value: Value): { current: Value } {
  const latest = useRef(value);

  useEffect(() => {
    latest.current = value;
  });

  return latest;
}
