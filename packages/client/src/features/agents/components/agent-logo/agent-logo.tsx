import { Icon } from '@repo/kit/primitives/content/icon';
import type { IconSizeValue } from '@repo/kit/symbols/icon-size';
import type * as React from 'react';
import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { useResolveClassNames } from 'uniwind';
import { RegistryIcon } from '../registry-icon/registry-icon';

interface AgentLogoProps {
  // SVG markup, the registry's icon URI, or an empty string for an Agent without a logo.
  logo: string;
  label: string;
  size: IconSizeValue;
  testID?: string;
}

// An Agent's logo in the foreground colour; an Agent with none shows the Agent glyph, since an empty or non-SVG string would throw in SvgXml.
export function AgentLogo(props: AgentLogoProps): React.JSX.Element {
  const logo = props.logo.trim();

  if (!logo)
    return <Icon name="agent" size={props.size} className="text-foreground" />;

  if (!logo.startsWith('<'))
    return (
      <View testID={props.testID} className="h-full w-full">
        <RegistryIcon uri={logo} agentName={props.label} size={props.size} />
      </View>
    );

  return <InlineLogo {...props} logo={logo} />;
}

function InlineLogo(props: AgentLogoProps): React.JSX.Element {
  const { color } = useResolveClassNames('text-foreground');

  return (
    <View testID={props.testID} className="h-full w-full">
      <SvgXml xml={props.logo} width="100%" height="100%" color={color} />
    </View>
  );
}
