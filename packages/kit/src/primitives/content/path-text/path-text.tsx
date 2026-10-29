import * as React from 'react';
import { View } from 'react-native';
import { Pressable } from '#primitives/actions/pressable';
import { Tooltip } from '#primitives/overlays/tooltip';
import { ScrollFadeView } from '../../../scroll-fade/scroll-fade';
import { useCutShort } from './path-cut';
import { splitPath } from './path-parts';
import { Folder, Name, WholePath } from './path-text-segments';

export interface PathTextProps {
  path: string;
  // The whole path muted, for a title.
  quiet?: boolean;
  // Compact: the whole path stays on its line and scrolls sideways.
  scroll?: boolean;
  testID?: string;
  // A parent trigger may own the tooltip while this component still measures truncation.
  showTooltip?: boolean;
  onCutChange?: (cut: boolean) => void;
  // Pressing the path, which a tooltip around it would otherwise take.
  onPress?: React.ComponentProps<typeof Pressable>['onPress'];
}

const unfocusable = {
  accessible: false,
  focusable: false,
  tabIndex: -1,
} as const;

type LineProps = PathTextProps &
  Pick<ReturnType<typeof useCutShort>, 'ref'> &
  Pick<ReturnType<typeof useCutShort>, 'onLayout'>;

function Line({ ref, onLayout, ...props }: LineProps): React.JSX.Element {
  const { folder, name } = splitPath(props.path);

  return (
    <View
      ref={ref}
      onLayout={onLayout}
      testID={props.testID}
      accessibilityLabel={props.path}
      className="min-w-0 flex-row items-center"
    >
      {!!folder && <Folder folder={folder} />}
      <Name name={name} quiet={props.quiet} />
    </View>
  );
}

type HintedProps = PathTextProps & {
  children: React.ReactElement;
  // Measures the path again, so a cut that a later layout undid, as a font loading, shows no tooltip.
  onHoverIn: () => void;
};

// The tooltip's hover box hugs the path's text, not the row it sits in.
function Hinted(props: HintedProps): React.JSX.Element {
  return (
    <Tooltip label={props.path}>
      <Pressable
        {...unfocusable}
        onPress={props.onPress}
        onHoverIn={props.onHoverIn}
        className="min-w-0 max-w-full self-start"
      >
        {props.children}
      </Pressable>
    </Tooltip>
  );
}

// A long folder gives up its start, never the name.
function CutLine(props: PathTextProps): React.JSX.Element {
  const { cut, ...watch } = useCutShort(props.path);
  const line = <Line {...props} {...watch} />;
  const { onCutChange } = props;

  React.useEffect(() => onCutChange?.(cut), [cut, onCutChange]);

  // A column, so the tooltip's own wrapper takes the row's width rather than the path's.
  return (
    <View className="min-w-0 flex-1">
      {cutContent(props, cut, { line, onHoverIn: watch.onLayout })}
    </View>
  );
}

function cutContent(
  props: PathTextProps,
  cut: boolean,
  watch: { line: React.ReactElement; onHoverIn: () => void },
): React.JSX.Element {
  return cut && props.showTooltip !== false ? (
    <Hinted {...props} onHoverIn={watch.onHoverIn}>
      {watch.line}
    </Hinted>
  ) : (
    watch.line
  );
}

function ScrollingLine({ path }: PathTextProps): React.JSX.Element {
  return (
    <ScrollFadeView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="flex-1"
    >
      <WholePath {...splitPath(path)} />
    </ScrollFadeView>
  );
}

// A path with its folder muted and its name strong. The folder gives up its start to a narrow box; the whole path shows in a tooltip, on web, only while it is cut.
export function PathText(props: PathTextProps): React.JSX.Element {
  return props.scroll ? <ScrollingLine {...props} /> : <CutLine {...props} />;
}
