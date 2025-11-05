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
  const [pathExists, setPathExists] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
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
      }
    };
    loadExistingConfig();
  }, [configPath]);

  useEffect(() => {
    const validatePath = async () => {
      if (!projectPath || status !== 'input') {
        setPathExists(null);
        return;
      }

      setIsValidating(true);
      const expandedPath = projectPath.startsWith('~')
        ? path.join(os.homedir(), projectPath.slice(1))
        : projectPath;

      try {
        await fs.access(expandedPath);
        const stats = await fs.stat(expandedPath);
        setPathExists(stats.isDirectory());
      } catch {
        setPathExists(false);
      } finally {
        setIsValidating(false);
      }
    };

    const timeoutId = setTimeout(validatePath, 300); // Debounce
    return () => clearTimeout(timeoutId);
  }, [projectPath, status]);

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

      let existingConfig = {};
      try {
        const configData = await fs.readFile(configPath, 'utf-8');
        existingConfig = JSON.parse(configData);
      } catch {
      }

      const config = {
        ...existingConfig,
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
        if (pathExists === false) {
          setErrorMessage('Path does not exist or is not a directory');
          setStatus('error');
        } else {
          saveConfig();
        }
      } else if (key.backspace || key.delete) {
        setProjectPath(prev => prev.slice(0, -1));
      } else if (key.ctrl && input === 'c') {
        exit();
      } else if (key.ctrl && input === 'u') {
        setProjectPath('');
      } else if (key.ctrl && input === 'w') {
        // Delete last word
        setProjectPath(prev => {
          const lastSlash = prev.lastIndexOf('/');
          return lastSlash > 0 ? prev.slice(0, lastSlash) : '';
        });
      } else if (key.escape) {
        setProjectPath(defaultPath);
      } else if (!key.ctrl && !key.meta && input) {
        // Support paste (multiple characters at once)
        setProjectPath(prev => prev + input);
      }
    }
    if (status === 'error') {
      if (key.return) {
        setStatus('input');
        setErrorMessage('');
      } else if (key.escape) {
        setProjectPath(defaultPath);
        setStatus('input');
        setErrorMessage('');
      }
    }
  });

  const getPathIndicator = () => {
    if (isValidating) {
      return <Text color="yellow">⏳ Validating...</Text>;
    }
    if (pathExists === true) {
      return <Text color="green">✓ Directory exists</Text>;
    }
    if (pathExists === false) {
      return <Text color="red">✗ Path not found</Text>;
    }
    return null;
  };

  return (
    <Box flexDirection="column" padding={1}>
      {status === 'input' && (
        <>
          <Box marginBottom={1} paddingX={1} borderStyle="round" >
            <Text >
              Configure your projects directory to get started
            </Text>
          </Box>

          <Box marginBottom={1}>
            <Text >
              Default location: <Text >{defaultPath}</Text>
            </Text>
          </Box>

          {/* Input field with border */}
          <Box
            flexDirection="column"
            borderStyle="round"
            borderColor={pathExists === false ? "red" : (pathExists === true ? "green" : "cyan")}
            paddingX={1}
            marginBottom={1}
          >
            <Box marginBottom={0}>
              <Text bold >Projects Path</Text>
            </Box>
            <Box>
              <Text color={pathExists === false ? "red" : "white"}>{projectPath}</Text>
              <Text color="green">█</Text>
            </Box>
          </Box>

          {getPathIndicator() && (
            <Box marginBottom={1} paddingLeft={1}>
              {getPathIndicator()}
            </Box>
          )}

          {/* Keyboard shortcuts - organized in a box */}
          <Box flexDirection="column" borderStyle="round" borderColor="gray" paddingX={1} marginBottom={0}>
            <Box marginBottom={0}>
              <Text bold color="white">Keyboard Shortcuts</Text>
            </Box>
            <Box justifyContent="space-between">
              <Box width="50%">
                <Text>• </Text>
                <Text bold>Enter</Text>
                <Text> - Save configuration</Text>
              </Box>
              <Box width="50%">
                <Text>• </Text>
                <Text bold>Ctrl+C</Text>
                <Text> - Exit</Text>
              </Box>
            </Box>
            <Box justifyContent="space-between">
              <Box width="50%">
                <Text >• </Text>
                <Text bold>Ctrl+U</Text>
                <Text > - Clear all</Text>
              </Box>
              <Box width="50%">
                <Text>• </Text>
                <Text bold>Ctrl+W</Text>
                <Text> - Delete word</Text>
              </Box>
            </Box>
            <Box>
              <Text>• </Text>
              <Text bold>Esc</Text>
              <Text> - Reset to default</Text>
            </Box>
          </Box>
        </>
      )}

      {status === 'saving' && (
        <Box flexDirection="column" borderStyle="round" borderColor="yellow" paddingX={1}>
          <Text color="yellow">💾 Saving configuration...</Text>
          <Box marginTop={1}>
            <Text>Writing to: {configPath}</Text>
          </Box>
        </Box>
      )}

      {status === 'success' && (
        <Box flexDirection="column" borderStyle="round" borderColor="green" paddingX={1}>
          <Box marginBottom={1}>
            <Text color="green" bold>✓ Configuration saved successfully!</Text>
          </Box>
          <Box marginBottom={1}>
            <Text >Projects directory: </Text>
            <Text bold color="cyan">{projectPath}</Text>
          </Box>
          <Box>
            <Text >
              Configuration file: {configPath}
            </Text>
          </Box>
        </Box>
      )}

      {status === 'error' && (
        <Box flexDirection="column" borderStyle="round" borderColor="red" paddingX={1}>
          <Box marginBottom={1}>
            <Text color="red" bold>✗ Error</Text>
          </Box>
          <Box marginBottom={1}>
            <Text color="red">{errorMessage}</Text>
          </Box>
          <Box>
            <Text color="yellow">
              Press <Text bold>Enter</Text> to try again or <Text bold>Esc</Text> to reset
            </Text>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default ConfigurationComponent;
