import * as SelectPrimitive from '@rn-primitives/select';
import * as React from 'react';
import { Icon } from '#primitives/display/icon/icon';
import { TextClassContext } from '#primitives/display/text/text';
import {
  selectContentClassName,
  selectViewportClassName,
} from './picker-select-styles';

type ContentProps = React.ComponentProps<typeof SelectPrimitive.Content> & {
  className?: string;
  portalHost?: string;
};

const scrollClassName = 'flex cursor-default items-center justify-center py-1';

const scrollButtons = {
  up: { Component: SelectPrimitive.ScrollUpButton, icon: 'chevron-up' },
  down: { Component: SelectPrimitive.ScrollDownButton, icon: 'chevron-down' },
} as const;

function ScrollButton({
  direction,
}: {
  direction: 'up' | 'down';
}): React.JSX.Element {
  const { Component, icon } = scrollButtons[direction];

  return (
    <Component className={scrollClassName}>
      <Icon name={icon} role="body" />
    </Component>
  );
}

function SelectViewport({
  position,
  children,
}: Pick<ContentProps, 'position' | 'children'>): React.JSX.Element {
  return (
    <>
      <ScrollButton direction="up" />
      <SelectPrimitive.Viewport className={selectViewportClassName(position)}>
        {children}
      </SelectPrimitive.Viewport>
      <ScrollButton direction="down" />
    </>
  );
}

function ContentBody(contentProps: ContentProps): React.JSX.Element {
  const { className, children, position = 'popper', ...props } = contentProps;

  const contentStyle = selectContentClassName({
    className,
    position,
    side: props.side,
  });

  return React.createElement(
    SelectPrimitive.Content,
    { ...props, className: contentStyle, position },
    <SelectViewport position={position}>{children}</SelectViewport>,
  );
}

// The web's Select: phones draw Picker's native files instead.
function ContentOverlay(props: ContentProps): React.JSX.Element {
  return (
    <SelectPrimitive.Overlay>
      <TextClassContext.Provider value="text-popover-foreground">
        <ContentBody {...props} />
      </TextClassContext.Provider>
    </SelectPrimitive.Overlay>
  );
}

export function SelectContent({
  portalHost,
  ...props
}: ContentProps): React.JSX.Element {
  return (
    <SelectPrimitive.Portal hostName={portalHost}>
      <ContentOverlay {...props} />
    </SelectPrimitive.Portal>
  );
}
