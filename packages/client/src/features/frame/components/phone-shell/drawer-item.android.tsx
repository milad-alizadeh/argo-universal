import {
  Button,
  RNHostView,
  Row,
  Shape,
  Text,
  useMaterialColors,
} from '@expo/ui/jetpack-compose';
import {
  fillMaxWidth,
  height,
  padding,
  semantics,
  weight,
} from '@expo/ui/jetpack-compose/modifiers';
import type * as React from 'react';
import { View } from 'react-native';
import { useCSSVariable } from 'uniwind';
import { Host } from '#lib/generic/primitives/native/host';
import { cn } from '#lib/generic/utils';
import { useComposeTextStyle } from '../../../../lib/generic/primitives/native/native-typography';
import { Icon, iconSizeStyle } from '../../../../lib/generic/symbols/icon';
import { DrawerBadge, type DrawerItemProps } from './drawer-item.tsx';

// Material 3's navigation drawer item: a 56dp pill, tinted when selected.
const itemHeight = 56;
const startPadding = 16;
const endPadding = 24;
const iconGap = 12;

export function DrawerItem(props: DrawerItemProps): React.JSX.Element {
  return (
    <Host matchContents={{ vertical: true }} style={{ width: '100%' }}>
      <DrawerItemButton {...props} />
    </Host>
  );
}

function DrawerItemButton({
  title,
  icon,
  selected,
  badge,
  onPress,
}: DrawerItemProps): React.JSX.Element {
  const colors = useMaterialColors();
  // The theme's selection tint, as on every other selected row, in place of Material's secondary container.
  const highlight = String(useCSSVariable('--color-selected'));
  const content = selected ? colors.onSurface : colors.onSurfaceVariant;
  const label = useComposeTextStyle('control');
  return (
    <Button
      onClick={onPress}
      shape={Shape.RoundedCorner({ cornerRadii: pill })}
      colors={{
        containerColor: selected ? highlight : 'transparent',
        contentColor: content,
      }}
      contentPadding={{ start: 0, top: 0, end: 0, bottom: 0 }}
      modifiers={[
        fillMaxWidth(),
        height(itemHeight),
        semantics({
          contentDescription: [title, badge?.label].filter(Boolean).join(', '),
        }),
      ]}
    >
      <Row
        horizontalArrangement={{ spacedBy: iconGap }}
        verticalAlignment="center"
        modifiers={[fillMaxWidth(), padding(startPadding, 0, endPadding, 0)]}
      >
        <RNHostView matchContents>
          {/* Both glyphs stay mounted, since swapping one in loads its image and leaves a blank frame. */}
          <View collapsable={false} style={iconSizeStyle('lg')}>
            <View className={cn('absolute', !selected && 'opacity-0')}>
              <Icon name={icon} size="lg" filled className="text-foreground" />
            </View>
            <View className={cn('absolute', selected && 'opacity-0')}>
              <Icon name={icon} size="lg" className="text-muted-foreground" />
            </View>
          </View>
        </RNHostView>
        <Text
          color={content}
          style={label}
          maxLines={1}
          modifiers={[weight(1)]}
        >
          {title}
        </Text>
        {badge && (
          <RNHostView matchContents>
            <DrawerBadge badge={badge} />
          </RNHostView>
        )}
      </Row>
    </Button>
  );
}

const pillRadius = itemHeight / 2;
const pill = {
  topStart: pillRadius,
  topEnd: pillRadius,
  bottomStart: pillRadius,
  bottomEnd: pillRadius,
};
