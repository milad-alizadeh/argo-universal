import { createElement, type JSX } from 'react';
import type { ComposerProps } from '#features/composer';
import { ShellSheet, type ShellPanelProps } from '#features/sessions';
import { SizeClass } from '../../../lib/generic/size-class/size-class';

type SheetProps = {
  shells: ShellPanelProps | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type ShellPresentation = {
  composer: ComposerProps;
  sheet: JSX.Element | null;
};

function workStatus(
  shells: ShellPanelProps,
  open: () => void,
): NonNullable<ComposerProps['status']>['shells'] {
  return {
    count: shells.shells.length,
    running: shells.shells.some((shell) => shell.status === 'running'),
    onPress: open,
  };
}

function composerWithShells(
  composer: ComposerProps,
  shells: ShellPanelProps | undefined,
  open: () => void,
): ComposerProps {
  if (!shells?.shells.length) return composer;

  return {
    ...composer,
    status: { ...composer.status, shells: workStatus(shells, open) },
  };
}

function SessionShellSheet({
  shells,
  open,
  onOpenChange,
}: SheetProps): JSX.Element | null {
  if (!shells?.shells.length) return null;

  return createElement(ShellSheet, { ...shells, open, onOpenChange });
}

// The Composer's Shells pill on a phone, where the Inspector's Shells tab is not drawn.
export function useSessionShells(
  composer: ComposerProps,
  shells: ShellPanelProps | undefined,
  sheetProps: Pick<SheetProps, 'open' | 'onOpenChange'>,
): ShellPresentation {
  const show = (): void => sheetProps.onOpenChange(true);

  return {
    composer: composerWithShells(composer, shells, show),
    sheet: (
      <SizeClass only="compact">
        <SessionShellSheet shells={shells} {...sheetProps} />
      </SizeClass>
    ),
  };
}
