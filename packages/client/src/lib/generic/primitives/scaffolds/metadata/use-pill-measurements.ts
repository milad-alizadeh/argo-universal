import { useState } from 'react';

interface Measurements {
  widths: Record<string, number>;
  measure: (key: string, width: number) => void;
}

export function usePillMeasurements(): Measurements {
  const [widths, setWidths] = useState<Record<string, number>>({});

  const measure = (key: string, width: number): void => {
    setWidths((current) =>
      current[key] === width ? current : { ...current, [key]: width },
    );
  };

  return { widths, measure };
}
