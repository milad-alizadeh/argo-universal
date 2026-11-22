import { useRef, useState } from 'react';

export type Draft = {
  value: string;
  onChangeText: (value: string) => void;
  onBlur: () => void;
};

export function useTextDraft(
  value: string,
  onSave: (value: string) => void,
): Draft {
  const [draft, setDraft] = useState(value);
  // Android changes the text and blurs in one tick, before `draft` re-renders, so a save reads the ref.
  const latest = useRef(value);

  const onChangeText = (text: string): void => {
    latest.current = text;
    setDraft(text);
  };

  const onBlur = (): void => {
    if (latest.current !== value) onSave(latest.current);
  };

  return { value: draft, onChangeText, onBlur };
}
