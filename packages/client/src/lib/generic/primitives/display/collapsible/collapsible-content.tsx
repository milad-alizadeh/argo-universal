import * as CollapsiblePrimitive from '@rn-primitives/collapsible';
import { type ComponentType, type ReactElement, useContext } from 'react';
import { View } from 'react-native';
import { CollapsibleLayoutSyncContext } from './collapsible-context';
import { LayoutSyncedContent } from './collapsible-layout-content';
import type { CollapsibleContentProps as ContentProps } from './collapsible-props';

const webContentMotion =
  'overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up motion-reduce:animate-none';

// The caller's padding sits inside the animated box, whose height then reaches zero; padding on the box itself would stop it short and then snap shut.
function WebContent({
  className,
  children,
  ...props
}: ContentProps): ReactElement {
  return (
    <CollapsiblePrimitive.Content {...props} className={webContentMotion}>
      <View className={className}>{children}</View>
    </CollapsiblePrimitive.Content>
  );
}

// The web animates with CSS; a layout-synced list animates with its rows instead.
export function CollapsibleContent(props: ContentProps): ReactElement {
  const layoutSync = useContext(CollapsibleLayoutSyncContext);

  if (layoutSync)
    return <LayoutSyncedContent {...props} layoutSync={layoutSync} />;

  return <WebContent {...props} />;
}

CollapsibleContent satisfies ComponentType<ContentProps>;
