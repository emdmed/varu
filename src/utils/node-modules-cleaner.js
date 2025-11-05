import { rm } from 'fs/promises';
import { join } from 'path';

export const deleteNodeModules = async (projectPath) => {
  const nodeModulesPath = join(projectPath, 'node_modules');

  try {
    await rm(nodeModulesPath, { recursive: true, force: true });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

export const getStaleProjects = (projects, nodeModulesSizes, projectLastStarted, runningProcesses) => {
  const now = new Date();
  const oneMonthAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

  return projects.filter(project => {
    const modulesInfo = nodeModulesSizes[project.path];
    if (!modulesInfo || !modulesInfo.exists) {
      return false;
    }

    const processInfo = runningProcesses[project.path];
    if (processInfo && processInfo.hasDevServer) {
      return false;
    }

    if (!projectLastStarted || !projectLastStarted[project.path]) {
      return false;
    }

    const lastStartedDate = new Date(projectLastStarted[project.path]);
    return lastStartedDate < oneMonthAgo;
  });
};

export const formatBytes = (bytes) => {
  if (bytes === 0) return '0 GB';

  const gb = bytes / (1024 ** 3);

  if (gb < 0.01) {
    const mb = bytes / (1024 ** 2);
    return `${mb.toFixed(0)} MB`;
  }

  return `${gb.toFixed(2)} GB`;
};
