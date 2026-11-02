import { useEffect, useState } from 'react';

// Long enough for a spinner to show, short enough for a test.
const answerAfter = 300;

// How many pages of each list were asked for, and how many have arrived, by list.
type Counts = Readonly<Record<string, number>>;

export interface Paging {
  asked: Counts;
  answered: Counts;
  // Asking again for as many pages, or fewer, does nothing; a page asked for arrives a moment later.
  ask: (list: string, pages: number) => void;
}

function useLater(): (answer: () => void) => void {
  const [timers] = useState(() => new Set<ReturnType<typeof setTimeout>>());

  useEffect(
    () => (): void => {
      for (const timer of timers) clearTimeout(timer);
    },
    [timers],
  );

  return (answer) => void timers.add(setTimeout(answer, answerAfter));
}

export function usePaging(): Paging {
  const later = useLater();
  const [asked, setAsked] = useState<Counts>({});
  const [answered, setAnswered] = useState<Counts>({});

  const ask = (list: string, pages: number): void => {
    if ((asked[list] ?? 0) >= pages) return;

    setAsked((last) => ({ ...last, [list]: pages }));
    later(() => setAnswered((last) => ({ ...last, [list]: pages })));
  };

  return { asked, answered, ask };
}
