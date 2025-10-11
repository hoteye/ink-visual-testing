import React from 'react';
import { render } from 'ink';
import SimpleBox from './simple-box.tsx';

async function main() {
  const { waitUntilExit } = render(<SimpleBox />);
  await waitUntilExit();
}

main();
