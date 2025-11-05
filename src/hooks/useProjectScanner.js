import { useState, useEffect } from 'react';
import { findPackageJsonFiles } from '../commands/project-scanner.js';

/**
 * Custom hook to manage project scanning and filtering
 */
export const useProjectScanner = (configuration, isConfig) => {
  const [projects, setProjects] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);

  // Scan for projects when configuration changes
  useEffect(() => {
    if (isConfig && configuration?.projectPath) {
      setScanning(true);
      setError(null);
      findPackageJsonFiles(configuration.projectPath)
        .then((foundProjects) => {
          const sortedProjects = foundProjects.sort((a, b) =>
            a.projectName.localeCompare(b.projectName, undefined, { sensitivity: 'base' })
          );
          setProjects(sortedProjects);
          if (sortedProjects.length === 0) {
            setError('No projects found in the configured directory');
          }
        })
        .catch((err) => {
          setError(`Error scanning projects: ${err.message}`);
        })
        .finally(() => setScanning(false));
    }
  }, [isConfig, configuration]);

  const rescanProjects = async () => {
    if (!configuration?.projectPath) return;

    setScanning(true);
    try {
      const foundProjects = await findPackageJsonFiles(configuration.projectPath);
      const sortedProjects = foundProjects.sort((a, b) =>
        a.projectName.localeCompare(b.projectName, undefined, { sensitivity: 'base' })
      );
      setProjects(sortedProjects);
      return sortedProjects;
    } catch (err) {
      setError(`Error scanning projects: ${err.message}`);
      throw err;
    } finally {
      setScanning(false);
    }
  };

  return {
    projects,
    setProjects,
    scanning,
    setScanning,
    error,
    setError,
    rescanProjects
  };
};
