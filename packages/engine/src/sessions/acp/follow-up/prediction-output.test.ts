import { afterEach, describe, expect, it, vi } from 'vitest';
import { PredictionOutput } from './prediction-output';

function read(...chunks: string[]): string | null {
  const output = new PredictionOutput(new AbortController());

  for (const text of chunks)
    output.observe({
      sessionId: 'background',
      update: {
        sessionUpdate: 'agent_message_chunk',
        content: { type: 'text', text },
      },
    });

  return output.read();
}

const piBanner =
  'pi v1.5.2\n---\n\n## Skills\n- /Users/me/.agents/skills/find-skills/SKILL.md\n\n## Extensions\n- /Users/me/.pi/agent/extensions/trust.ts\n';

describe('PredictionOutput', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reads bare JSON, as Claude and Codex reply', () => {
    expect(read('{"suggestion":"Run the tests"}')).toBe('Run the tests');
  });

  it('reads JSON after a startup banner, as pi replies', () => {
    expect(read(piBanner, '{"suggestion":"Run the tests"}')).toBe(
      'Run the tests',
    );
  });

  it('reads JSON inside a code fence with prose around it', () => {
    expect(
      read('Here you go:\n```json\n{"suggestion": "Commit it"}\n```\nDone.'),
    ).toBe('Commit it');
  });

  it('reads JSON split across chunks', () => {
    expect(read('{"sugg', 'estion":"Ship', ' it"}')).toBe('Ship it');
  });

  it('keeps braces and quotes inside the suggestion', () => {
    expect(read('{"suggestion":"Use {\\"a\\": 1} } here"}')).toBe(
      'Use {"a": 1} } here',
    );
  });

  it('skips other JSON objects and takes the prediction', () => {
    expect(read('{"version":2}\n{"suggestion":"Deploy"}\n{"done":true}')).toBe(
      'Deploy',
    );
  });

  it('reads a declined prediction as none', () => {
    expect(read(piBanner, '{"suggestion":null}')).toBeNull();
  });

  it.each([
    'no JSON at all',
    '{"suggestion":"unterminated',
    '{"suggestion":42}',
    '{"other":"Run it"}',
  ])('discards unusable output: %s', (text) => {
    expect(read(text)).toBeNull();
  });

  it.each([
    ['an empty suggestion', '{"suggestion":"  "}'],
    ['an over-long suggestion', `{"suggestion":"${'a'.repeat(1001)}"}`],
  ])('reads %s as none, not as malformed', (_, text) => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(read(text)).toBeNull();
    expect(log).not.toHaveBeenCalled();
  });

  it('logs the length and start of a reply it rejects', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const reply = `I think the user will ask to ship it. ${'x'.repeat(300)}`;

    read(reply);

    const [line] = log.mock.calls.at(-1) ?? [];

    expect(line).toContain(`(${reply.length} characters)`);
    expect(line).toContain(JSON.stringify(reply.slice(0, 200)));
    expect(line).not.toContain(reply.slice(0, 201));
  });
});
