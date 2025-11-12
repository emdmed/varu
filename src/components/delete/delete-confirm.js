import React from 'react';
import { Box, Text, useInput } from 'ink';
import { colors } from '../../utils/colors';

const DeleteConfirm = ({ project, onConfirm, onCancel }) => {
  useInput((input, key) => {
    if (input === 'y' || input === 'Y') {
      onConfirm();
    } else if (input === 'n' || input === 'N' || key.escape) {
      onCancel();
    }
  });

  const { red, yellow, green } = colors;

  return (
    <Box borderColor={red} padding={1} borderStyle="round" flexDirection="column" marginBottom={1}>
      <Box marginBottom={1}>
        <Text color={red} bold>⚠ Delete Project?</Text>
      </Box>
      <Box marginBottom={1}>
        <Text color={green}>
          Name: <Text bold color={yellow}>{project.projectName}</Text>
        </Text>
      </Box>
      <Box marginBottom={1}>
        <Text colors={red} dimColor>Path: {project.path}</Text>
      </Box>
      <Box>
        <Text color={green}>
          This will permanently delete the entire project folder. <Text bold color={red}>[Y]es</Text> / <Text bold color={green}>[N]o</Text>
        </Text>
      </Box>
    </Box>
  );
};

export default DeleteConfirm;
