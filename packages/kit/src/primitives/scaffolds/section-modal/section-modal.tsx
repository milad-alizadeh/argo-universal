import type { ReactElement, ReactNode } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { IconButton } from '#primitives/actions/icon-button';
import { CentredModalRoot } from '#primitives/overlays/centred-overlay';
import {
  ScreenHeadingEndInset,
  ScreenListColumn,
} from '#primitives/scaffolds/screen';
import { SectionModalOverlay } from './section-modal-overlay';

interface SectionModalProps {
  label: string;
  list: ReactNode;
  children: ReactNode;
  onClose: () => void;
  onCloseAutoFocus?: (event: Event) => void;
}

// The window inset keeps the whole card in reach at every wide size.
export function SectionModal(props: SectionModalProps): ReactElement {
  const window = useWindowDimensions();

  return (
    <CentredModalRoot
      open
      onOpenChange={(open) => {
        if (!open) props.onClose();
      }}
    >
      <SectionModalOverlay
        label={props.label}
        onCloseAutoFocus={props.onCloseAutoFocus}
        className="overflow-hidden rounded-3xl bg-content shadow-2xl"
      >
        <View
          className="flex-row"
          style={{
            width: Math.min(1040, window.width - 48),
            height: Math.min(680, window.height - 48),
          }}
        >
          <View className="w-60 border-r border-border pt-1.5 native:pt-2.5">
            <ScreenListColumn>{props.list}</ScreenListColumn>
          </View>
          <View className="min-w-0 flex-1">
            <ScreenHeadingEndInset value={48}>
              {props.children}
            </ScreenHeadingEndInset>
            <View className="absolute right-8 top-3">
              <IconButton
                icon="close"
                variant="secondary"
                muted
                accessibilityLabel={`Close ${props.label}`}
                onPress={props.onClose}
              />
            </View>
          </View>
        </View>
      </SectionModalOverlay>
    </CentredModalRoot>
  );
}
