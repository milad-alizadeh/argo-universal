import type { MadeOperationCall } from '@repo/contracts/plugins/page-call-payload';
import { errorToast } from '@repo/kit/error-toast';
import { showToast } from '@repo/kit/primitives/overlays/toast';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useTRPCClient } from '#features/connection';
import type { OnPageCall } from '../../../lib/product/plugin-registry';
import type { PageAddresses, PageOpening, Snapshot } from './page-addresses';
import { PageCalls } from './page-calls';

// A Loader page's calls, made as `PageCalls` says, with the Operation run the App's mutation makes.
export function usePageCalls(
  addresses: PageAddresses,
  opening: PageOpening,
): OnPageCall {
  const run = useOperationRun(addresses, opening);
  const deps = { addresses, opening, run };
  const [calls] = useState(() => new PageCalls(deps));

  useEffect(() => calls.update(deps));
  useEffect(() => (): void => calls.close(), [calls]);

  return (call, event) => calls.call(call, event);
}

/*
 * An Operation call: the nodes it names show their optimistic props at once and the Operation runs. Its
 * settled trees come from the Server's stale mark (useStaleMarks), which also reaches the other Apps; a
 * failure puts the trees back and says why.
 */
function useOperationRun(
  addresses: PageAddresses,
  { pluginId, projectId, sessionId }: PageOpening,
): (call: MadeOperationCall) => Promise<void> {
  const run = useTRPCClient().plugins.run;

  // An Operation belongs to the Plugin, not to the page it was called from.
  const { mutateAsync } = useMutation({
    mutationFn: ({ operation, args }: MadeOperationCall) =>
      run.mutate({ pluginId, projectId, sessionId, operation, args }),
    onMutate: (call) => addresses.showOptimistic(pluginId, call),
    onError: putBackAndSay(addresses),
  });

  // The toast already said why a call failed.
  return (call) => mutateAsync(call).then(noAnswer, noAnswer);
}

const putBackAndSay =
  (addresses: PageAddresses) =>
  (
    error: Error,
    _call: MadeOperationCall,
    before: Snapshot | undefined,
  ): void => {
    if (before) addresses.putBack(before);

    const toast = errorToast('That did not work', error);

    if (toast) showToast({ ...toast, tone: 'danger' });
  };

const noAnswer = (): void => undefined;
