import type { ReactElement, ReactNode } from 'react';
import { Platform, View, useWindowDimensions } from 'react-native';
import { OfferColumn } from '#kit/content-column/content-column';
import { SidebarGutterHeld } from '#kit/sidebar-gutter';
import { IconButton } from '#primitives/actions/icon-button';
import { CentredModalRoot } from '#primitives/overlays/centred-overlay';
import {
  ScreenHeadingEndInset,
  ScreenListColumn,
} from '#primitives/scaffolds/screen';
import { SectionModalOverlay } from './section-modal-overlay';

export const sectionModalHeadingInset = 48;

const windowMargin = 24;

const maxCardWidth = 1040;

const maxCardHeight = 680;

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
            width: Math.min(maxCardWidth, window.width - windowMargin * 2),
            height: Math.min(maxCardHeight, window.height - windowMargin * 2),
          }}
        >
          <ModalList>{props.list}</ModalList>
          <View className="min-w-0 flex-1">
            <ScreenHeadingEndInset value={sectionModalHeadingInset}>
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

// Keep the sidebar row gutters inside the scroll view so its scrollbar meets the separator.
const listColumn = { paddingLeft: 8, paddingRight: 14 };

function ModalList({ children }: { children: ReactNode }): ReactElement {
  return (
    <View className="w-60 border-r border-border pt-1.5 native:pt-2.5">
      <ScreenListColumn>
        {Platform.OS === 'web' ? (
          <SidebarGutterHeld value>
            <OfferColumn column={listColumn}>{children}</OfferColumn>
          </SidebarGutterHeld>
        ) : (
          children
        )}
      </ScreenListColumn>
    </View>
  );
}
