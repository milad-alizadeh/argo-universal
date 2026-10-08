import type { VendorMessage } from '../messages';
import { assistant, user } from './sdk-messages';
import { completed } from './sdk-result';
import { thought, answer } from './sdk-text';

const originalText = 'hello world\n';

const commandOutput = 'hello Argo\n M hello.txt\n?? notes.md';

const helloPath = '/project/hello.txt';

export const edits: VendorMessage[] = [
  ...thought,
  {
    ...assistant('msg_011CfiGV55PC6jDNmPmEHy8D', [
      {
        type: 'tool_use',
        id: 'toolu_01FDakYHkWn7oMZW8hWNVddc',
        name: 'Write',
        input: {
          file_path: '/project/notes.md',
          content:
            '# Todo\n\n- [ ] Update greeting in hello.txt\n- [ ] Review git status\n',
        },
        caller: { type: 'direct' },
      },
    ]),
    timestamp: '2026-10-05T02:02:52.266Z',
  },
  user(
    [
      {
        tool_use_id: 'toolu_01FDakYHkWn7oMZW8hWNVddc',
        type: 'tool_result',
        content:
          'File created successfully at: /project/notes.md (file state is current in your context \u2014 no need to Read it back)',
      },
    ],
    { originalFile: null },
    '2026-10-05T02:02:52.285Z',
  ),
  {
    ...assistant('msg_011CfiGV55PC6jDNmPmEHy8D', [
      {
        type: 'tool_use',
        id: 'toolu_01SxWPoiSEcuefwQ7yYCUMf7',
        name: 'Read',
        input: { file_path: helloPath },
        caller: { type: 'direct' },
      },
    ]),
    timestamp: '2026-10-05T02:02:52.949Z',
  },
  user(
    [
      {
        tool_use_id: 'toolu_01SxWPoiSEcuefwQ7yYCUMf7',
        type: 'tool_result',
        content: '1\thello world\n2\t',
      },
    ],
    {
      type: 'text',
      file: {
        filePath: helloPath,
        content: originalText,
        numLines: 2,
        startLine: 1,
        totalLines: 2,
      },
    },
    '2026-10-05T02:02:52.955Z',
  ),
  {
    ...assistant('msg_011CfiGVJayXc1RiLUxbipiM', [
      {
        type: 'tool_use',
        id: 'toolu_017jjekVKPQW8pQZNYRFNzF6',
        name: 'Edit',
        input: {
          replace_all: false,
          file_path: helloPath,
          old_string: 'hello world',
          new_string: 'hello Argo',
        },
        caller: { type: 'direct' },
      },
    ]),
    timestamp: '2026-10-05T02:02:55.075Z',
  },
  user(
    [
      {
        tool_use_id: 'toolu_017jjekVKPQW8pQZNYRFNzF6',
        type: 'tool_result',
        content:
          'The file /project/hello.txt has been updated successfully. (file state is current in your context \u2014 no need to Read it back)',
      },
    ],
    { originalFile: originalText },
    '2026-10-05T02:02:55.085Z',
  ),
  {
    ...assistant('msg_011CfiGVT8vsF1MYBnkMFAXX', [
      {
        type: 'tool_use',
        id: 'toolu_01G161bUEDoix223h77wg2HL',
        name: 'Bash',
        input: {
          command: 'cat hello.txt && git status --short',
          description: 'Show hello.txt and short git status',
        },
        caller: { type: 'direct' },
      },
    ]),
    timestamp: '2026-10-05T02:02:56.295Z',
  },
  user(
    [
      {
        tool_use_id: 'toolu_01G161bUEDoix223h77wg2HL',
        type: 'tool_result',
        content: commandOutput,
        is_error: false,
      },
    ],
    {
      stdout: commandOutput,
      stderr: '',
      interrupted: false,
    },
    '2026-10-05T02:02:56.582Z',
  ),
  ...answer,
  completed,
];
