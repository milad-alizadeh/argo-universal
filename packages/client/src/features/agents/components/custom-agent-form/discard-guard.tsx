import { useStore } from '@tanstack/react-form';
import type * as React from 'react';
import { useRef, useState } from 'react';
import {
  Alert,
  type AlertAction,
} from '#lib/generic/primitives/overlays/alert/alert';
import { useLeaveGuard } from '#lib/product/navigation/context';
import type { CustomAgentFormApi } from '../../hooks/use-custom-agent-form';

const answers = (discard: () => void): AlertAction[] => [
  { label: 'Keep editing', role: 'cancel' },
  { label: 'Discard', role: 'destructive', onPress: discard },
];

// Leaving a form with unsaved changes asks first; checking the program is not a loss, as it ends in leaving.
export function DiscardGuard({
  form,
}: {
  form: CustomAgentFormApi;
}): React.JSX.Element {
  const dirty = useStore(form.store, (s) => s.isDirty && !s.isSubmitting);
  const { open, setOpen, proceed } = useHeldLeave(dirty);
  return (
    <Alert
      open={open}
      onOpenChange={setOpen}
      title="Discard changes?"
      message="Your changes have not been saved."
      actions={answers(proceed)}
    />
  );
}

// The leave the guard is holding: asked about while open, let go by proceed.
function useHeldLeave(active: boolean): {
  open: boolean;
  setOpen: (open: boolean) => void;
  proceed: () => void;
} {
  const [open, setOpen] = useState(false);
  const held = useRef<() => void>(() => null);
  useLeaveGuard(active, (proceed) => {
    held.current = proceed;
    setOpen(true);
  });
  return { open, setOpen, proceed: () => held.current() };
}
