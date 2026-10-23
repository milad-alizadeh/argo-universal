import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';

export interface InspectorScreenProps {
  active: boolean;
  label: string;
  children: ReactNode;
}

export function InspectorScreens({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  return <View className="relative min-h-0 flex-1">{children}</View>;
}

// A retained tab keeps its measured viewport while unavailable to interaction and accessibility.
export function InspectorScreen(props: InspectorScreenProps): ReactElement {
  return (
    <View
      className="absolute inset-0 flex-1"
      role="tabpanel"
      accessibilityLabel={props.label}
      {...interaction(props.active)}
      accessibilityElementsHidden={!props.active}
      style={{ opacity: props.active ? 1 : 0 }}
    >
      {props.children}
    </View>
  );
}

const interaction = (
  active: boolean,
): Pick<
  React.ComponentProps<typeof View>,
  'pointerEvents' | 'importantForAccessibility'
> =>
  active
    ? { pointerEvents: 'auto', importantForAccessibility: 'auto' }
    : {
        pointerEvents: 'none',
        importantForAccessibility: 'no-hide-descendants',
      };
