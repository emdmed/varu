import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { colors } from '../../utils/colors.js';

const CreateProjectInput = ({ onSubmit, onCancel }) => {
  const { green } = colors
  const [selectedOption, setSelectedOption] = useState(0);

  const options = [
    { key: 'nextjs', label: 'Next.js with shadcn/ui', command: 'npx shadcn@latest init' },
    { key: 'vite', label: 'Vite', command: 'npm create vite@latest' }
  ];

  useInput((input, key) => {
    if (key.return) {
      onSubmit(options[selectedOption].key);
    } else if (key.escape) {
      onCancel();
    } else if (key.upArrow || input === 'k') {
      setSelectedOption(prev => Math.max(0, prev - 1));
    } else if (key.downArrow || input === 'j') {
      setSelectedOption(prev => Math.min(options.length - 1, prev + 1));
    }
  });

  return (
    <Box borderDimColor borderColor={green} borderStyle="round" flexDirection="column" marginBottom={1} paddingX={1}>
      <Box marginBottom={1}>
        <Text bold color={green}>Create new project - Select framework:</Text>
      </Box>

      {options.map((option, index) => (
        <Box key={option.key}>
          <Text color={green}>
            {selectedOption === index ? '▶ ' : '  '}
            {option.label}
            <Text dimColor> ({option.command})</Text>
          </Text>
        </Box>
      ))}

      <Box marginTop={1}>
        <Text color={green} dimColor>↑/↓ or j/k to select, Enter to confirm, Esc to cancel</Text>
      </Box>
    </Box>
  );
};

export default CreateProjectInput;
