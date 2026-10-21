import { View } from 'react-native';
import { IconButton } from '#primitives/actions/icon-button';
import { Text } from '#primitives/content/text';
import { iconNames } from '../../../symbols/icon-names';
import { type IconRole, useIconPixels } from '../../../symbols/icon-role';
import { logoSources } from '../../../symbols/logo-source';
import { Variation, Variations as VariationList } from '../../../variations';
import { FilledSymbols } from './filled-symbols.mocks';
import { Icon } from './icon';

type IconName = (typeof iconNames)[number];

const roles: IconRole[] = [
  'body',
  'secondary',
  'control',
  'mark',
  'row',
  'action',
  'nav',
  'title',
];

const iconButtonExamples = [
  { label: 'Add', icon: 'add' },
  { label: 'Confirm', icon: 'check' },
  { label: 'Search', icon: 'search' },
] as const;

const colorClasses = [
  'text-foreground',
  'text-muted-foreground',
  'text-primary',
  'text-danger',
];

function RoleSample({ role }: { role: IconRole }): React.JSX.Element {
  return (
    <View className="items-center gap-1">
      <Icon name="add" role={role} />
      <Text role="secondary">{`${role} ${useIconPixels(role)}`}</Text>
    </View>
  );
}

function IconCell({ name }: { name: IconName }): React.JSX.Element {
  return (
    <View className="w-28 items-center gap-1">
      <Icon name={name} role="control" />
      <Text role="secondary">{name}</Text>
    </View>
  );
}

function EveryIconExample(): React.JSX.Element {
  return (
    <Variation label="Every Argo icon">
      <View className="flex-row flex-wrap gap-x-2 gap-y-3">
        {iconNames.map((name) => (
          <IconCell key={name} name={name} />
        ))}
      </View>
    </Variation>
  );
}

function FilledIconButton(props: {
  label: string;
  icon: (typeof iconButtonExamples)[number]['icon'];
}): React.JSX.Element {
  return (
    <IconButton
      aria-label={props.label}
      icon={props.icon}
      accessibilityLabel={props.label}
      size="sm"
      variant="filled"
    />
  );
}

function IconButtonsExample(): React.JSX.Element {
  return (
    <Variation label="Inside icon buttons">
      <View className="flex-row gap-3">
        {iconButtonExamples.map(({ label, icon }) => (
          <FilledIconButton key={label} label={label} icon={icon} />
        ))}
      </View>
    </Variation>
  );
}

function RolesExample(): React.JSX.Element {
  return (
    <Variation label="Roles: each steps to its phone size below the wide breakpoint">
      <View className="flex-row flex-wrap items-end gap-4">
        {roles.map((role) => (
          <RoleSample key={role} role={role} />
        ))}
      </View>
    </Variation>
  );
}

function ColoredIcon({ className }: { className: string }): React.JSX.Element {
  return <Icon name="warning" role="control" className={className} />;
}

function ColorsExample(): React.JSX.Element {
  return (
    <Variation label="Colors: foreground, muted, primary and destructive">
      <View className="flex-row items-center gap-3">
        {colorClasses.map((className) => (
          <ColoredIcon key={className} className={className} />
        ))}
      </View>
    </Variation>
  );
}

export function IconExamples(): React.JSX.Element {
  return (
    <VariationList>
      <EveryIconExample />
      <IconButtonsExample />
      <RolesExample />
      <Variation label="Fill follows selection on every platform">
        <FilledSymbols />
      </Variation>
      <ColorsExample />
      <LogoExample />
      <CornerStatusExample />
    </VariationList>
  );
}

// A logo draws its own SVG through `source`, at the role's size and in the text colour, beside a symbol.
function LogoExample(): React.JSX.Element {
  return (
    <Variation label="Logo source: GitHub's mark beside the web symbol">
      <View className="flex-row items-center gap-3">
        <Icon source={logoSources.github} role="control" />
        <Icon name="web" role="control" />
        <Icon source={logoSources.github} role="control" tone="muted" />
        <Icon name="web" role="control" tone="muted" />
      </View>
    </Variation>
  );
}

function CornerStatusExample(): React.JSX.Element {
  return (
    <Variation label="Corner status">
      <View className="flex-row items-center gap-4">
        <Icon name="agent" role="control" status={{ tone: 'success' }} />
        <Icon
          name="agent"
          role="control"
          status={{ tone: 'warning', pulse: true }}
        />
        <Icon name="agent" role="control" status={{ tone: 'danger' }} />
      </View>
    </Variation>
  );
}
