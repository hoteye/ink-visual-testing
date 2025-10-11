import React from 'react';
import { Box, Text } from 'ink';

const SimpleBox = () => (
  <Box
    borderStyle="single"
    borderColor="cyan"
    paddingX={2}
    paddingY={1}
    flexDirection="column"
    width={32}
  >
    {/* Each emoji block pads to 6 characters to ensure borders stay aligned */}
    <Text>{'🙂\uFE0E 1  '}{'😀\uFE0E 1  '}{'😎\uFE0E 1  '}{'🤖\uFE0E 1  '}</Text>
    <Text>{'🚀\uFE0E 2  '}{'📦\uFE0E 2  '}{'✨\uFE0E 2  '}{'💡\uFE0E 2  '}</Text>
    <Text color="cyan">===========</Text>
    <Text color="cyan">单纯中文边框对齐测试</Text>
  </Box>
);

export default SimpleBox;
