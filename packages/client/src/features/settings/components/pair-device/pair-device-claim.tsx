import type { PairingRegistration } from '@repo/contracts';
import { Icon } from '@repo/kit/primitives/content/icon';
import { Text } from '@repo/kit/primitives/content/text';
import type * as React from 'react';
import { View } from 'react-native';
import { platformIcon, platformName } from '../../utils/platform-name';

/*
 * The claim the Device made for itself, which is all the owner has to recognise it by: the Device has spent a Ticket this sheet minted and the Server is holding its registration, so what they decide in the footer is whether that Device is let in at all.
 * The sheet asks rather than the handshake, because this is where the owner is already present and watching the code they asked for.
 */
export function AskingClaim(props: {
  asking: PairingRegistration;
}): React.JSX.Element {
  return (
    <View className="gap-4">
      <ClaimedDevice asking={props.asking} />
      <Text role="secondary">
        It will be able to see your Projects and Sessions. The name is set by
        the Device itself.
      </Text>
    </View>
  );
}

// The name and platform the Device gave, in a tile of their own so the thing to recognise is the thing that is boxed.
function ClaimedDevice(props: {
  asking: PairingRegistration;
}): React.JSX.Element {
  const { claimedName, claimedPlatform } = props.asking;

  return (
    <View className="flex-row items-center gap-3 rounded-xl bg-tint p-3">
      <Icon name={platformIcon(claimedPlatform)} />
      <ClaimedWords name={claimedName} platform={claimedPlatform} />
    </View>
  );
}

function ClaimedWords(props: {
  name: string;
  platform: PairingRegistration['claimedPlatform'];
}): React.JSX.Element {
  return (
    <View className="min-w-0 flex-1">
      <Text role="row" numberOfLines={1}>
        {props.name}
      </Text>
      <Text role="secondary" tone="muted">
        {`${platformName(props.platform)} · wants to pair`}
      </Text>
    </View>
  );
}
