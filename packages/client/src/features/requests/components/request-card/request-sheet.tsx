import { Sheet, type SheetProps } from '@repo/kit/primitives/overlays/sheet';
import { SizeClass } from '@repo/kit/size-class/size-class';
import type { ReactNode } from 'react';
import { ContentWidthProvider } from '#lib/product/content-layout';
import type { RequestCardProps } from './request-card';
import { RequestFooter } from './request-footer';

// The sheet holds the request's body, given as children; its footer is the card's own.
type SheetRequestProps = Omit<RequestCardProps, 'children'> & {
  container: ReactNode;
  children: ReactNode;
};

// A compact window raises the request as a sheet.
export function SheetWhenCompact(props: SheetRequestProps): ReactNode {
  return (
    <SizeClass compact={<RequestSheet {...props} />} wide={props.container} />
  );
}

// The app opens the sheet and only an answer closes it.
const requestSheet = {
  open: true,
  onOpenChange: (): void => {},
  dismissible: false,
  detents: ['medium', 'large'],
} as const satisfies Partial<SheetProps>;

// The sheet's one page carries the request's title, as the native navigation title on iOS and Material's title row on Android.
function RequestSheet(props: SheetRequestProps): ReactNode {
  return (
    <Sheet
      {...requestSheet}
      label={props.sheetLabel}
      footer={<SheetFooter {...props} />}
    >
      <Sheet.Page name="request" title={props.sheetLabel}>
        <ContentWidthProvider wide={false}>
          {props.children}
        </ContentWidthProvider>
      </Sheet.Page>
    </Sheet>
  );
}

function SheetFooter(props: SheetRequestProps): ReactNode {
  return (
    <ContentWidthProvider wide={false}>
      <RequestFooter {...props} />
    </ContentWidthProvider>
  );
}
