import type { ComponentType, ReactElement } from 'react';
import { Icon } from '#primitives/display/icon/icon';
import type { IconName } from '../../../symbols/icon-names';
import { Host } from '../../native/host';
import { ContentButton } from './button-content';
import { withNarrowLayout } from './button-layout';
import { useNativeButtonTheme, type ButtonTheme } from './button-native-colors';
import type { ButtonProps, SystemButtonProps } from './button-props';
import { nativeButtonLayout } from './button-state';

export function createNativeButton(
  NativeButton: ComponentType<NativeDrawingProps>,
): ComponentType<ButtonProps> {
  return withNarrowLayout(function Button(props: ButtonProps): ReactElement {
    if (props.appearance === 'content') return <ContentButton {...props} />;

    return <NativeButtonHost {...props} Drawing={NativeButton} />;
  });
}

type NativeDrawingProps = SystemButtonProps & { theme: ButtonTheme };

type NativeHostProps = SystemButtonProps & {
  Drawing: ComponentType<NativeDrawingProps>;
};

function NativeButtonHost(props: NativeHostProps): ReactElement {
  const theme = useNativeButtonTheme(props);

  return (
    <Host {...nativeButtonLayout(props)}>
      <props.Drawing {...props} theme={theme} />
    </Host>
  );
}

interface NativeButtonIconProps {
  icon?: IconName;
  contentClass: string;
  HostView: ComponentType<{ matchContents?: boolean; children: ReactElement }>;
}

export function NativeButtonIcon({
  icon,
  contentClass,
  HostView,
}: NativeButtonIconProps): ReactElement | null {
  if (!icon) return null;

  return (
    <HostView matchContents>
      <Icon name={icon} role="control" className={contentClass} />
    </HostView>
  );
}
