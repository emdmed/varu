import React from 'react';
import { Box, Text, useInput } from 'ink';

const CleanupConfirm = ({ staleProjects, totalSize, onConfirm, onCancel }) => {
  useInput((input, key) => {
    if (input === 'y' || input === 'Y') {
      onConfirm();
    } else if (input === 'n' || input === 'N' || key.escape) {
      onCancel();
    }
  });

  if (staleProjects.length === 0) {
    return (
      <Box marginBottom={1}>
        <Text color="green">✓ No stale dependencies found!</Text>
      </Box>
    );
  }

  return (
    <Box marginBottom={1}>
      <Text>
        Delete node_modules from <Text bold color="yellow">{staleProjects.length}</Text> stale project{staleProjects.length > 1 ? 's' : ''} ({totalSize})? <Text bold color="green">[Y]es</Text> / <Text bold color="red">[N]o</Text>
      </Text>
    </Box>
  );
};

export default CleanupConfirm;
