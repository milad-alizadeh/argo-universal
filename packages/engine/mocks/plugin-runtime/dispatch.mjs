import { Button, Column, Text, useState, useRef } from '@argo/plugin-kit';
import { jsx, jsxs } from '@argo/plugin-kit/jsx-runtime';

const failure = async () => {
  throw new Error('Handler refused');
};

const Fail = () => jsx(Button, { label: 'Fail', onPress: failure }, 'fail');

const choices = (reversed, choose) =>
  (reversed ? ['beta', 'alpha'] : ['alpha', 'beta']).map((name) =>
    jsx(Button, { label: name, onPress: () => choose(name) }, name),
  );

const WaitButtons = ({ wait, release }) =>
  jsxs(
    Column,
    {
      children: [
        jsx(Button, { label: 'Wait', onPress: wait }, 'wait'),
        jsx(
          Button,
          { label: 'Finish', onPress: () => release.current() },
          'finish',
        ),
      ],
    },
    'waiting',
  );

const Waiting = ({ choose }) => {
  const release = useRef(() => {});

  const wait = async () => {
    choose('waiting');
    await new Promise((resolve) => {
      release.current = resolve;
    });
    choose('done');
  };

  return jsx(WaitButtons, { wait, release }, 'waiting');
};

const reverseButton = (reversed, reverse) =>
  jsx(
    Button,
    { label: 'Reverse', onPress: () => reverse(!reversed) },
    'reverse',
  );

const Page = () => {
  const [reversed, reverse] = useState(false);
  const [chosen, choose] = useState('none');

  return jsxs(Column, {
    children: [
      jsx(Text, { children: chosen }),
      reverseButton(reversed, reverse),
      ...choices(reversed, choose),
      jsx(Fail),
      jsx(Waiting, { choose }),
    ],
  });
};

export function register(argo) {
  argo.pages.register('/', Page);
}
