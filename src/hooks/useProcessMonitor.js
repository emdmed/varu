import { useState, useEffect } from 'react';
import { getTerminalsInPath } from '../commands/process-monitor.js';

/**
 * Custom hook to monitor running processes for projects
 */
export const useProcessMonitor = (projects) => {
  const [runningProcesses, setRunningProcesses] = useState({});
  const [checkedProjects, setCheckedProjects] = useState(new Set());
  const [isInitialScan, setIsInitialScan] = useState(true);

  useEffect(() => {
    if (projects.length === 0) return;

    // Reset state for new project list
    setCheckedProjects(new Set());
    setIsInitialScan(true);

    let currentIndex = 0;
    let isActive = true;
    const checked = new Set();

    const checkNextProject = async () => {
      if (!isActive || projects.length === 0) return;

      const project = projects[currentIndex];
      try {
        const terminals = await getTerminalsInPath(project.path);

        if (terminals.length > 0 && isActive) {
          setRunningProcesses(prev => ({
            ...prev,
            [project.path]: {
              hasDevServer: terminals.some(t =>
                t.command.includes('npm run dev') ||
                t.command.includes('npm start') ||
                t.command.includes('yarn dev') ||
                t.command.includes('pnpm dev')
              ),
              hasEditor: terminals.some(t =>
                t.command.includes('nvim') ||
                t.command.includes('vim')
              ),
              count: terminals.length
            }
          }));
        } else if (isActive) {
          setRunningProcesses(prev => {
            const newState = { ...prev };
            delete newState[project.path];
            return newState;
          });
        }
      } catch (err) {
        // Silently fail for individual project checks
      }

      // Mark this project as checked
      checked.add(project.path);
      setCheckedProjects(new Set(checked));

      // Check if initial scan is complete
      if (checked.size === projects.length && isInitialScan) {
        setIsInitialScan(false);
      }

      currentIndex = (currentIndex + 1) % projects.length;
    };

    const interval = setInterval(checkNextProject, 500);
    checkNextProject();

    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, [projects]);

  return {
    runningProcesses,
    setRunningProcesses,
    checkedProjects,
    isInitialScan
  };
};
