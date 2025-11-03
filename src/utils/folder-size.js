import { stat } from 'fs/promises';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Calculate the size of a folder using du command (fast)
 * @param {string} folderPath - Path to the folder
 * @returns {Promise<number>} - Size in bytes
 */
export const getFolderSize = async (folderPath) => {
  try {
    // Use du command which is much faster than recursive scanning
    // -sb: summarize, show in bytes
    // Timeout after 5 seconds to prevent hanging
    const { stdout } = await execAsync(`du -sb "${folderPath}" 2>/dev/null`, {
      timeout: 5000,
      maxBuffer: 1024 * 1024 // 1MB buffer
    });

    // Parse output: "12345678    /path/to/folder"
    const sizeMatch = stdout.match(/^(\d+)/);
    if (sizeMatch) {
      return parseInt(sizeMatch[1], 10);
    }

    return 0;
  } catch (err) {
    // If du fails or times out, return 0
    return 0;
  }
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
