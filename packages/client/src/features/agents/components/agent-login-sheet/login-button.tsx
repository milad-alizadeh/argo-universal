import type * as React from 'react';
import { Button } from '#primitives/buttons/button';
import type { ButtonDataProps } from '#primitives/buttons/button';

export function LoginButton(props: ButtonDataProps): React.JSX.Element {
  return (
    <Button
      {...props}
      custom
      className={
        props.variant === 'secondary'
          ? 'rounded-full border-0 bg-muted shadow-none'
          : 'rounded-full shadow-none'
      }
    />
  );
}
