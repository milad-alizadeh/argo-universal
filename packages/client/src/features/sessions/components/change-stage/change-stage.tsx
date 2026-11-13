import { SecondaryGlyphs } from '@repo/kit/primitives/content/icon';
import { Text } from '@repo/kit/primitives/content/text';
import { ToneCaption, ToneMark } from '@repo/kit/tone-mark';
import type { ReactElement } from 'react';
import { View, type ViewProps } from 'react-native';
import {
  changeDescription,
  changeModifiers,
  resolveChangeStage,
  type ChangeState,
} from './change-stage-model';

export type ChangeStageProps = ChangeState & {
  number?: number;
  form?: 'bare' | 'disc';
  testID?: string;
};

type GlyphProps = ChangeState & {
  form?: 'bare' | 'disc';
};

export function ChangeStageIcon(props: GlyphProps): ReactElement {
  return <ToneMark {...resolveChangeStage(props)} form={props.form} />;
}

function stageLabel(props: ChangeStageProps): string {
  return props.number === undefined
    ? resolveChangeStage(props).label
    : `#${props.number}`;
}

function stageAccessibilityLabel(props: ChangeStageProps): string {
  const number = props.number === undefined ? '' : ` #${props.number}`;

  return `${changeDescription(props)} Change${number}`;
}

export function ChangeStageModifier(props: ChangeState): ReactElement | null {
  const modifiers = changeModifiers(props);

  if (modifiers.length === 0) return null;

  return (
    <>
      {modifiers.map(({ label, tone }) => (
        <Text key={label} role="secondary" tone={tone}>
          {label}
        </Text>
      ))}
    </>
  );
}

type StageContainerProps = Pick<
  ViewProps,
  'testID' | 'accessible' | 'accessibilityLabel' | 'className'
>;

function accessibility(props: ChangeStageProps): StageContainerProps {
  return {
    className:
      props.form === 'disc'
        ? 'flex-row items-center gap-3'
        : 'flex-row items-center gap-1.5',
    testID: props.testID,
    accessible: true,
    accessibilityLabel: stageAccessibilityLabel(props),
  };
}

// The icon of a meta line, beside Secondary text: a bare icon, so it keeps the desktop size on a phone; a disc has its own box.
export function SecondaryChangeStageIcon(props: GlyphProps): ReactElement {
  const icon = <ChangeStageIcon {...props} />;

  return props.form === 'disc' ? (
    icon
  ) : (
    <SecondaryGlyphs>{icon}</SecondaryGlyphs>
  );
}

export function ChangeStage(props: ChangeStageProps): ReactElement {
  const appearance = resolveChangeStage(props);

  return (
    <View {...accessibility(props)}>
      <SecondaryChangeStageIcon {...props} />
      <ToneCaption tone={appearance.tone}>{stageLabel(props)}</ToneCaption>
      <ChangeStageModifier {...props} />
    </View>
  );
}
