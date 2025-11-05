import { useState, useEffect, useCallback } from 'react';
import { getNodeModulesSize } from '../utils/folder-size.js';
import { saveNodeModulesSizes } from '../utils/config-manager.js';

/**
 * Custom hook to manage node_modules scanning and size tracking
 */
export const useNodeModulesScanner = (projects, configSizes, reloadConfig) => {
  const [nodeModulesSizes, setNodeModulesSizes] = useState({});
  const [scanningNodeModules, setScanningNodeModules] = useState(false);
  const [scanProgress, setScanProgress] = useState({ current: 0, total: 0 });

  // Sync config sizes to local state
  useEffect(() => {
    if (configSizes && Object.keys(configSizes).length > 0) {
      setNodeModulesSizes(configSizes);
    }
  }, [configSizes]);

  const scanAllNodeModules = useCallback(async () => {
    if (scanningNodeModules || projects.length === 0) return;

    console.log('Starting node_modules scan for', projects.length, 'projects');
    setScanningNodeModules(true);
    setScanProgress({ current: 0, total: projects.length });

    const newSizes = {};

    try {
      for (let i = 0; i < projects.length; i++) {
        const project = projects[i];
        const startTime = Date.now();

        try {
          const sizeInfo = await getNodeModulesSize(project.path);

          newSizes[project.path] = {
            ...sizeInfo,
            scannedAt: new Date().toISOString()
          };
        } catch (err) {
          newSizes[project.path] = {
            exists: false,
            sizeBytes: 0,
            sizeFormatted: null,
            scannedAt: new Date().toISOString(),
            error: err.message
          };
        }

        setScanProgress({ current: i + 1, total: projects.length });
        setNodeModulesSizes({ ...newSizes });

        const elapsed = Date.now() - startTime;
        if (elapsed < 300) {
          await new Promise(resolve => setTimeout(resolve, 300 - elapsed));
        }
      }

      console.log('Saving', Object.keys(newSizes).length, 'sizes to config');
      await saveNodeModulesSizes(newSizes);
      await reloadConfig();
    } catch (err) {
      console.error('Scan error:', err);
      throw err;
    } finally {
      setScanningNodeModules(false);
      setScanProgress({ current: 0, total: 0 });
    }
  }, [projects, scanningNodeModules, reloadConfig]);

  // Auto-scan on first load if no sizes exist
  useEffect(() => {
    if (projects.length === 0 || scanningNodeModules) return;

    const hasSizes = configSizes && Object.keys(configSizes).length > 0;

    if (!hasSizes && projects.length > 0) {
      console.log('Auto-scanning node_modules on first load...', projects.length, 'projects');
      scanAllNodeModules();
    }
  }, [projects, configSizes, scanningNodeModules, scanAllNodeModules]);

  return {
    nodeModulesSizes,
    setNodeModulesSizes,
    scanningNodeModules,
    scanProgress,
    scanAllNodeModules
  };
};
