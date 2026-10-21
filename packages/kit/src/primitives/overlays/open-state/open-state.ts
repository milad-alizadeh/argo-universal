import { useCallback, useMemo, useState } from 'react';

export interface OpenState {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface OpenStateProps {
  // Controls the overlay; without it the overlay keeps its own state, starting from defaultOpen.
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

// An overlay's open state, controlled by its owner or kept by the overlay itself.
export function useOpenState(props: OpenStateProps): OpenState {
  const [ownOpen, setOwnOpen] = useState(props.defaultOpen ?? false);
  const controlled = props.open !== undefined;
  const report = props.onOpenChange;

  const onOpenChange = useCallback(
    (next: boolean) => {
      if (!controlled) setOwnOpen(next);
      report?.(next);
    },
    [controlled, report],
  );

  const open = props.open ?? ownOpen;

  return useMemo(() => ({ open, onOpenChange }), [open, onOpenChange]);
}
