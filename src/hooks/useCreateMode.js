import { useState, useEffect } from 'react';
import { createProject } from '../commands/create-project.js';
import { findPackageJsonFiles } from '../commands/project-scanner.js';

/**
 * Custom hook to manage Next.js project creation functionality
 */
export const useCreateMode = (configuration, visibleItems, onRefresh) => {
  const [createMode, setCreateMode] = useState(false);
  const [creating, setCreating] = useState(false);
  const [autoRefreshMode, setAutoRefreshMode] = useState(false);
  const [expectedProjectName, setExpectedProjectName] = useState(null);

  // Auto-refresh projects after creating
  useEffect(() => {
    if (!autoRefreshMode || !expectedProjectName || !configuration?.projectPath) return;

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
          p.projectName.toLowerCase() === expectedProjectName.toLowerCase()
        );

        if (newProjectIndex !== -1) {
          setAutoRefreshMode(false);
          setExpectedProjectName(null);
          if (onRefresh) {
            onRefresh(sortedProjects, newProjectIndex);
          }
        } else if (refreshCount >= maxRefreshes) {
          setAutoRefreshMode(false);
          setExpectedProjectName(null);
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
  }, [autoRefreshMode, expectedProjectName, configuration, visibleItems, onRefresh]);

  const handleCreateSubmit = async (projectType) => {
    setCreateMode(false);
    setCreating(true);

    try {
      const result = await createProject({
        projectType,
        destinationPath: configuration.projectPath
      });

      if (result.interactive) {
        setCreating(false);
        // We don't know the project name ahead of time, so just refresh
        setAutoRefreshMode(true);
        return { type: 'interactive' };
      } else {
        setCreating(false);
        return { type: 'success' };
      }
    } catch (err) {
      setCreating(false);
      throw err;
    }
  };

  const handleCreateCancel = () => {
    setCreateMode(false);
  };

  const openCreateMode = () => {
    setCreateMode(true);
  };

  const cancelAutoRefresh = () => {
    setAutoRefreshMode(false);
    setExpectedProjectName(null);
  };

  return {
    createMode,
    creating,
    autoRefreshMode,
    expectedProjectName,
    handleCreateSubmit,
    handleCreateCancel,
    openCreateMode,
    cancelAutoRefresh
  };
};
