import { readdir, stat } from 'fs/promises';
import { join } from 'path';

/**
 * Calculate the size of a folder in bytes
 * @param {string} folderPath - Path to the folder
 * @returns {Promise<number>} - Size in bytes
 */
export const getFolderSize = async (folderPath) => {
  let totalSize = 0;

  try {
    const items = await readdir(folderPath, { withFileTypes: true });

    for (const item of items) {
      const itemPath = join(folderPath, item.name);

      try {
        if (item.isDirectory()) {
          totalSize += await getFolderSize(itemPath);
        } else if (item.isFile()) {
          const stats = await stat(itemPath);
          totalSize += stats.size;
        }
      } catch (err) {
        // Skip items we can't access (permissions, etc.)
        continue;
      }
    }
  } catch (err) {
    // If we can't read the directory, return 0
    return 0;
  }

  return totalSize;
};

/**
 * Convert bytes to GB with formatting
 * @param {number} bytes - Size in bytes
 * @returns {string} - Formatted size string (e.g., "1.23 GB")
 */
export const formatBytes = (bytes) => {
  if (bytes === 0) return '0 GB';

  const gb = bytes / (1024 ** 3);

  if (gb < 0.01) {
    const mb = bytes / (1024 ** 2);
    return `${mb.toFixed(0)} MB`;
  }

  return `${gb.toFixed(2)} GB`;
};

/**
 * Check if node_modules exists and get its size
 * @param {string} projectPath - Path to the project
 * @returns {Promise<Object>} - Object with exists flag and size info
 */
export const getNodeModulesSize = async (projectPath) => {
  const nodeModulesPath = join(projectPath, 'node_modules');

  try {
    const stats = await stat(nodeModulesPath);

    if (!stats.isDirectory()) {
      return { exists: false, sizeBytes: 0, sizeFormatted: null };
    }

    const sizeBytes = await getFolderSize(nodeModulesPath);

    return {
      exists: true,
      sizeBytes,
      sizeFormatted: formatBytes(sizeBytes)
    };
  } catch (err) {
    // node_modules doesn't exist or can't be accessed
    return { exists: false, sizeBytes: 0, sizeFormatted: null };
  }
};
