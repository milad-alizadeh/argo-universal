import { cn } from '@repo/kit/utils';
import type { ReactElement } from 'react';
import { Pressable, type PressableProps } from 'react-native';
import type { ChecksState } from './pull-request-checks';

// A wash in the part's own tone, at the kit Pill's strengths.
const toneWash = {
  failing: 'web:hover:bg-danger/14 web:focus-visible:bg-danger/14',
  running: 'web:hover:bg-warning/18 web:focus-visible:bg-warning/18',
  passed: 'web:hover:bg-success/14 web:focus-visible:bg-success/14',
} as const satisfies Record<ChecksState, string>;

// The fill is drawn outside the ink: the padding is cancelled by a matching margin, so nothing moves when it arrives.
const partClassName = '-mx-1.25 -my-0.5 rounded-full px-1.25 py-0.5';

// One part of a Change row that presses on its own; the row itself never does.
export function ChangePart({
  tone,
  ...props
}: PressableProps & { tone: ChecksState }): ReactElement {
  return (
    <Pressable
      role="button"
      className={cn(partClassName, toneWash[tone])}
      {...props}
    />
  );
}
