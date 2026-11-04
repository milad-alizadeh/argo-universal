import {
  PageCalls,
  type PageCallsPorts,
} from '@repo/contracts/plugins/page-calls';
import { useEffect, useState } from 'react';
import { useTRPCClient } from '#features/connection';
import type { OnPageCall } from '../../lib/product/plugin-registry';
import type { OperationRunner } from './page-calls-ports';
import { sayOperationFailed } from './say-operation-failed';

// One Plugin tree's calls, made as `PageCalls` says on the ports its latest render holds; its waiting edits go with it.
export function useTreeCalls(ports: PageCallsPorts): OnPageCall {
  const [calls] = useState(() => new PageCalls(ports));

  useEffect(() => calls.update(ports));
  useEffect(() => (): void => calls.close(), [calls]);

  return (call, event) => calls.call(call, event);
}

// The App's Operation run over tRPC, and the toast that says why one failed.
export function useOperationRunner(): OperationRunner {
  const run = useTRPCClient().plugins.run;

  return { run: (scoped) => run.mutate(scoped), failed: sayOperationFailed };
}
