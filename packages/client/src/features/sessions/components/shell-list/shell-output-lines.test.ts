import { describe, expect, it } from 'vitest';
import { shellOutputLines } from './shell-output-lines';

const escape = '\u001B';

describe('shellOutputLines', () => {
  it('splits plain output into lines of untoned text', () => {
    expect(shellOutputLines('one\ntwo')).toEqual([
      [{ text: 'one' }],
      [{ text: 'two' }],
    ]);
  });

  it('keeps an empty line and drops the newline that ends the output', () => {
    expect(shellOutputLines('one\n\ntwo\n')).toEqual([
      [{ text: 'one' }],
      [],
      [{ text: 'two' }],
    ]);
  });

  it.each([
    ['31', 'danger'],
    ['91', 'danger'],
    ['32', 'success'],
    ['33', 'warning'],
    ['34', 'info'],
    ['36', 'info'],
    ['35', 'done'],
    ['90', 'muted'],
    ['2', 'muted'],
    ['37', 'neutral'],
  ] as const)('tones colour code %s as %s', (code, tone) => {
    expect(shellOutputLines(`${escape}[${code}mword${escape}[0m rest`)).toEqual(
      [[{ text: 'word', tone }, { text: ' rest' }]],
    );
  });

  it('reads the colour from a combined code and resets it with 39', () => {
    expect(shellOutputLines(`${escape}[1;32mok${escape}[39m plain`)).toEqual([
      [{ text: 'ok', tone: 'success' }, { text: ' plain' }],
    ]);
  });

  it('carries a colour across a line break', () => {
    expect(shellOutputLines(`${escape}[31mfirst\nsecond`)).toEqual([
      [{ text: 'first', tone: 'danger' }],
      [{ text: 'second', tone: 'danger' }],
    ]);
  });

  it('drops escape sequences that do not colour text', () => {
    expect(
      shellOutputLines(`${escape}[2K${escape}[1Gdone${escape}]0;title\u0007`),
    ).toEqual([[{ text: 'done' }]]);
  });

  it('keeps only what follows the last carriage return, as a terminal redraws a line', () => {
    expect(shellOutputLines('10%\r50%\r100%\r\nnext')).toEqual([
      [{ text: '100%' }],
      [{ text: 'next' }],
    ]);
  });
});
