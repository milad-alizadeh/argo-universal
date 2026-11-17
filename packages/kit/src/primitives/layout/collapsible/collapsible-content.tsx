import * as RadixCollapsible from '@radix-ui/react-collapsible';
import { type ComponentType, type ReactElement, useContext } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import {
  CollapsibleLayoutSyncContext,
  OpenContext,
  contentAccessibility,
} from './collapsible-context';
import { LayoutSyncedContent } from './collapsible-layout-content';
import type { CollapsibleContentProps as ContentProps } from './collapsible-props';
import {
  useWebContentMotion,
  type WebContentMotion,
} from './collapsible-web-motion';

type Drawing = Pick<
  WebContentMotion,
  'mounted' | 'moving' | 'height' | 'measure'
>;

type BodyProps = { content: ContentProps; motion: Drawing };

function MeasuredBody({ content, motion }: BodyProps): ReactElement | null {
  if (!motion.mounted) return null;

  return (
    <View className={content.className} onLayout={motion.measure}>
      {content.children}
    </View>
  );
}

const bodyStyle = ({ content, motion }: BodyProps): StyleProp<ViewStyle> => [
  motion.mounted ? content.style : undefined,
  { height: motion.height },
];

// Only opening and closing animate; at rest the box takes its content's new height at once.
const bodyClass = (moving: boolean): string =>
  moving
    ? 'overflow-x-visible overflow-y-clip transition-height duration-200 ease-out motion-reduce:transition-none'
    : 'overflow-x-visible overflow-y-clip';

/*
 * Caller padding is measured inside the moving box, so closing can reach zero. The box clips only along the height
 * it animates: a row that reaches past the body's sides, as a card's rows do with their hover tile, stays whole.
 */
function WebBody(props: BodyProps): ReactElement {
  const open = useContext(OpenContext);
  const own = props.motion.mounted ? props.content : {};

  return (
    <View
      {...own}
      {...contentAccessibility(open)}
      style={bodyStyle(props)}
      className={bodyClass(props.motion.moving)}
    >
      <MeasuredBody {...props} />
    </View>
  );
}

function WebContent({ forceMount, ...props }: ContentProps): ReactElement {
  const { region, onTransitionEnd, ...motion } = useWebContentMotion({
    open: useContext(OpenContext),
    forceMount,
  });

  return (
    <RadixCollapsible.Content
      ref={region}
      forceMount
      onTransitionEnd={onTransitionEnd}
    >
      <WebBody content={props} motion={motion} />
    </RadixCollapsible.Content>
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
