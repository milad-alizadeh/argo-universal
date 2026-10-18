import type { Handler } from '@repo/contracts/plugins/wire';
import { useControlValue, deliverControl } from './plugin-control-state';
import type { RenderContext } from './plugin-rendering';

interface TextSubmission {
  pending: boolean;
  onSubmit: (() => void) | undefined;
}

export function useTextSubmit(
  handler: Handler | undefined,
  context: RenderContext,
): TextSubmission {
  const state = useControlValue<boolean>(false);

  const onSubmit = handler
    ? (): void => {
        void state.change(true, () => submitText(handler, context));
      }
    : undefined;

  return { pending: state.pending, onSubmit };
}

async function submitText(
  handler: Handler,
  context: RenderContext,
): Promise<void> {
  await context.ui.flush();
  await deliverControl(handler, { event: 'onSubmit' }, context);
}
