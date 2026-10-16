import type * as React from 'react';
import { HeaderButton } from '#lib/product/header-button';
import { useAttentionCount } from '../hooks/use-attention-count';

// Whether any Session needs attention, which ☰ marks with a dot or badge on a narrow section root.
export const useNeedsAttention = (): boolean => useAttentionCount() > 0;

interface SectionMenuButtonProps {
  onOpen: () => void;
}

// ☰ at the leading edge of the web's narrow section root header, with a dot while Sessions need attention; native headers declare a stock item instead.
export function SectionMenuButton({
  onOpen,
}: SectionMenuButtonProps): React.JSX.Element {
  return (
    <HeaderButton
      icon="menu"
      accessibilityLabel="Open navigation"
      dot={useNeedsAttention() ? 'attention' : undefined}
      onPress={onOpen}
    />
  );
}
