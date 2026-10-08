import { useEffect, useState } from 'react';
import type { SessionScreenProps } from '../src/screens/session-screen';
import { SessionScreenPreview } from './session-screen-preview';

let openSession = (_id: string) => {};
// Opens another Session in the same screen, as the shell's list does.
export const switchSession = (id: string) => openSession(id);

// The Session screen whose id a test can change after it opens.
export function SessionSwitchPreview(props: SessionScreenProps) {
  const [id, setId] = useState(props.id);
  useEffect(() => {
    openSession = setId;
    return () => {
      openSession = () => {};
    };
  }, []);
  return <SessionScreenPreview {...props} id={id} />;
}
