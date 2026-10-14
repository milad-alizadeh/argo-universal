import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { SheetBody } from './bottom-sheet-body';
import type { SurfaceProps } from './bottom-sheet-surface-props';

export type SheetResize = ((expanded: boolean) => void) | undefined;

type SurfaceContentProps = Pick<
  SurfaceProps,
  'size' | 'label' | 'footer' | 'children'
> & {
  expanded: boolean;
  resize: SheetResize;
};

export function SurfaceContent(props: SurfaceContentProps): React.JSX.Element {
  return (
    <SurfaceBody form={props.size === 'form'}>
      <SheetBody
        label={props.label}
        expanded={props.expanded}
        onResize={props.resize}
        footer={props.footer}
      >
        {props.children}
      </SheetBody>
    </SurfaceBody>
  );
}

function SurfaceBody(props: {
  form: boolean;
  children: React.ReactNode;
}): React.ReactNode {
  const { tallest, onLayout } = useTallestHeight();

  if (!props.form) return props.children;

  return (
    <View style={{ minHeight: tallest }} className="shrink" onLayout={onLayout}>
      {props.children}
    </View>
  );
}

type LayoutHandler = React.ComponentProps<typeof View>['onLayout'];

interface TallestHeight {
  tallest: number;
  onLayout: LayoutHandler;
}

function useTallestHeight(): TallestHeight {
  const [tallest, setTallest] = useState(0);

  const onLayout: LayoutHandler = (event) => {
    const { height } = event.nativeEvent.layout;
    setTallest((previous) => Math.max(previous, height));
  };

  return { tallest, onLayout };
}
