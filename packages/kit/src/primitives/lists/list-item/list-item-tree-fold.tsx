import type { ReactElement } from 'react';
import { Pressable } from 'react-native';
import { DisclosureChevron } from '#primitives/status/disclosure-chevron';
import type { TreeRow } from '../../../list-tree';
import { cn } from '../../../utils';

export type FoldProps = {
  parent: NonNullable<TreeRow['parent']>;
  title: string;
};

const foldButton =
  'items-center justify-center rounded-sm web:select-none web:hover:bg-hover';

type FoldButtonProps = FoldProps & { className: string };

// Named after its row, so a screen reader hears which row it folds, and reporting whether that row is open.
export function FoldButton(props: FoldButtonProps): ReactElement {
  return (
    <Pressable
      role="button"
      accessibilityLabel={props.title}
      accessibilityState={{ expanded: props.parent.open }}
      aria-expanded={props.parent.open}
      onPress={props.parent.toggle}
      className={cn(foldButton, props.className)}
    >
      <DisclosureChevron open={props.parent.open} />
    </Pressable>
  );
}
