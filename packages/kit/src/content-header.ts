import {
  createContext,
  createElement,
  useState,
  use,
  useEffect,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from 'react';

export interface ContentHeader {
  replacement?: ReactNode;
  trailing?: ReactNode;
}

type SetHeader = Dispatch<SetStateAction<ContentHeader | null>>;

export const ScreenContentHeader = createContext<SetHeader | null>(null);

export function useContentHeader(header: ContentHeader | null): boolean {
  const setHeader = use(ScreenContentHeader);

  useEffect(() => {
    if (!header) return;
    setHeader?.(header);

    return (): void =>
      setHeader?.((current) => (current === header ? null : current));
  }, [setHeader, header]);

  return setHeader !== null;
}

export const ContentHeaderValue = createContext<ContentHeader | null>(null);

export function ContentHeaderScope({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  const [header, setHeader] = useState<ContentHeader | null>(null);

  return createElement(
    ScreenContentHeader,
    { value: setHeader },
    createElement(ContentHeaderValue, { value: header }, children),
  );
}
