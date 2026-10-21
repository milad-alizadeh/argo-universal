import type { ReactElement } from 'react';
import { View } from 'react-native';
import { bandLeadingSpacer } from './band-leading-spacer';
import { BandTitleLeading } from './band-title-leading';
import type { ScaffoldPartProps } from './use-scaffold-layout';

export interface BandTitleProps extends ScaffoldPartProps {
  leadingWidth: number;
}

function titleLeading({ layout, leadingWidth }: BandTitleProps): number {
  const inset = layout.measures.inset;
  const navPaneWidth = layout.frame.content.offset - inset;
  const spacer = bandLeadingSpacer({ leadingWidth, inset, navPaneWidth });

  return Math.max(
    0,
    inset +
      navPaneWidth +
      spacer +
      layout.measures.contentGutter -
      leadingWidth,
  );
}

// A bounded flex item gives the single-line title all the room up to the trailing group.
export function BandTitle(props: BandTitleProps): ReactElement {
  return (
    <View className="min-w-0 flex-1 flex-row items-center overflow-hidden">
      <BandTitleLeading width={titleLeading(props)} {...props.layout.motion} />
      <View
        testID="band-title"
        className="min-w-0 flex-1 overflow-hidden web:[app-region:no-drag]"
      >
        {props.scaffold.band?.title}
      </View>
    </View>
  );
}
