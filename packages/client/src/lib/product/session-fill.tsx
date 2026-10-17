import { createContext, useContext } from 'react';

// Whether the Composer's request fills the Session column, the Feed hidden behind it, such as a plan read full page.
export interface SessionFill {
  filled: boolean;
  setFilled: (filled: boolean) => void;
}

// What a filled view and each box around it take: the height left over.
export const filledClass = 'min-h-0 flex-1';

const unfillable: SessionFill = { filled: false, setFilled: () => {} };

const SessionFillContext = createContext<SessionFill>(unfillable);

export const SessionFillProvider = SessionFillContext.Provider;

// Outside a Session layout that can fill, nothing fills.
export const useSessionFill = (): SessionFill => useContext(SessionFillContext);
