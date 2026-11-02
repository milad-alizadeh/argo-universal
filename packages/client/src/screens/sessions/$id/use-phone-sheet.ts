import { NavigationContext } from 'expo-router/react-navigation';
import { use, useEffect, useState } from 'react';
import type { SessionPanels } from '#features/sessions';
import { useScreenFocused } from '#lib/product/navigation/navigation';

interface PhoneSheet {
  panels: SessionPanels;
  visible: boolean;
}

const visibleWhenFocused = (focused: boolean, allowed: boolean): boolean =>
  focused && allowed;

function useDismissOnBlur(dismiss: () => void): void {
  const navigation = use(NavigationContext);

  useEffect(() => navigation?.addListener('blur', dismiss), [navigation, dismiss]);
}

function useSheetAllowed(focused: boolean): [boolean, () => void] {
  const [state, setState] = useState({ focused, allowed: true });

  useDismissOnBlur(() =>
    setState((current) => ({ ...current, allowed: false })),
  );

  if (state.focused !== focused)
    setState({ focused, allowed: visibleWhenFocused(focused, state.allowed) });

  return [
    visibleWhenFocused(focused, state.allowed),
    () => setState({ focused, allowed: true }),
  ];
}

const reopen =
  (open: (panel: string) => void, show: () => void) =>
  (panel: string): void => {
    show();
    open(panel);
  };

function sheetPanels(
  panels: SessionPanels,
  show: () => void,
  visible: boolean,
): SessionPanels {
  return {
    ...panels,
    select: reopen(panels.select, show),
    toggle: reopen(visible ? panels.toggle : panels.select, show),
    request: reopen(panels.request, show),
  };
}

// A phone sheet is presentation, separate from the Session's remembered Inspector tabs.
export function usePhoneSheet(panels: SessionPanels): PhoneSheet {
  const focused = useScreenFocused();
  const [visible, show] = useSheetAllowed(focused);

  return { visible, panels: sheetPanels(panels, show, visible) };
}
