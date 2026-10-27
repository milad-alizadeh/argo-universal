import { useEffect, useState } from 'react';
import { cachedSvgText, loadSvgText } from './svg-text-cache';

export type SvgText =
  | { status: 'loading' }
  | { status: 'loaded'; xml: string }
  | { status: 'failed' };

type Settled = { uri: string; text: SvgText };

const loadedText = (xml: string): SvgText => ({ status: 'loaded', xml });

const loading: SvgText = { status: 'loading' };

// A fetch that failed says so rather than throw, so the logo falls back to the Agent glyph.
const settle = (uri: string): Promise<Settled> =>
  loadSvgText(uri).then(
    (xml) => ({ uri, text: loadedText(xml) }),
    (error: Error) => {
      console.error('Registry icon fetching failed', error);

      return { uri, text: { status: 'failed' } };
    },
  );

const noStop = (): void => {};

function fetchInto(
  uri: string,
  cached: string | undefined,
  receive: (settled: Settled) => void,
): () => void {
  if (cached !== undefined) return noStop;

  let current = true;

  void settle(uri).then((settled) => {
    if (current) receive(settled);
  });

  return (): void => {
    current = false;
  };
}

function useFetched(uri: string, cached: string | undefined): Settled | null {
  const [fetched, setFetched] = useState<Settled | null>(null);

  useEffect(() => fetchInto(uri, cached, setFetched), [uri, cached]);

  return fetched;
}

const fetchedText = (fetched: Settled | null, uri: string): SvgText =>
  fetched?.uri === uri ? fetched.text : loading;

// The SVG text at a URI: from the cache in the first render when it was fetched before, else loading until it arrives.
export function useSvgText(uri: string): SvgText {
  const cached = cachedSvgText(uri);
  const fetched = useFetched(uri, cached);

  return cached === undefined ? fetchedText(fetched, uri) : loadedText(cached);
}
