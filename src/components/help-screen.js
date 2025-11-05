import React from 'react';
import { Box, Text } from 'ink';

const HelpScreen = () => {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box marginBottom={1}>
        <Text bold underline color="cyan">Keyboard Shortcuts</Text>
      </Box>

      <Box flexDirection="column">
        <Text bold color="yellow">Navigation:</Text>
        <Text>  ↑/↓ or j/k  - Move selection up/down</Text>
        <Text>  gg          - Jump to top</Text>
        <Text>  G           - Jump to bottom</Text>
        <Text dimColor/>

        <Text bold color="yellow">Actions:</Text>
        <Text>  Enter       - Open project in nvim</Text>
        <Text>  s           - Start/stop dev server (toggle)</Text>
        <Text>  I           - Install dependencies (npm install)</Text>
        <Text dimColor/>

        <Text bold color="yellow">View:</Text>
        <Text>  d           - Toggle details view (dd to cleanup)</Text>
        <Text>  / or i      - Search/filter projects</Text>
        <Text>  Esc         - Clear search filter</Text>
        <Text dimColor/>

        <Text bold color="yellow">Repository:</Text>
        <Text>  c           - Clone git repository</Text>
        <Text>  r           - Refresh project list</Text>
        <Text dimColor/>

        <Text bold color="yellow">Maintenance:</Text>
        <Text>  m           - Scan all node_modules sizes</Text>
        <Text>  dd          - Cleanup stale dependencies (30+ days)</Text>
        <Text dimColor/>

        <Text bold color="yellow">System:</Text>
        <Text>  C           - Configuration settings</Text>
        <Text>  ?           - Show this help screen</Text>
        <Text>  q or Ctrl+C - Quit application</Text>
      </Box>

      <Box marginTop={1}>
        <Text dimColor>Press any key to close this help screen</Text>
      </Box>
    </Box>
  );
};

export default HelpScreen;
