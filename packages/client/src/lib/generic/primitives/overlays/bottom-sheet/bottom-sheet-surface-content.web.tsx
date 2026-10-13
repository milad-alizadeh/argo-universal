import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { SheetBody } from './bottom-sheet-body.web';
import type { SurfaceProps } from './bottom-sheet-surface-props.web';

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

function useTallestHeight(): {
  tallest: number;
  onLayout: React.ComponentProps<typeof View>['onLayout'];
} {
  const [tallest, setTallest] = useState(0);
  const onLayout: React.ComponentProps<typeof View>['onLayout'] = (event) => {
    const { height } = event.nativeEvent.layout;
    setTallest((previous) => Math.max(previous, height));
  };
  return { tallest, onLayout };
}
