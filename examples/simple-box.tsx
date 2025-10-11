import React from 'react';
import { Box, Text } from 'ink';

const SimpleBox = () => (
  <Box
    borderStyle="single"
    borderColor="cyan"
    paddingX={2}
    paddingY={1}
    flexDirection="column"
  >
    <Text>🙂一😀二😎三🤖</Text>
    <Text color="cyan">===========</Text>
    <Text color="cyan">单纯中文边框对齐测试</Text>
  </Box>
);

export default SimpleBox;
