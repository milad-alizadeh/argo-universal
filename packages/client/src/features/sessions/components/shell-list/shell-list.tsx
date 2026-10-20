import type { JSX } from 'react';
import { useClock } from '#lib/generic/use-clock';
import { SizeClass } from '../../../../lib/generic/size-class/size-class';
import { PhoneShellList } from './shell-list-phone';
import type { ShellListProps } from './shell-list-types';
import { WideShellList } from './shell-list-wide';

export type { ShellListProps } from './shell-list-types';

// The Session's background Shells: a grouped sheet list on a phone, plain rows in the wide Inspector.
export function ShellList(props: ShellListProps): JSX.Element {
  const running = props.shells.some((shell) => shell.status === 'running');
  const now = useClock(running, props.now);

  return (
    <SizeClass
      compact={<PhoneShellList {...props} now={now} />}
      wide={<WideShellList {...props} now={now} />}
    />
  );
}
