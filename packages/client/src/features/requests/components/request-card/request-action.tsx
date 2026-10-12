import type { ReactNode } from 'react';
import { useContentWide } from '#lib/product/content-layout';
import { Button } from '#primitives/buttons/button/button';

export interface RequestActionProps {
  className?: string;
  disabled?: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
  children: string;
  primary?: boolean;
  loading?: boolean;
}

export function RequestAction(props: RequestActionProps): ReactNode {
  const wide = useContentWide();
  return (
    <Button
      appearance="content"
      drawing="shared"
      label={props.children}
      accessibilityLabel={props.accessibilityLabel}
      variant={requestVariant(props.primary, wide)}
      size={wide ? 'sm' : 'md'}
      fullWidth={!wide}
      disabled={props.disabled}
      loading={props.loading}
      onPress={props.onPress}
      className={props.className}
    />
  );
}

function requestVariant(
  primary: boolean | undefined,
  wide: boolean,
): 'default' | 'ghost' | 'secondary' {
  if (primary) return 'default';
  return wide ? 'ghost' : 'secondary';
}
