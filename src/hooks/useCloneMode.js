import { useState, useEffect } from 'react';
import { cloneRepository } from '../commands/clone-repo.js';
import { findPackageJsonFiles } from '../commands/project-scanner.js';

/**
 * Custom hook to manage repository cloning functionality
 */
export const useCloneMode = (configuration, visibleItems, onRefresh) => {
  const [cloneMode, setCloneMode] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [autoRefreshMode, setAutoRefreshMode] = useState(false);
  const [expectedRepoName, setExpectedRepoName] = useState(null);

  // Auto-refresh projects after cloning
  useEffect(() => {
    if (!autoRefreshMode || !expectedRepoName || !configuration?.projectPath) return;

    let refreshCount = 0;
    const maxRefreshes = 12;

    const refreshProjects = async () => {
      refreshCount++;

      try {
        const foundProjects = await findPackageJsonFiles(configuration.projectPath);
        const sortedProjects = foundProjects.sort((a, b) =>
          a.projectName.localeCompare(b.projectName, undefined, { sensitivity: 'base' })
        );

        const newProjectIndex = sortedProjects.findIndex(p =>
          p.projectName.toLowerCase() === expectedRepoName.toLowerCase()
        );

        if (newProjectIndex !== -1) {
          setAutoRefreshMode(false);
          setExpectedRepoName(null);
          if (onRefresh) {
            onRefresh(sortedProjects, newProjectIndex);
          }
        } else if (refreshCount >= maxRefreshes) {
          setAutoRefreshMode(false);
          setExpectedRepoName(null);
          if (onRefresh) {
            onRefresh(sortedProjects, -1);
          }
        } else {
          if (onRefresh) {
            onRefresh(sortedProjects, -1);
          }
        }
      } catch (err) {
        // Silently fail and try again
      }
    };

    const interval = setInterval(refreshProjects, 10000);
    const initialTimeout = setTimeout(refreshProjects, 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(initialTimeout);
    };
  }, [autoRefreshMode, expectedRepoName, configuration, visibleItems, onRefresh]);

  const handleCloneSubmit = async (url) => {
    setCloneMode(false);
    setCloning(true);

    try {
      const result = await cloneRepository({
        url,
        destinationPath: configuration.projectPath
      });

      if (result.interactive) {
        setCloning(false);
        setExpectedRepoName(result.repoName);
        setAutoRefreshMode(true);
        return { type: 'interactive', repoName: result.repoName };
      } else {
        setCloning(false);
        return { type: 'success', repoName: result.repoName };
      }
    } catch (err) {
      setCloning(false);
      throw err;
    }
  };

  const handleCloneCancel = () => {
    setCloneMode(false);
  };

  const openCloneMode = () => {
    setCloneMode(true);
  };

  const cancelAutoRefresh = () => {
    setAutoRefreshMode(false);
    setExpectedRepoName(null);
  };

  return {
    cloneMode,
    cloning,
    autoRefreshMode,
    expectedRepoName,
    handleCloneSubmit,
    handleCloneCancel,
    openCloneMode,
    cancelAutoRefresh
  };
};
