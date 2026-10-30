import type { ReactElement, ReactNode } from 'react';
import { useEffect } from 'react';
import { View, type ViewStyle } from 'react-native';
import { ClampLeaves } from './clamp-leaves';
import { useWholeLineClamp, type WholeLineClamp } from './use-whole-line-clamp';
import { wholeLineClip } from './whole-line-clip';

interface ClampProps {
  children: ReactNode;
  lines?: number;
  onOverflowChange?: (overflowing: boolean) => void;
}

export function MarkdownClamp({
  lines,
  onOverflowChange,
  children,
}: ClampProps): ReactElement {
  const clamp = useWholeLineClamp(lines);
  const overflowing = clamp.clipHeight !== undefined;

  useEffect(
    () => onOverflowChange?.(overflowing),
    [overflowing, onOverflowChange],
  );

  return <ClampFrame {...clamp}>{children}</ClampFrame>;
}

type ContentProps = WholeLineClamp & { children: ReactNode };

function ClampFrame(props: ContentProps): ReactElement {
  return (
    <View className="max-w-full" style={clipStyle(props.clipHeight)}>
      <ClampContent {...props} />
    </View>
  );
}

function ClampContent(props: ContentProps): ReactElement {
  const { content, onContentLayout, leafRegistry, children } = props;

  return (
    <View ref={content} onLayout={onContentLayout} className="max-w-full">
      <ClampLeaves.Provider value={leafRegistry}>
        {children}
      </ClampLeaves.Provider>
    </View>
  );
}

const clipStyle = (height: number | undefined): ViewStyle | undefined =>
  height === undefined ? undefined : wholeLineClip(height);
