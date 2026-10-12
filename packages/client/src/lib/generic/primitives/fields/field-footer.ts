import { createContext, useContext } from 'react';

// The id of the footer under a section's fields, so a field can name it as its description.
const FooterIdContext = createContext<string | undefined>(undefined);
export const FooterIdProvider = FooterIdContext.Provider;
export const useFooterId = (): string | undefined =>
  useContext(FooterIdContext);
