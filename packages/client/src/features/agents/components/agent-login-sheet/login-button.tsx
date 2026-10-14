import type * as React from 'react';
import type { ButtonDataProps } from '#primitives/buttons/button/button-props';
import { Button } from '#primitives/buttons/button/button-view';

export function LoginButton(props: ButtonDataProps): React.JSX.Element {
  return (
    <Button
      {...props}
      appearance="content"
      className={
        props.variant === 'secondary'
          ? 'rounded-full border-0 bg-muted shadow-none'
          : 'rounded-full shadow-none'
      }
    />
  );
}
