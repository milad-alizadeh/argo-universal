import type * as React from 'react';
import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { useResolveClassNames } from 'uniwind';
import { Icon } from '#primitives/display/icon';
import type { IconRoleValue } from '../../../../lib/generic/symbols/icon-role';
import { RegistryIcon } from '../registry-icon/registry-icon';

interface AgentLogoProps {
  // SVG markup, the registry's icon URI, or nothing for a custom Agent.
  logo: string;
  label: string;
  role: IconRoleValue;
  testID?: string;
}

// An Agent's logo in the foreground colour; an Agent with none shows the Agent glyph, since an empty or non-SVG string would throw in SvgXml.
export function AgentLogo(props: AgentLogoProps): React.JSX.Element {
  const logo = props.logo.trim();

  if (!logo)
    return <Icon name="agent" role={props.role} className="text-foreground" />;

  if (!logo.startsWith('<'))
    return (
      <RegistryIcon uri={logo} agentName={props.label} role={props.role} />
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
