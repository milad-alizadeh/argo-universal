import { useStore } from '@tanstack/react-form';
import type * as React from 'react';
import { useRef, useState } from 'react';
import { useLeaveGuard } from '#lib/product/navigation/context';
import { Alert, type AlertAction } from '#primitives/overlays/alert';
import type { CustomAgentFormApi } from '../../hooks/use-custom-agent-form';

const answers = (discard: () => void): AlertAction[] => [
  { label: 'Keep editing', cancel: true },
  { label: 'Discard', tone: 'danger', onPress: discard },
];

// Leaving a form with unsaved changes asks first; checking the program is not a loss, as it ends in leaving.
export function DiscardGuard({
  form,
}: {
  form: CustomAgentFormApi;
}): React.JSX.Element {
  const dirty = useStore(form.store, (s) => s.isDirty && !s.isSubmitting);
  const { open, setOpen, proceed } = useHeldLeave(dirty);
  const props = { open, onOpenChange: setOpen, actions: answers(proceed) };

  return <Alert {...props} title="Discard changes?" message={unsavedMessage} />;
}

const unsavedMessage = 'Your changes have not been saved.';

type HeldLeave = {
  open: boolean;
  setOpen: (open: boolean) => void;
  proceed: () => void;
};

// The leave the guard is holding: asked about while open, let go by proceed.
function useHeldLeave(active: boolean): HeldLeave {
  const [open, setOpen] = useState(false);
  const held = useRef<() => void>(() => null);
  useLeaveGuard(active, (proceed) => {
    held.current = proceed;
    setOpen(true);
  });

  return { open, setOpen, proceed: () => held.current() };
}
