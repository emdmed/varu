import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

const CloneInput = ({ onSubmit, onCancel, initialValue = '' }) => {
  const [value, setValue] = useState(initialValue);

  useInput((input, key) => {
    if (key.return) {
      if (value.trim()) {
        onSubmit(value.trim());
      }
    } else if (key.escape) {
      onCancel();
    } else if (key.backspace || key.delete) {
      setValue(prev => prev.slice(0, -1));
    } else if (!key.ctrl && !key.meta && input) {
      // Only add printable characters
      setValue(prev => prev + input);
    }
  });

  return (
    <Box borderDimColor borderStyle="classic" flexDirection="column" marginBottom={1} paddingX={1}>
      <Box>
        <Text color="cyan">Clone Git URL:{" "}</Text>
        <Text>{value}</Text>
        <Text>█</Text>
      </Box>
      <Box marginTop={0}>
        <Text dimColor>Paste the git URL (https or ssh) and press Enter. Esc to cancel</Text>
      </Box>
    </Box>
  );
};

export default CloneInput;
