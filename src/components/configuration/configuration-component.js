import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const ConfigurationComponent = ({ onComplete }) => {
  const defaultPath = path.join(os.homedir(), 'projects');
  const configDir = path.join(os.homedir(), '.lazylauncher');
  const configPath = path.join(configDir, 'config.json');

  const [projectPath, setProjectPath] = useState(defaultPath);
  const [status, setStatus] = useState('input');
  const [errorMessage, setErrorMessage] = useState('');
  const { exit } = useApp();

  useEffect(() => {
    const loadExistingConfig = async () => {
      try {
        const configData = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(configData);
        if (config.projectPath) {
          setProjectPath(config.projectPath);
        }
      } catch (err) {
        // Config doesn't exist yet, use default
      }
    };
    loadExistingConfig();
  }, [configPath]);

  const saveConfig = async () => {
    try {
      setStatus('saving');

      await fs.mkdir(configDir, { recursive: true });

      const expandedPath = projectPath.startsWith('~')
        ? path.join(os.homedir(), projectPath.slice(1))
        : projectPath;

      try {
        await fs.access(expandedPath);
      } catch {
        setErrorMessage(`Path does not exist: ${expandedPath}`);
        setStatus('error');
        return;
      }

      // Load existing config to preserve nodeModulesSizes
      let existingConfig = {};
      try {
        const configData = await fs.readFile(configPath, 'utf-8');
        existingConfig = JSON.parse(configData);
      } catch {
        // Config doesn't exist yet, that's fine
      }

      const config = {
        ...existingConfig, // Preserve existing data like nodeModulesSizes
        projectPath: expandedPath,
        updatedAt: new Date().toISOString()
      };

      await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');

      setStatus('success');

      setTimeout(() => {
        if (onComplete) {
          onComplete(config);
        } else {
          exit();
        }
      }, 1000);

    } catch (err) {
      setErrorMessage(err.message);
      setStatus('error');
    }
  };

  useInput((input, key) => {
    if (status === 'input') {
      if (key.return) {
        saveConfig();
      } else if (key.backspace || key.delete) {
        setProjectPath(prev => prev.slice(0, -1));
      } else if (key.ctrl && input === 'c') {
        exit();
      } else if (key.ctrl && input === 'u') {
        setProjectPath('');
      } else if (!key.ctrl && !key.meta && input) {
        setProjectPath(prev => prev + input);
      }
    }
    if (status === 'error' && key.return) {
      setStatus('input');
      setErrorMessage('');
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          🚀 LazyLauncher Configuration
        </Text>
      </Box>

      {status === 'input' && (
        <>
          <Box marginBottom={1}>
            <Text>Enter the path to your projects folder:</Text>
          </Box>
          <Box marginBottom={1}>
            <Text color="gray">Default: {defaultPath}</Text>
          </Box>
          <Box marginBottom={1}>
            <Text bold>Path: </Text>
            <Text color="cyan">{projectPath}</Text>
            <Text color="green">█</Text>
          </Box>
          <Box marginBottom={1}>
            <Text color="green">
              Press <Text bold>Enter</Text> to save
            </Text>
          </Box>
          <Box>
            <Text color="gray" dimColor>
              Tip: Ctrl+U to clear, Ctrl+C to exit
            </Text>
          </Box>
        </>
      )}

      {status === 'saving' && (
        <Box>
          <Text color="yellow">💾 Saving configuration...</Text>
        </Box>
      )}

      {status === 'success' && (
        <Box flexDirection="column">
          <Text color="green">✓ Configuration saved successfully!</Text>
          <Box marginTop={1}>
            <Text>
              Project path: <Text bold color="cyan">{projectPath}</Text>
            </Text>
          </Box>
          <Box marginTop={1}>
            <Text color="gray">Config saved to: {configPath}</Text>
          </Box>
        </Box>
      )}

      {status === 'error' && (
        <Box flexDirection="column">
          <Text color="red">✗ Error: {errorMessage}</Text>
          <Box marginTop={1}>
            <Text color="yellow">
              Press <Text bold>Enter</Text> to try again
            </Text>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default ConfigurationComponent;
