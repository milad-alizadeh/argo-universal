import { cn } from '@repo/kit/utils';
import type { ReactElement, ReactNode } from 'react';
import { ScrollView } from 'react-native';

export interface ComposerDraftScrollProps {
  followsCaret: boolean;
  children: ReactNode;
}

export function ComposerDraftScroll(
  props: ComposerDraftScrollProps,
): ReactElement {
  return (
    <ScrollView
      className={cn(
        'min-h-0 grow-0 shrink',
        props.followsCaret && 'type-body max-h-rich-textarea',
      )}
      keyboardShouldPersistTaps="handled"
    >
      {props.children}
    </ScrollView>
  );
}
