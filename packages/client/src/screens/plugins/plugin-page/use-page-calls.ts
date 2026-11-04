import type {
  MadeOperationCall,
  MadePageCall,
  MadeStateChange,
} from '@repo/contracts/plugins/page-call-payload';
import type { WireJson } from '@repo/contracts/plugins/wire';
import { errorToast } from '@repo/kit/error-toast';
import { showToast } from '@repo/kit/primitives/overlays/toast';
import { useMutation } from '@tanstack/react-query';
import { useTRPCClient } from '#features/connection';
import type { OnPageCall } from '../../../lib/product/plugin-registry';
import type { PageAddresses, PageOpening, Snapshot } from './page-addresses';
import { useBind } from './use-bind';

type PageStateCall = Exclude<MadePageCall, MadeOperationCall>;

// A Loader page's calls: an Operation runs; load more, a bound value and a Page state change draw again.
export function usePageCalls(
  addresses: PageAddresses,
  opening: PageOpening,
): OnPageCall {
  const run = useOperationRun(addresses, opening);
  const onPageState = usePageStateCalls(addresses, opening);

  return (call, value) =>
    'operation' in call ? run(call) : onPageState(call, value);
}

// The List keeps its spinner until the next address has drawn.
function usePageStateCalls(
  addresses: PageAddresses,
  opening: PageOpening,
): (call: PageStateCall, value?: WireJson) => Promise<void> {
  const change = (call: MadeStateChange): Promise<void> =>
    addresses.change(opening, call.pageState);

  const bind = useBind(change);

  return (call, value) => {
    if ('loadMore' in call) return addresses.loadMore(opening);

    return 'bind' in call ? bind(call.bind, value) : change(call);
  };
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
