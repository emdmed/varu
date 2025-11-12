import React, { useState } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import { colors } from '../utils/colors';

const HelpScreen = ({ onClose }) => {
  const { green } = colors;
  const { stdout } = useStdout();
  const [scrollOffset, setScrollOffset] = useState(0);

  // Structure keybindings as data for easier manipulation
  const keybindings = [
    { type: 'header', text: 'Navigation:', color: green },
    { type: 'item', text: '  ↑/↓ or j/k  - Move selection up/down' },
    { type: 'item', text: '  gg          - Jump to top' },
    { type: 'item', text: '  G           - Jump to bottom' },
    { type: 'spacer' },

    { type: 'header', text: 'Actions:', color: green },
    { type: 'item', text: '  Enter       - Open project in nvim' },
    { type: 'item', text: '  s           - Start/stop dev server (toggle)' },
    { type: 'item', text: '  I           - Install dependencies (npm install)' },
    { type: 'spacer' },

    { type: 'header', text: 'View:', color: green },
    { type: 'item', text: '  d           - Toggle details view (dd to cleanup)' },
    { type: 'item', text: '  / or i      - Search/filter projects' },
    { type: 'item', text: '  Esc         - Clear search filter' },
    { type: 'spacer' },

    { type: 'header', text: 'Repository:', color: green },
    { type: 'item', text: '  c           - Clone git repository' },
    { type: 'item', text: '  n           - Create new project (Next.js/Vite)' },
    { type: 'item', text: '  r           - Refresh project list' },
    { type: 'spacer' },

    { type: 'header', text: 'Maintenance:', color: green },
    { type: 'item', text: '  m           - Scan all node_modules sizes' },
    { type: 'item', text: '  dd          - Cleanup stale dependencies (30+ days)' },
    { type: 'item', text: '  Shift+D     - Delete current project (with confirmation)' },
    { type: 'spacer' },

    { type: 'header', text: 'System:', color: green },
    { type: 'item', text: '  C           - Configuration settings' },
    { type: 'item', text: '  h           - Show this help screen' },
    { type: 'item', text: '  ?           - Toggle keybindings bar' },
    { type: 'item', text: '  q or Ctrl+C - Quit application' },
  ];

  // Calculate visible height (reserve space for border, padding, footer, and scroll indicators)
  const terminalHeight = stdout.rows || 20;
  const reservedLines = 7; // border (2) + padding (2) + footer (1) + margins (2)
  const visibleHeight = Math.max(5, terminalHeight - reservedLines);

  // Calculate scroll boundaries
  const maxOffset = Math.max(0, keybindings.length - visibleHeight);
  const hasContentAbove = scrollOffset > 0;
  const hasContentBelow = scrollOffset + visibleHeight < keybindings.length;
  const needsScrolling = keybindings.length > visibleHeight;

  // Handle keyboard input for scrolling
  useInput((input, key) => {
    // Up arrow or k - scroll up
    if (key.upArrow || input === 'k') {
      setScrollOffset(prev => Math.max(0, prev - 1));
      return;
    }

    // Down arrow or j - scroll down
    if (key.downArrow || input === 'j') {
      setScrollOffset(prev => Math.min(maxOffset, prev + 1));
      return;
    }

    // Page Up - scroll up by half page
    if (key.pageUp) {
      setScrollOffset(prev => Math.max(0, prev - Math.floor(visibleHeight / 2)));
      return;
    }

    // Page Down - scroll down by half page
    if (key.pageDown) {
      setScrollOffset(prev => Math.min(maxOffset, prev + Math.floor(visibleHeight / 2)));
      return;
    }

    // g - jump to top (simplified without double-tap for now)
    if (input === 'g') {
      setScrollOffset(0);
      return;
    }

    // G - jump to bottom
    if (input === 'G') {
      setScrollOffset(maxOffset);
      return;
    }

    // Escape, q, or h - close help screen
    if (key.escape || input === 'q' || input === 'h') {
      onClose();
      return;
    }
  });

  // Get visible slice of keybindings
  const visibleKeybindings = keybindings.slice(
    scrollOffset,
    scrollOffset + visibleHeight
  );

  return (
    <Box borderStyle="round" borderColor={green} padding={1} flexDirection="column" marginBottom={1}>
      {/* Scroll indicator - content above */}
      {hasContentAbove && (
        <Box marginLeft={1}>
          <Text color={green}>↑ {scrollOffset} more above...</Text>
        </Box>
      )}

      {/* Render visible keybindings */}
      <Box flexDirection="column">
        {visibleKeybindings.map((item, index) => {
          if (item.type === 'header') {
            return <Text key={index} bold color={item.color}>{item.text}</Text>;
          } else if (item.type === 'spacer') {
            return <Text key={index} dimColor />;
          } else {
            return <Text key={index}>{item.text}</Text>;
          }
        })}
      </Box>

      {/* Scroll indicator - content below */}
      {hasContentBelow && (
        <Box marginLeft={1}>
          <Text color={green}>↓ {keybindings.length - (scrollOffset + visibleHeight)} more below...</Text>
        </Box>
      )}

      {/* Footer with instructions */}
      <Box marginTop={1}>
        <Text dimColor>
          {needsScrolling && 'Use ↑/↓ or j/k to scroll • '}
          Press Esc, q, or h to close
        </Text>
      </Box>
    </Box>
  );
};

export default HelpScreen;
