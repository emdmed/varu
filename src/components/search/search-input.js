import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { colors } from '../../utils/colors';

const SearchInput = ({ onSubmit, onCancel, onChange, initialValue = '' }) => {
  const [value, setValue] = useState(initialValue);
  const { green } = colors

  useInput((input, key) => {
    if (key.return) {
      onSubmit(value);
    } else if (key.escape) {
      onCancel();
    } else if (key.backspace || key.delete) {
      setValue(prev => {
        const newValue = prev.slice(0, -1);
        onChange?.(newValue);
        return newValue;
      });
    } else if (!key.ctrl && !key.meta && input) {
      // Only add printable characters
      setValue(prev => {
        const newValue = prev + input;
        onChange?.(newValue);
        return newValue;
      });
    }
  });

  return (
    <Box borderStyle="round" borderColor={green} flexDirection="column" marginBottom={1} paddingX={1}>
      <Box>
        <Text color={green}>Filter:{" "}</Text>
        <Text color={green}>{value}</Text>
        <Text color={green}>█</Text>
      </Box>
      <Box marginTop={0}>
        <Text dimColor>Esc to cancel</Text>
      </Box>
    </Box>
  );
};

export default SearchInput;
