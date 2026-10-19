import type * as React from 'react';
import { View } from 'react-native';
import { ComposerStatusControls } from '../composer-status/composer-status';
import { TrayCheckout } from './composer-tray-checkout';
import type {
  BottomTrayLayout,
  WideStatusLayout,
  StatusLayout,
  CheckoutLayout,
} from './composer-tray-types';

export { ComposerTopTray } from './composer-top-tray';

export function ComposerBottomTray(
  layout: BottomTrayLayout,
): React.JSX.Element | null {
  if (!layout.wide) return null;

  return <ComposerWideStatus {...layout} />;
}

function ComposerWideStatus(
  layout: WideStatusLayout,
): React.JSX.Element | null {
  if (!(layout.props.configuration || layout.props.status)) return null;

  return (
    <View className="h-11 self-stretch mx-1.75 -mt-3 pt-3 pr-2.5 rounded-b-xl bg-tray shadow-tray web:backdrop-blur-glass web:backdrop-saturate-180">
      <View className="flex-1 min-h-0 flex-row items-center pl-0.5 gap-1">
        <ComposerTrayStatus {...layout} />
        <View className="flex-1" />
        <ComposerTrayCheckout {...layout} />
      </View>
    </View>
  );
}

function ComposerTrayStatus({
  props,
  inactive,
}: StatusLayout): React.JSX.Element | null {
  return props.status ? (
    <View>
      <ComposerStatusControls status={props.status} disabled={inactive} />
    </View>
  ) : null;
}

function ComposerTrayCheckout({
  props,
  inactive,
}: CheckoutLayout): React.JSX.Element | null {
  return props.configuration ? (
    <View>
      <TrayCheckout
        checkout={props.configuration.checkout}
        disabled={inactive}
      />
    </View>
  ) : null;
}
