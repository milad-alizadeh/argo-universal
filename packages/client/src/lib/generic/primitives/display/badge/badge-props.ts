import type * as React from 'react';
import type { View } from 'react-native';

export type BadgeVariant = 'default' | 'secondary';

// A tinted status chip, such as "Ready" in green beside an Agent's name, over the variant's fill.
export type BadgeTone = 'muted' | 'info' | 'success' | 'warning' | 'danger';

export type BadgeProps = React.ComponentProps<typeof View> &
  React.RefAttributes<View> & {
    variant?: BadgeVariant | null;
    tone?: BadgeTone | null;
  };
