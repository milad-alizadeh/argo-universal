import { useState } from 'react';

export function useEntryFocusReturn(): (event: Event) => void {
  const [opener] = useState(() => document.activeElement);
  return (event) => {
    if (!(opener instanceof HTMLElement) || !opener.isConnected) return;
    event.preventDefault();
    opener.focus();
  };
}
