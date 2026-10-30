import { avatarDefaults } from '@repo/contracts/kit-tokens';
import type * as React from 'react';
import { useState } from 'react';
import { Image, type ViewProps, View } from 'react-native';
import { cn } from '#kit/utils';
import { Icon } from '#primitives/content/icon';
import { useMediaUrl } from '#primitives/content/media-url';
import { Text } from '#primitives/content/text';
import type { AvatarProps } from './avatar-props';
import { avatarSource } from './avatar-source';
import { AvatarStatus } from './avatar-status';

export function Avatar(props: AvatarProps): React.JSX.Element {
  return <AvatarFrame {...props} />;
}

function AvatarFrame(props: AvatarProps): React.JSX.Element {
  return (
    <View {...avatarFrameProps(props)}>
      <AvatarMedia hosted={props.children !== undefined}>
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

function avatarClassName(size: AvatarProps['size']): string {
  const sizeClass = avatarSizeClass(size);

  return cn('relative shrink-0', sizeClass);
}

function avatarSizeClass(size: AvatarProps['size']): string {
  return {
    xs: 'size-6 wide-type:size-5',
    sm: 'size-6',
    md: 'size-8',
    lg: 'size-10',
    xl: 'size-14',
  }[size ?? avatarDefaults.size];
}

// Avatar's own content sits on tint (Paper Avatar master); hosted content, the Session row's logo, keeps muted.
function AvatarMedia(props: {
  hosted: boolean;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <View
      className={cn(
        'size-full items-center justify-center overflow-hidden rounded-full',
        props.hosted ? 'bg-muted' : 'bg-tint',
      )}
    >
      {props.children}
    </View>
  );
}

function avatarContent(props: AvatarProps): React.ReactNode {
  if (props.children) return props.children;

  if (props.src) return <ResolvedAvatarImage {...props} />;

  return <AvatarFallback key={JSON.stringify(props.source)} {...props} />;
}

function ResolvedAvatarImage(props: AvatarProps): React.JSX.Element {
  const url = useMediaUrl();
  const source = props.src ? avatarSource(url(props.src)) : undefined;

  return (
    <AvatarFallback key={JSON.stringify(source)} {...props} source={source} />
  );
}

function AvatarFallback(props: AvatarProps): React.JSX.Element {
  const [failed, setFailed] = useState(false);

  if (props.source && !failed)
    return (
      <Image
        source={props.source}
        accessible={false}
        className="size-full rounded-full"
        onError={() => setFailed(true)}
      />
    );

  return <AvatarInitials {...props} initials={fallbackInitials(props)} />;
}

function fallbackInitials(props: AvatarProps): string {
  return props.initials ?? nameInitials(props.name);
}

function nameInitials(name: string | undefined): string {
  return (name ?? '')
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

const initialRoles = {
  xs: 'secondary',
  sm: 'secondary',
  md: 'body',
  lg: 'heading',
  xl: 'title',
} as const;

function displayedInitials(
  initials: string,
  size: AvatarProps['size'],
): string {
  return size === 'sm' || size === 'xs' ? initials.charAt(0) : initials;
}

function AvatarInitials({
  initials = '',
  size,
}: Pick<AvatarProps, 'initials' | 'size'>): React.JSX.Element {
  if (!initials)
    return <Icon name={{ sf: 'person.fill', material: 'person' }} />;

  return (
    <Text role={initialRole(size)} tone="neutral" selectable={false}>
      {displayedInitials(initials, size)}
    </Text>
  );
}

function initialRole(
  size: AvatarProps['size'],
): (typeof initialRoles)[keyof typeof initialRoles] {
  return initialRoles[size ?? avatarDefaults.size];
}
