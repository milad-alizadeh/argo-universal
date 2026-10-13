import { View } from 'react-native';
import { Text } from '#lib/generic/primitives/display/text/text';
import { Icon } from '../../../symbols/icon';
import { iconNames } from '../../../symbols/icon-names';
import { type IconRole, useIconPixels } from '../../../symbols/icon-role';
import { Variation, Variations as VariationList } from '../../../variations';
import { IconButton } from '../../buttons/icon-button/icon-button';
import { FilledSymbols } from './filled-symbols.mocks';

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
  'text-destructive',
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
      size="md"
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
    </VariationList>
  );
}
