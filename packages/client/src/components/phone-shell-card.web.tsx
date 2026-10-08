import { View } from 'react-native';
import { cn } from '#lib/utils';
import type { PhoneShellCardProps } from './phone-shell-card';

export function PhoneShellCard({ drawerOpen, children }: PhoneShellCardProps) {
  return (
    <View
      testID="phone-shell-card"
      className={cn(
        'flex-1 rounded-none bg-card shadow-card transition-[margin,border-radius] duration-300 ease-[ease]',
        drawerOpen && 'my-3 rounded-xl',
      )}
    >
      {children}
    </View>
  );
}
