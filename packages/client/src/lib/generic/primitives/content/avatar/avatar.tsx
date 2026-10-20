import type * as React from 'react';
import { Image, type ViewProps, View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { Text, TextClassContext, type Tone } from '#primitives/content/text';
import { StatusDot } from '#primitives/status/status-dot';
import {
  avatarClassName,
  avatarGlyphClassName,
  avatarMediaClassName,
} from './avatar-drawing';
import type { AvatarProps } from './avatar-props';

export function Avatar(props: AvatarProps): React.JSX.Element {
  return <AvatarFrame {...props} />;
}

function AvatarFrame(props: AvatarProps): React.JSX.Element {
  return (
    <View {...avatarFrameProps(props)}>
      <AvatarMedia hosted={props.children !== undefined} tone={props.tone}>
        {avatarContent(props)}
      </AvatarMedia>
      <AvatarStatus {...props} />
    </View>
  );
}

function avatarFrameProps(props: AvatarProps): ViewProps {
  return {
    ...avatarAccessibilityProps(props),
    testID: props.testID,
    className: avatarClassName(props.size),
  };
}

function avatarAccessibilityProps(props: AvatarProps): ViewProps {
  if (props.decorative) return decorativeAvatarAccessibilityProps;

  return {
    accessible: true,
    accessibilityLabel: avatarAccessibleName(props),
    accessibilityRole: 'image',
  };
}

const decorativeAvatarAccessibilityProps: Pick<
  ViewProps,
  'accessible' | 'accessibilityElementsHidden' | 'importantForAccessibility'
> = {
  accessible: false,
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no-hide-descendants',
};

function avatarAccessibleName(props: AvatarProps): string {
  if (!props.status) return props.accessibilityLabel;

  return `${props.accessibilityLabel}, ${props.status.accessibilityLabel ?? props.status.tone}`;
}

function AvatarMedia(props: {
  hosted: boolean;
  tone?: Tone;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <View className={avatarMediaClassName(props.hosted, props.tone)}>
      <TextClassContext value={avatarGlyphClassName(props.tone)}>
        {props.children}
      </TextClassContext>
    </View>
  );
}

function avatarContent(props: AvatarProps): React.ReactNode {
  if (props.children) return props.children;

  if (props.source) return <AvatarImage source={props.source} />;

  return <AvatarInitials initials={props.initials} size={props.size} />;
}

function AvatarImage({
  source,
}: Pick<AvatarProps, 'source'>): React.JSX.Element {
  return (
    <Image
      source={source}
      accessible={false}
      className="size-full rounded-full"
    />
  );
}

// The small circle fits one initial in the Secondary role; the large one shows both in Heading.
function AvatarInitials({
  initials,
  size,
}: Pick<AvatarProps, 'initials' | 'size'>): React.JSX.Element {
  const small = size === 'sm';

  return (
    <Text
      role={small ? 'secondary' : 'heading'}
      tone="neutral"
      selectable={false}
    >
      {small ? initials.charAt(0) : initials}
    </Text>
  );
}

function AvatarStatus(
  props: Pick<AvatarProps, 'size' | 'status' | 'statusSurface' | 'testID'>,
): React.JSX.Element | null {
  if (!props.status) return null;

  return (
    <View className={avatarStatusClass(props.statusSurface)}>
      <StatusDot
        {...avatarStatusDotProps({ ...props, status: props.status })}
      />
    </View>
  );
}

function avatarStatusDotProps(
  props: Pick<AvatarProps, 'size' | 'status' | 'testID'> & {
    status: NonNullable<AvatarProps['status']>;
  },
): React.ComponentProps<typeof StatusDot> {
  return {
    tone: props.status.tone,
    pulse: props.status.pulse,
    className: avatarDotClass(props.size),
    testID: avatarDotTestID(props.testID),
  };
}

function avatarDotClass(size: AvatarProps['size']): string | undefined {
  if (size === 'sm') return 'size-1.5';

  return undefined;
}

function avatarDotTestID(testID: string | undefined): string | undefined {
  if (!testID) return undefined;

  return `${testID}-status`;
}

function avatarStatusClass(surface: AvatarProps['statusSurface']): string {
  return cn(
    'absolute -right-0.5 -top-0.5 rounded-full border-2',
    surface === 'muted' ? 'border-muted bg-muted' : 'border-card bg-card',
    surface === 'selected' && 'web:wide:border-content web:wide:bg-content',
  );
}
