import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import { cn } from '#kit/utils';
import { FieldGroup } from '#primitives/fields/field-group';
import { useCentresOverlays } from '#primitives/overlays/centred-overlay';
import { Sheet } from '#primitives/overlays/sheet';
import { PinnedActions } from './dialog-actions';
import { DialogBody } from './dialog-body';
import type { DialogFormProps } from './dialog-props';
import { DialogSheet } from './dialog-sheet';
import { DialogDescription, DialogHeader, DialogTitle } from './dialog-text';

/*
 * A form is a heading over FieldGroup sections with its actions outside the group (ADR-0042). A centred dialog
 * stacks the three; a sheet hands them on as named parts: the heading and one FieldGroup of the sections, which
 * owns the scrolling and the grouped insets, and the footer pinned under them, in view at any height.
 */
export function DialogForm(props: DialogFormProps): ReactElement {
  const centred = useCentresOverlays();

  return centred ? <CentredForm {...props} /> : <FormSheet {...props} />;
}

function CentredForm({
  title,
  description,
  footer,
  children,
  scrolls,
  sheetHeader: _sheetHeader,
  className,
  ...frame
}: DialogFormProps): ReactElement {
  return (
    <DialogBody
      {...frame}
      accessibilityLabel={title}
      className={cn(scrolls && 'web:max-h-dvh', className)}
    >
      <Heading title={title} description={description} />
      {scrolls ? <CentredSections>{children}</CentredSections> : children}
      {footer}
    </DialogBody>
  );
}

function CentredSections({ children }: { children: ReactNode }): ReactElement {
  return (
    <View className="min-h-0 shrink gap-4 web:overflow-y-auto">{children}</View>
  );
}

function FormSheet(props: DialogFormProps): ReactElement {
  const heading = props.sheetHeader ? (
    props.description && (
      <DialogDescription>{props.description}</DialogDescription>
    )
  ) : (
    <Heading title={props.title} description={props.description} />
  );

  const body = (
    <>
      {heading && <View className="px-4 pb-4 ios:pt-4">{heading}</View>}
      <FieldGroup>{props.children}</FieldGroup>
    </>
  );

  return (
    <DialogSheet
      fields
      label={props.title}
      dismissible={props.dismissible}
      footer={pinned(props.footer)}
    >
      {props.sheetHeader ? (
        <Sheet.Screen name="form" title={props.title} keepsHeaderInset>
          {body}
        </Sheet.Screen>
      ) : (
        body
      )}
    </DialogSheet>
  );
}

function Heading(props: { title: string; description?: string }): ReactElement {
  return (
    <DialogHeader>
      <DialogTitle>{props.title}</DialogTitle>
      {props.description ? (
        <DialogDescription>{props.description}</DialogDescription>
      ) : null}
    </DialogHeader>
  );
}

const pinned = (footer: ReactNode): ReactElement | undefined =>
  footer ? (
    <PinnedActions>
      <View className="gap-3 p-4">{footer}</View>
    </PinnedActions>
  ) : undefined;
