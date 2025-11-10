import React from 'react';
import { Box, Text, useInput } from 'ink';
import { colors } from '../../utils/colors';

const CleanupConfirm = ({ staleProjects, totalSize, onConfirm, onCancel }) => {
  useInput((input, key) => {
    // If no stale projects, any key dismisses the message
    if (staleProjects.length === 0) {
      onCancel();
      return;
    }

    if (input === 'y' || input === 'Y') {
      onConfirm();
    } else if (input === 'n' || input === 'N' || key.escape) {
      onCancel();
    }
  });

  const { green } = colors

  if (staleProjects.length === 0) {
    return (
      <Box marginBottom={1}>
        <Text color={green}>✓ No stale dependencies found! </Text>
        <Text dimColor>(press any key)</Text>
      </Box>
    );
  }

  return (
    <Box marginBottom={1}>
      <Text color={green}>
        Delete node_modules from <Text bold color="yellow">{staleProjects.length}</Text> stale project{staleProjects.length > 1 ? 's' : ''} ({totalSize})? <Text bold color="green">[Y]es</Text> / <Text bold color="red">[N]o</Text>
      </Text>
    </Box>
  );
};

export default CleanupConfirm;
