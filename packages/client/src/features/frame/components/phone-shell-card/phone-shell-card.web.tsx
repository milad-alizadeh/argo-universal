import type * as React from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import type { PhoneShellCardProps } from './phone-shell-card';

const fadeTransition = 'flex-1 transition-opacity duration-300 ease-[ease]';

export function PhoneShellCard({
  drawerOpen,
  children,
}: PhoneShellCardProps): React.JSX.Element {
  return (
    <View testID="phone-shell-card" className="flex-1 bg-sidebar">
      <View className={cn(fadeTransition, drawerOpen && 'opacity-50')}>
        {children}
      </View>
    </View>
  );
}
