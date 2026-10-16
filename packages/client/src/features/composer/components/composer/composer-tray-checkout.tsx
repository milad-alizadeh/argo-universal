import type * as React from 'react';
import { SizeClass } from '../../../../lib/generic/size-class/size-class';
import { ComposerCheckoutControl } from '../composer-configuration/composer-configuration';
import type { ComposerProps } from './composer-types';

interface TrayCheckoutProps {
  checkout: NonNullable<ComposerProps['configuration']>['checkout'];
  disabled: boolean;
}

// Only a wide window names the Session's checkout by its path.
export function TrayCheckout(props: TrayCheckoutProps): React.JSX.Element {
  return (
    <>
      <SizeClass only="wide">
        <ComposerCheckoutControl {...props} />
      </SizeClass>
      <SizeClass only="compact">
        <ComposerCheckoutControl
          {...props}
          checkout={{ ...props.checkout, path: undefined }}
        />
      </SizeClass>
    </>
  );
}
