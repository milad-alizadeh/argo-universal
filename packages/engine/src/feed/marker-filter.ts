import type { FeedSubscribeOutput, SessionUpdate } from '@repo/contracts';
import { VoiceMarkerStream } from './conversation-marker-stream';
import { firstText, withoutVoiceMarkers } from './conversation-markers';

const firstTextField = 'content.0.text';

type Message = Extract<SessionUpdate, { sessionUpdate: 'agent_message' }>;

type OpenMessage = { stream: VoiceMarkerStream; shown: number };

type Appended = Extract<FeedSubscribeOutput, { type: 'row.append' }>;

const openText = (row: Message): string => firstText(row.content) ?? '';

const isOpenMessage = (row: SessionUpdate): row is Message =>
  row.sessionUpdate === 'agent_message' && row.state === 'open';

/*
 * One subscriber's view of the Agent messages that are still arriving, without their voice marks. A message that is
 * still open is read through a stream that holds back what might yet become a mark; a settled one is read whole.
 */
export class VoiceMarkerFilter {
  private readonly open = new Map<string, OpenMessage>();

  public output(event: FeedSubscribeOutput): FeedSubscribeOutput {
    if (event.type === 'row.upsert')
      return { ...event, row: this.row(event.row) };

    if (event.type === 'row.append') return this.append(event);

    this.settle(event);

    return event;
  }

  private settle(event: FeedSubscribeOutput): void {
    if (event.type === 'row.patch' && event.set['state'] === 'settled')
      this.open.delete(event.id);
  }

  private row(row: SessionUpdate): SessionUpdate {
    this.open.delete(row.id);

    return isOpenMessage(row) ? this.openRow(row) : withoutVoiceMarkers(row);
  }

  private openRow(row: Message): Message {
    const stream = new VoiceMarkerStream();
    const text = stream.push(openText(row));
    this.open.set(row.id, { stream, shown: text.length });
    const [first, ...rest] = row.content;

    return first?.type === 'text'
      ? { ...row, content: [{ ...first, text }, ...rest] }
      : row;
  }

  private append(event: Appended): FeedSubscribeOutput {
    const message = this.open.get(event.id);

    if (!message || event.field !== firstTextField) return event;
    const text = message.stream.push(event.text);
    const shown = message.shown;
    message.shown += text.length;

    return { ...event, text, off: shown };
  }
}
