import type { VendorMessage } from '../messages';

const vendorSessionId = '6e478038-0580-40fd-8f8a-63ada82f98ee';

export const compaction: VendorMessage[] = [
  {
    type: 'system',
    subtype: 'status',
    status: 'compacting',
    session_id: vendorSessionId,
    uuid: '6d8abfff-ea69-4c66-b642-d445f9060d16',
  },
  {
    type: 'system',
    subtype: 'status',
    status: null,
    compact_result: 'success',
    session_id: vendorSessionId,
    uuid: 'ab2a8ab7-5d6d-4061-a386-bc7caf742d3a',
  },
  {
    type: 'system',
    subtype: 'compact_boundary',
    session_id: vendorSessionId,
    uuid: 'c7e20f42-5f5b-4c85-8219-b1068ece5f71',
    compact_metadata: {
      trigger: 'manual',
      pre_tokens: 470,
      post_tokens: 780,
      duration_ms: 7127,
    },
  },
];
