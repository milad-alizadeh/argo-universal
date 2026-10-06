import { View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { withUniwind } from 'uniwind';
import { type IconSize, iconSizeClasses } from './Icon';

const ThemedSvg = withUniwind(Svg, {
  stroke: { fromClassName: 'className', styleProperty: 'color' },
});

const drawings = {
  remove: <Path d="m6 6 12 12M18 6 6 18" />,
  warning: (
    <>
      <Circle cx={12} cy={12} r={9} />
      <Path d="M12 7v6m0 4h.01" />
    </>
  ),
  pending: <Circle cx={9} cy={9} r={7} />,
  camera: (
    <>
      <Path d="M4 7h4l2-3h4l2 3h4v14H4z" />
      <Circle cx={12} cy={13} r={4} />
    </>
  ),
  photos: (
    <>
      <Rect x={3} y={3} width={18} height={18} rx={3} />
      <Circle cx={8} cy={8} r={1.5} />
      <Path d="m4 18 5-6 4 4 3-4 5 6" />
    </>
  ),
  files: (
    <Path d="M9 17V7a3 3 0 0 1 6 0v11a5 5 0 0 1-10 0V9m6 0v9a1 1 0 0 0 2 0V7" />
  ),
};

export function ComposerGlyph({
  name,
  size = 'md',
  className = 'text-foreground',
}: {
  name: keyof typeof drawings;
  size?: IconSize;
  className?: string;
}) {
  let strokeWidth = 1.5;
  if (name === 'remove') strokeWidth = 2;
  else if (name === 'warning') strokeWidth = 1.7;
  return (
    <View className={`${iconSizeClasses[size]} shrink-0`}>
      <ThemedSvg
        accessible={false}
        width="100%"
        height="100%"
        viewBox={name === 'pending' ? '0 0 18 18' : '0 0 24 24'}
        fill="none"
        className={className}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {drawings[name]}
      </ThemedSvg>
    </View>
  );
}
