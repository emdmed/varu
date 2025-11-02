import { useState, useEffect } from 'react';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const useConfig = () => {
  const [configuration, setConfiguration] = useState(null);
  const [isConfig, setIsConfig] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        setLoading(true);

        const configPath = path.join(os.homedir(), '.lazylauncher', 'config.json');

        const configData = await fs.readFile(configPath, 'utf-8');
        const data = JSON.parse(configData);

        setConfiguration(data);
        setIsConfig(true);
      } catch (err) {
        console.error('Failed to load config:', err);
        setIsConfig(false);
        setConfiguration(null);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, []);

  return { configuration, isConfig, loading, error };
};

export default useConfig;
