import { View } from 'react-native';
import { IconButton } from '#primitives/actions/icon-button';
import { Text } from '#primitives/content/text';
import { iconNames } from '../../../symbols/icon-names';
import { type IconSize, useIconPixels } from '../../../symbols/icon-size';
import { logoSources } from '../../../symbols/logo-source';
import { Icon } from './icon';

type IconName = (typeof iconNames)[number];

const sizes: IconSize[] = ['xs', 'sm', 'md', 'lg'];

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

function SizeSample({ size }: { size: IconSize }): React.JSX.Element {
  return (
    <View className="items-center gap-1">
      <Icon name="add" size={size} />
      <Text role="secondary">{`${size} ${useIconPixels(size)}`}</Text>
    </View>
  );
}

function IconCell({ name }: { name: IconName }): React.JSX.Element {
  return (
    <View className="w-28 items-center gap-1">
      <Icon name={name} size="sm" />
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
      size="xs"
      variant="primary"
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

export function SizesExample(): React.JSX.Element {
  return (
    <View className="flex-row flex-wrap items-end gap-4">
      {sizes.map((size) => (
        <SizeSample key={size} size={size} />
      ))}
    </View>
  );
}

function ColoredIcon({ className }: { className: string }): React.JSX.Element {
  return <Icon name="warning" size="sm" className={className} />;
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
      <Icon source={logoSources.github} size="sm" />
      <Icon name="web" size="sm" />
      <Icon source={logoSources.github} size="sm" tone="muted" />
      <Icon name="web" size="sm" tone="muted" />
    </View>
  );
}

export function CornerStatusExample(): React.JSX.Element {
  return (
    <View className="flex-row items-center gap-4">
      <Icon name="agent" size="sm" status={{ tone: 'success' }} />
      <Icon name="agent" size="sm" status={{ tone: 'warning', pulse: true }} />
      <Icon name="agent" size="sm" status={{ tone: 'danger' }} />
    </View>
  );
}
