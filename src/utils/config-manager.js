import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const CONFIG_DIR = path.join(os.homedir(), '.lazylauncher');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');

/**
 * Load the entire config file
 * @returns {Promise<Object>} - Config object
 */
export const loadConfig = async () => {
  try {
    const configData = await fs.readFile(CONFIG_PATH, 'utf-8');
    return JSON.parse(configData);
  } catch (err) {
    throw new Error('Failed to load config');
  }
};

/**
 * Load node_modules sizes from config
 * @returns {Promise<Object>} - Object with project paths as keys and size info as values
 */
export const loadNodeModulesSizes = async () => {
  try {
    const config = await loadConfig();
    return config.nodeModulesSizes || {};
  } catch (err) {
    return {};
  }
};

/**
 * Save node_modules sizes to config
 * @param {Object} sizes - Object with project paths as keys and size info as values
 * @returns {Promise<void>}
 */
export const saveNodeModulesSizes = async (sizes) => {
  try {
    await fs.mkdir(CONFIG_DIR, { recursive: true });

    // Load existing config
    let config = {};
    try {
      config = await loadConfig();
    } catch (err) {
      // Config doesn't exist, will create new one
    }

    // Update nodeModulesSizes
    config.nodeModulesSizes = sizes;
    config.nodeModulesSizesUpdatedAt = new Date().toISOString();

    // Write back to file
    await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
  } catch (err) {
    throw new Error(`Failed to save node_modules sizes: ${err.message}`);
  }
};

/**
 * Update a single project's size in config
 * @param {string} projectPath - Path to the project
 * @param {Object} sizeInfo - Size information object
 * @returns {Promise<void>}
 */
export const updateProjectSize = async (projectPath, sizeInfo) => {
  try {
    const sizes = await loadNodeModulesSizes();
    sizes[projectPath] = {
      ...sizeInfo,
      scannedAt: new Date().toISOString()
    };
    await saveNodeModulesSizes(sizes);
  } catch (err) {
    throw new Error(`Failed to update project size: ${err.message}`);
  }
};

/**
 * Save project last started timestamp
 * @param {string} projectPath - Path to the project
 * @param {string} timestamp - ISO timestamp string
 * @returns {Promise<void>}
 */
export const saveProjectLastStarted = async (projectPath, timestamp) => {
  try {
    await fs.mkdir(CONFIG_DIR, { recursive: true });

    let config = {};
    try {
      config = await loadConfig();
    } catch (err) {
    }

    if (!config.projectLastStarted) {
      config.projectLastStarted = {};
    }

    config.projectLastStarted[projectPath] = timestamp;

    await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
  } catch (err) {
    console.error(`Failed to save project last started: ${err.message}`);
  }
};

/**
 * Check if node_modules sizes have been scanned before
 * @returns {Promise<boolean>}
 */
export const hasNodeModulesSizes = async () => {
  try {
    const config = await loadConfig();
    return !!(config.nodeModulesSizes && Object.keys(config.nodeModulesSizes).length > 0);
  } catch (err) {
    return false;
  }
};
