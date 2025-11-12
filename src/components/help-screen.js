import React from 'react';
import { Box, Text } from 'ink';
import { colors } from '../utils/colors';

const HelpScreen = () => {
  const { green } = colors
  return (
    <Box borderStyle="round" borderColor={green} padding={1} flexDirection="column" marginBottom={1}>
      <Box flexDirection="column">
        <Text bold color={green}>Navigation:</Text>
        <Text>  ↑/↓ or j/k  - Move selection up/down</Text>
        <Text>  gg          - Jump to top</Text>
        <Text>  G           - Jump to bottom</Text>
        <Text dimColor />

        <Text bold color={green}>Actions:</Text>
        <Text>  Enter       - Open project in nvim</Text>
        <Text>  s           - Start/stop dev server (toggle)</Text>
        <Text>  I           - Install dependencies (npm install)</Text>
        <Text dimColor />

        <Text bold color={green}>View:</Text>
        <Text>  d           - Toggle details view (dd to cleanup)</Text>
        <Text>  / or i      - Search/filter projects</Text>
        <Text>  Esc         - Clear search filter</Text>
        <Text dimColor />

        <Text bold color={green}>Repository:</Text>
        <Text>  c           - Clone git repository</Text>
        <Text>  n           - Create new project (Next.js/Vite)</Text>
        <Text>  r           - Refresh project list</Text>
        <Text dimColor />

        <Text bold color={green}>Maintenance:</Text>
        <Text>  m           - Scan all node_modules sizes</Text>
        <Text>  dd          - Cleanup stale dependencies (30+ days)</Text>
        <Text dimColor />

        <Text bold color={green}>System:</Text>
        <Text>  C           - Configuration settings</Text>
        <Text>  h           - Show this help screen</Text>
        <Text>  ?           - Toggle keybindings bar</Text>
        <Text>  q or Ctrl+C - Quit application</Text>
      </Box>

      <Box marginTop={1}>
        <Text dimColor>Press any key to close this help screen</Text>
      </Box>
    </Box>
  );
};

export default HelpScreen;
