import { TableRowDetailHost, type OpenRowDetail } from '@repo/client';
import { useLocalSearchParams, usePathname, useRouter } from 'expo-router';
import type * as React from 'react';
import { useCallback, type ReactElement, type ReactNode } from 'react';

// Row details opened this run, by the `row` param of the page that shows each one; the oldest go first.
const details = new Map<string, ReactElement>();

const kept = 20;

let opened = 0;

function keep(detail: ReactElement): string {
  opened += 1;
  const row = String(opened);

  details.set(row, detail);

  for (const old of details.keys()) {
    if (details.size <= kept) break;
    details.delete(old);
  }

  return row;
}

function useOpenRowDetail(): OpenRowDetail {
  const router = useRouter();
  const pathname = usePathname();

  return useCallback<OpenRowDetail>(
    (detail) => router.push({ pathname, params: { row: keep(detail) } }),
    [router, pathname],
  );
}

/*
 * A compact Table row pushes its Row detail as a page of the Plugin's own stack, the same path with a `row` param.
 * The detail is what the row held when it was pressed.
 */
export function PluginRowDetails(props: {
  children: ReactNode;
}): React.JSX.Element {
  const { row = '' } = useLocalSearchParams<{ row?: string }>();
  const detail = details.get(row);

  return (
    <TableRowDetailHost value={useOpenRowDetail()}>
      {detail ?? props.children}
    </TableRowDetailHost>
  );
}
