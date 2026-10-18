import type { SessionConfigOption } from '@repo/contracts';
import type * as React from 'react';
import { Platform, View, useWindowDimensions } from 'react-native';
import { configurationChoices } from '#lib/product/session-configuration';
import { List } from '#primitives/lists/list';
import type { ComposerConfigurationProps } from '../composer-configuration/composer-configuration';

type Option = SessionConfigOption;

type Change = ComposerConfigurationProps['onConfigChange'];

import { settingSection } from './option-section';

const maximumHeight = 320;

const rowEstimate = 52;

const sectionGap = 16;

const screenFraction = 0.6;

interface ContentsProps {
  options: Option[];
  onChange: Change;
}

export function OptionsContents(props: ContentsProps): React.JSX.Element {
  const Contents = Platform.OS === 'web' ? WebContents : NativeContents;

  return <Contents {...props} />;
}

function NativeContents(props: ContentsProps): React.JSX.Element {
  return (
    <View className="flex-1 bg-content">
      <List appearance="grouped">{optionSections(props)}</List>
    </View>
  );
}

function optionSections({ options, onChange }: ContentsProps): React.ReactNode {
  return options.map((option) => settingSection(option, onChange));
}

function sectionRows(option: Option): number {
  return option.type === 'boolean'
    ? 1
    : configurationChoices(option).length + 1;
}

function WebContents(props: ContentsProps): React.JSX.Element {
  const { height } = useWindowDimensions();
  const listHeight = optionsHeight(props.options, height);

  return (
    <View className="wide:p-3 bg-content">
      <View style={{ height: listHeight }}>
        <OptionsList {...props} maxHeight={listHeight} />
      </View>
    </View>
  );
}

function OptionsList({
  options,
  onChange,
  maxHeight,
}: ContentsProps & { maxHeight: number }): React.JSX.Element {
  return (
    <List testID="composer-settings-scroll" maxHeight={maxHeight}>
      {options.map((option) => settingSection(option, onChange))}
    </List>
  );
}

function optionsHeight(options: Option[], height: number): number {
  const rows = options.reduce(
    (count, option) => count + sectionRows(option),
    0,
  );

  return Math.min(
    rows * rowEstimate + options.length * sectionGap,
    maximumHeight,
    height * screenFraction,
  );
}
