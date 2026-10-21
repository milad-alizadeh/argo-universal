import * as RadixSelect from '@radix-ui/react-select';
import type * as React from 'react';
import { View } from 'react-native';
import { Icon } from '#primitives/content/icon';
import { TextClassContext } from '#primitives/content/text';
import {
  selectContentClassName,
  selectViewportClassName,
} from './picker-select-styles';

type ContentProps = {
  className?: string;
  side?: 'top' | 'bottom';
  children?: React.ReactNode;
};

// Picker's options open below their trigger, lined up with its start edge, as a popper.
const position = 'popper';

// Radix's popper wrapper copies the content's z-index, so the content keeps it above other overlays.
const placement = {
  position,
  align: 'start',
  sideOffset: 0,
  className: 'z-50',
} as const;

const scrollClassName = 'flex cursor-default items-center justify-center py-1';

const scrollButtons = {
  up: { Component: RadixSelect.ScrollUpButton, icon: 'chevron-up' },
  down: { Component: RadixSelect.ScrollDownButton, icon: 'chevron-down' },
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
  children,
}: Pick<ContentProps, 'children'>): React.JSX.Element {
  return (
    <>
      <ScrollButton direction="up" />
      <RadixSelect.Viewport className={selectViewportClassName(position)}>
        {children}
      </RadixSelect.Viewport>
      <ScrollButton direction="down" />
    </>
  );
}

function ContentBody({
  className,
  side,
  children,
}: ContentProps): React.JSX.Element {
  const contentStyle = selectContentClassName({ className, position, side });

  return (
    <RadixSelect.Content {...placement} side={side ?? 'bottom'}>
      <View className={contentStyle}>
        <SelectViewport>{children}</SelectViewport>
      </View>
    </RadixSelect.Content>
  );
}

// The web's Select: phones draw Picker's native files instead.
export function SelectContent(props: ContentProps): React.JSX.Element {
  return (
    <RadixSelect.Portal>
      <TextClassContext.Provider value="text-foreground">
        <ContentBody {...props} />
      </TextClassContext.Provider>
    </RadixSelect.Portal>
  );
}
