import { useRef, useState } from 'react';

export interface FolderPicker {
  picking: boolean;
  error?: string;
  choose?: () => void;
}

// The ref closes the gap before React renders the disabled chooser.
export function useProjectFolder(
  choose: (() => Promise<string | null>) | undefined,
  selected: (path: string) => void,
): FolderPicker {
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string>();
  const pending = useRef(false);

  const request = (): void =>
    requestFolder({ choose, selected, pending, setPicking, setError });

  return { picking, error, choose: choose ? request : undefined };
}

interface PickerRequest {
  choose?: () => Promise<string | null>;
  selected: (path: string) => void;
  pending: { current: boolean };
  setPicking: (picking: boolean) => void;
  setError: (error: string | undefined) => void;
}

function requestFolder(request: PickerRequest): void {
  if (!request.choose || request.pending.current) return;

  request.pending.current = true;
  request.setPicking(true);
  request.setError(undefined);
  void pick(request.choose, request.selected)
    .catch(() =>
      request.setError('Could not open the folder picker. Try again.'),
    )
    .finally(() => finishRequest(request));
}

function finishRequest(request: PickerRequest): void {
  request.pending.current = false;
  request.setPicking(false);
}

async function pick(
  choose: () => Promise<string | null>,
  selected: (path: string) => void,
): Promise<void> {
  const path = await choose();

  if (path !== null) selected(path);
}
