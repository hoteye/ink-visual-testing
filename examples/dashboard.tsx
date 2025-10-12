import React from 'react';
import { Box, Text } from 'ink';

/**
 * Emoji-focused Dashboard - Only boxes with emoji content
 */
const Dashboard = () => (
  <Box flexDirection="column" padding={1}>
    {/* Header Section */}
    <Box
      borderStyle="double"
      borderColor="cyan"
      paddingX={2}
      paddingY={1}
      marginBottom={1}
    >
      <Text bold color="cyan">
        🚀 Ink Visual Testing Dashboard
      </Text>
    </Box>

    {/* Emoji Gallery */}
    <Box marginBottom={1}>
      <Box
        borderStyle="single"
        borderColor="blue"
        paddingX={2}
        paddingY={1}
        marginRight={1}
        width={25}
      >
        <Box flexDirection="column">
          <Text bold color="blue">
            😀 Emoji Gallery
          </Text>
          <Text dimColor>─────────</Text>
          <Text>😀😃😄😁😆😅</Text>
          <Text>🤣😂🙂🙃😉😊</Text>
          <Text>😇🥰😍🤩😘😗</Text>
          <Text>😙🥲😋😛😜🤪</Text>
          <Text>🎨🚀⚡💻✨🔥</Text>
          <Text>🎯📊🌟💡🔧📦</Text>
        </Box>
      </Box>

      {/* Emoji Zoo */}
      <Box
        borderStyle="bold"
        borderColor="magenta"
        paddingX={2}
        paddingY={1}
        width={38}
      >
        <Box flexDirection="column">
          <Text bold color="magenta">
            🦁 Emoji Zoo
          </Text>
          <Text dimColor>──────────────────────────</Text>
          <Text>🐶🐱🐭🐹🐰🦊🐻🐼🐨🐯🦁🐮🐷🐸</Text>
          <Text>🍎🍊🍋🍌🍉🍇🍓🍈🍒🍑🍍🥥🥝🍅</Text>
          <Text>🎨🚀💻🔥💡🎯📊🌟🎪🎭🎬🎸🎮🎲</Text>
        </Box>
      </Box>
    </Box>

    {/* Weather & Nature */}
    <Box>
      <Box
        borderStyle="round"
        borderColor="yellow"
        paddingX={2}
        paddingY={1}
        marginRight={1}
        width={50}
      >
        <Box flexDirection="column">
          <Text bold color="yellow">
            🌍 World & Weather
          </Text>
          <Text dimColor>────────────────────────────────────</Text>
          <Text>🌞🌝🌟🌈🌊🔥💧🌍🌎🌏🌕🌖🌗🌘🌑</Text>
          <Text>🌸🌺🌻🌷🌹🥀💐🌼🍀🍁🍂🍃🌾🌿</Text>
        </Box>
      </Box>

      <Box
        borderStyle="doubleSingle"
        borderColor="cyan"
        paddingX={2}
        paddingY={1}
        width={33}
      >
        <Box flexDirection="column">
          <Text bold color="cyan">
            🎉 Celebrations
          </Text>
          <Text dimColor>──────────────────</Text>
          <Text>🎉🎊🎈🎁🎀🎂🍰🧁🍾🥂🍻</Text>
          <Text>🎄🎃🎆🎇🧨💝💖💗💓💞💕</Text>
        </Box>
      </Box>
    </Box>
  </Box>
);

export default Dashboard;
