import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

const SearchInput = ({ onSubmit, onCancel, initialValue = '' }) => {
  const [value, setValue] = useState(initialValue);

  useInput((input, key) => {
    if (key.return) {
      onSubmit(value);
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
    <Box flexDirection="column" marginBottom={1} paddingX={1}>
      <Box>
        <Text>Filter:{" "}</Text>
        <Text>{value}</Text>
        <Text>█</Text>
      </Box>
      <Box marginTop={0}>
        <Text dimColor>Press Enter to search, Esc to cancel</Text>
      </Box>
    </Box>
  );
};

export default SearchInput;
