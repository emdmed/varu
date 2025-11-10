import React from 'react';
import { Box, Text } from 'ink';
import { colors } from '../utils/colors.js';

const PortsSection = ({ usedPorts, projects, runningProcesses }) => {
  const { green, amber } = colors;

  // Don't show if no ports
  if (!usedPorts || usedPorts.length === 0) {
    return null;
  }

  // Try to match ports to projects based on running processes
  const getProjectForPort = (port) => {
    // Common port patterns for dev servers
    const commonPorts = {
      3000: 'Next.js/React',
      3001: 'Alt React',
      4200: 'Angular',
      5173: 'Vite',
      8080: 'Generic',
      8000: 'Python/Django',
      5000: 'Flask/Generic'
    };

    // Check if any project with a running dev server might be using this port
    const runningProject = projects.find(project => {
      const processInfo = runningProcesses[project.path];
      return processInfo && processInfo.hasDevServer;
    });

    if (runningProject) {
      return runningProject.projectName;
    }

    return commonPorts[port] || 'Unknown';
  };

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box>
        <Text bold color={green}>Used Ports: </Text>
        <Text color={green}>
          {usedPorts.map((port, index) => {
            const projectName = getProjectForPort(port);
            const isKnownProject = projects.some(p => p.projectName === projectName);

            return (
              <Text key={port}>
                {index > 0 && ' • '}
                <Text color={amber}>{port}</Text>
                <Text dimColor> ({isKnownProject ? projectName : projectName})</Text>
              </Text>
            );
          })}
        </Text>
      </Box>
    </Box>
  );
};

export default PortsSection;
