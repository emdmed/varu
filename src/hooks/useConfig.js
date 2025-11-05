import { useState, useEffect, useCallback } from 'react';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const useConfig = () => {
  const [configuration, setConfiguration] = useState(null);
  const [isConfig, setIsConfig] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [nodeModulesSizes, setNodeModulesSizes] = useState({});
  const [projectLastStarted, setProjectLastStarted] = useState({});

  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);

      const configPath = path.join(os.homedir(), '.lazylauncher', 'config.json');

      const configData = await fs.readFile(configPath, 'utf-8');
      const data = JSON.parse(configData);

      setConfiguration(data);
      setNodeModulesSizes(data.nodeModulesSizes || {});
      setProjectLastStarted(data.projectLastStarted || {});
      setIsConfig(true);
    } catch (err) {
      console.error('Failed to load config:', err);
      setIsConfig(false);
      setConfiguration(null);
      setNodeModulesSizes({});
      setProjectLastStarted({});
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const reloadConfig = useCallback(async () => {
    await loadConfig();
  }, [loadConfig]);

  return {
    configuration,
    isConfig,
    loading,
    error,
    nodeModulesSizes,
    projectLastStarted,
    reloadConfig
  };
};

export default useConfig;
