import { View } from 'react-native';
import { IconButton } from '#primitives/actions/icon-button';
import { Text } from '#primitives/content/text';
import { iconNames } from '../../../symbols/icon-names';
import { type IconRole, useIconPixels } from '../../../symbols/icon-role';
import { logoSources } from '../../../symbols/logo-source';
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

export function EveryIconExample(): React.JSX.Element {
  return (
    <View className="flex-row flex-wrap gap-x-2 gap-y-3">
      {iconNames.map((name) => (
        <IconCell key={name} name={name} />
      ))}
    </View>
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

export function IconButtonsExample(): React.JSX.Element {
  return (
    <View className="flex-row gap-3">
      {iconButtonExamples.map(({ label, icon }) => (
        <FilledIconButton key={label} label={label} icon={icon} />
      ))}
    </View>
  );
}

export function RolesExample(): React.JSX.Element {
  return (
    <View className="flex-row flex-wrap items-end gap-4">
      {roles.map((role) => (
        <RoleSample key={role} role={role} />
      ))}
    </View>
  );
}

function ColoredIcon({ className }: { className: string }): React.JSX.Element {
  return <Icon name="warning" role="control" className={className} />;
}

export function ColorsExample(): React.JSX.Element {
  return (
    <View className="flex-row items-center gap-3">
      {colorClasses.map((className) => (
        <ColoredIcon key={className} className={className} />
      ))}
    </View>
  );
}

// A logo draws its own SVG through `source`, at the role's size and in the text colour, beside a symbol.
export function LogoExample(): React.JSX.Element {
  return (
    <View className="flex-row items-center gap-3">
      <Icon source={logoSources.github} role="control" />
      <Icon name="web" role="control" />
      <Icon source={logoSources.github} role="control" tone="muted" />
      <Icon name="web" role="control" tone="muted" />
    </View>
  );
}

export function CornerStatusExample(): React.JSX.Element {
  return (
    <View className="flex-row items-center gap-4">
      <Icon name="agent" role="control" status={{ tone: 'success' }} />
      <Icon
        name="agent"
        role="control"
        status={{ tone: 'warning', pulse: true }}
      />
      <Icon name="agent" role="control" status={{ tone: 'danger' }} />
    </View>
  );
}
