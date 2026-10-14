import type * as React from 'react';
import { Button } from '../../../../lib/generic/primitives/buttons/button/button';
import type { ButtonDataProps } from '../../../../lib/generic/primitives/buttons/button/button-props';

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
