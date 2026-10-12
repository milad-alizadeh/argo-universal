import { createContext, useContext } from 'react';

// A section's footer, so the fields it speaks about can name it as their description.
export type SectionFooter = { id: string; failure: boolean };
const FooterContext = createContext<SectionFooter | undefined>(undefined);
export const FooterProvider = FooterContext.Provider;

type Described = { invalid: boolean; hint?: string };

// The footer is one field's error, or the hint of the field that has one: not every field's description.
function speaksOf(footer: SectionFooter, field: Described): boolean {
  if (field.invalid) return footer.failure;
  return !footer.failure && !!field.hint;
}

export function useFooterDescription(field: Described): string | undefined {
  const footer = useContext(FooterContext);
  return footer && speaksOf(footer, field) ? footer.id : undefined;
}
