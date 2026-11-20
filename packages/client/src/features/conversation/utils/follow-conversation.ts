import type { ConversationStatus } from '@repo/contracts';
import type { ConversationConnection } from '../types/conversation-connection';

/*
 * The connection's lifetime follows the Server's call, wherever the App is: once the Server has no call, the
 * microphone is released and the mutes start over. It acts only when the call becomes over, so a status that arrives
 * while a call is being started, before the Server has it, leaves the starting call alone. Each status the App hears
 * goes into the returned function, and so does the volume and gain the Server holds, which a running call takes at once.
 */
export function followConversation(
  connection: ConversationConnection,
): (status: ConversationStatus) => void {
  let wasOver: boolean | undefined;

  return (status) => {
    const over = status.conversation === null;
    connection.setSound(status);

    if (over && wasOver !== true) connection.close();
    wasOver = over;
  };
}
