import * as RadixCollapsible from '@radix-ui/react-collapsible';
import { type ComponentType, type ReactElement, useContext } from 'react';
import { View } from 'react-native';
import {
  CollapsibleLayoutSyncContext,
  contentAccessibility,
  OpenContext,
} from './collapsible-context';
import { LayoutSyncedContent } from './collapsible-layout-content';
import type { CollapsibleContentProps as ContentProps } from './collapsible-props';
import {
  useWebContentMotion,
  type WebContentMotion,
} from './collapsible-web-motion';

type MovingBoxProps = Omit<ContentProps, 'forceMount'> &
  Pick<WebContentMotion, 'box' | 'content'>;

// The caller's padding sits inside the moving box, whose height then reaches zero; padding on the box itself would stop it short and then snap shut. Closing content is already hidden from touches and assistive technology while it leaves.
function MovingBox(props: MovingBoxProps): ReactElement {
  const { className, children, box, content, ...rest } = props;

  return (
    <RadixCollapsible.Content forceMount asChild>
      <View {...rest} ref={box} className="overflow-hidden">
        <View ref={content} className={className}>
          {children}
        </View>
      </View>
    </RadixCollapsible.Content>
  );
}

function WebContent({
  forceMount,
  ...props
}: ContentProps): ReactElement | null {
  const open = useContext(OpenContext);
  const { mounted, ...refs } = useWebContentMotion(open, forceMount);

  if (!mounted) return null;

  return <MovingBox {...props} {...contentAccessibility(open)} {...refs} />;
}

// The web moves the content's height with a CSS transition; a layout-synced list animates with its rows instead.
export function CollapsibleContent(props: ContentProps): ReactElement | null {
  const layoutSync = useContext(CollapsibleLayoutSyncContext);

  if (layoutSync)
    return <LayoutSyncedContent {...props} layoutSync={layoutSync} />;

  return <WebContent {...props} />;
}

CollapsibleContent satisfies ComponentType<ContentProps>;
