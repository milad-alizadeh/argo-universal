import type { SDKResultMessage } from '../messages';

export const completed: Extract<SDKResultMessage, { subtype: 'success' }> = {
  duration_api_ms: 8234,
  stop_reason: 'end_turn',
  session_id: '135b521b-5786-47bf-9063-5ba22b2b7d45',
  total_cost_usd: 0.0621002,
  usage: {
    input_tokens: 8,
    cache_creation_input_tokens: 4819,
    cache_read_input_tokens: 51941,
    output_tokens: 605,
    output_tokens_details: {
      thinking_tokens: 35,
    },
    server_tool_use: {
      web_search_requests: 0,
      web_fetch_requests: 0,
    },
    service_tier: 'standard',
    cache_creation: {
      ephemeral_1h_input_tokens: 4819,
      ephemeral_5m_input_tokens: 0,
    },
    inference_geo: 'not_available',
    iterations: [],
    speed: 'standard',
    fallback_credit: null,
  },
  permission_denials: [],
  terminal_reason: 'completed',
  is_error: false,
  num_turns: 5,
  subtype: 'success',
  result:
    'I created `notes.md` with a two-item todo list and changed `hello.txt` to read "hello Argo", and git status shows `hello.txt` as modified and `notes.md` as a new untracked file.',
  type: 'result',
  duration_ms: 7779,
  uuid: '65ec00c4-1fb3-4340-a169-9632fd18801c',
  modelUsage: {},
};
