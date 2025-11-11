import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { colors } from '../../utils/colors';

const CloneInput = ({ onSubmit, onCancel, initialValue = '' }) => {
  const [value, setValue] = useState(initialValue);
  const { green } = colors

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
    <Box borderDimColor borderColor={green} borderStyle="classic" flexDirection="column" marginBottom={1} paddingX={1}>
      <Box>
        <Text color={green}>Clone Git URL:{" "}</Text>
        <Text color={green}>{value}</Text>
        <Text color={green}>█</Text>
      </Box>
      <Box marginTop={0}>
        <Text color={green} dimColor>Paste the git URL (https or ssh) and press Enter. Esc to cancel</Text>
      </Box>
    </Box>
  );
};

export default CloneInput;
