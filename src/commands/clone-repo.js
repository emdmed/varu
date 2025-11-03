import { exec } from "child_process";
import { promisify } from "util";
import { access } from "fs/promises";
import path from "path";
import { executeCommandInTerminal } from './run-command.js';

const execAsync = promisify(exec);

/**
 * Extract repository name from git URL
 * @param {string} url - Git repository URL
 * @returns {string} - Repository name
 */
export const extractRepoName = (url) => {
  // Remove .git suffix if present
  const cleanUrl = url.replace(/\.git$/, '');

  // Extract the last part of the path
  const parts = cleanUrl.split('/');
  const repoName = parts[parts.length - 1];

  return repoName;
};

/**
 * Validate git URL format
 * @param {string} url - Git repository URL
 * @returns {boolean} - True if URL appears valid
 */
export const isValidGitUrl = (url) => {
  // Check for common git URL patterns (https, git, ssh)
  const patterns = [
    /^https?:\/\/.+\/.+/,           // https://github.com/user/repo
    /^git@.+:.+\/.+/,                // git@github.com:user/repo
    /^git:\/\/.+\/.+/,               // git://github.com/user/repo
    /^ssh:\/\/.+\/.+/,               // ssh://git@github.com/user/repo
  ];

  return patterns.some(pattern => pattern.test(url));
};

/**
 * Check if URL uses SSH protocol (may require SSH key authentication)
 * @param {string} url - Git repository URL
 * @returns {boolean} - True if URL uses SSH
 */
export const isSSHUrl = (url) => {
  return url.startsWith('git@') || url.startsWith('ssh://');
};

/**
 * Clone a git repository
 * @param {Object} options - Clone options
 * @param {string} options.url - Git repository URL
 * @param {string} options.destinationPath - Directory where to clone the repo
 * @returns {Promise<Object>} - Result object with clone info
 */
export const cloneRepository = async ({ url, destinationPath }) => {
  // Validate URL
  if (!url || typeof url !== 'string') {
    throw new Error("Git URL is required");
  }

  const trimmedUrl = url.trim();

  if (!isValidGitUrl(trimmedUrl)) {
    throw new Error("Invalid git URL format. Expected https, ssh, or git URL");
  }

  // Validate destination path
  if (!destinationPath) {
    throw new Error("Destination path is required");
  }

  try {
    await access(destinationPath);
  } catch (err) {
    throw new Error("Invalid or inaccessible destination path");
  }

  // Extract repository name
  const repoName = extractRepoName(trimmedUrl);
  const fullPath = path.join(destinationPath, repoName);

  // Check if directory already exists
  try {
    await access(fullPath);
    throw new Error(`Directory "${repoName}" already exists in ${destinationPath}`);
  } catch (err) {
    // Directory doesn't exist, which is what we want
    if (err.message.includes('already exists')) {
      throw err;
    }
  }

  // For SSH URLs or any URL that might require authentication,
  // run git clone in a terminal so user can interact with prompts
  if (isSSHUrl(trimmedUrl)) {
    try {
      await executeCommandInTerminal({
        command: `git clone "${trimmedUrl}" && echo "\n✓ Clone complete! Press Enter to close..." && read`,
        path: destinationPath
      });

      return {
        success: true,
        interactive: true,
        message: `Cloning ${repoName} in terminal (check terminal for SSH prompts)`,
        repoName,
        path: fullPath,
        url: trimmedUrl,
      };
    } catch (err) {
      throw new Error(`Failed to open terminal for cloning: ${err.message}`);
    }
  }

  // For HTTPS URLs, try non-interactive clone first
  try {
    const { stdout, stderr } = await execAsync(`git clone "${trimmedUrl}"`, {
      cwd: destinationPath,
      timeout: 120000, // 2 minute timeout
    });

    return {
      success: true,
      interactive: false,
      message: `Successfully cloned ${repoName}`,
      repoName,
      path: fullPath,
      url: trimmedUrl,
      output: stdout || stderr,
    };
  } catch (err) {
    // Parse git error messages for better user feedback
    let errorMessage = err.message;

    if (err.message.includes('Repository not found')) {
      errorMessage = "Repository not found. Check the URL and your access permissions";
    } else if (err.message.includes('Authentication failed') || err.message.includes('authentication required')) {
      // For HTTPS repos requiring auth, offer to open terminal
      try {
        await executeCommandInTerminal({
          command: `git clone "${trimmedUrl}" && echo "\n✓ Clone complete! Press Enter to close..." && read`,
          path: destinationPath
        });

        return {
          success: true,
          interactive: true,
          message: `Cloning ${repoName} in terminal (check terminal for authentication)`,
          repoName,
          path: fullPath,
          url: trimmedUrl,
        };
      } catch (termErr) {
        throw new Error("Authentication required. Please clone manually or check credentials");
      }
    } else if (err.message.includes('Could not resolve host')) {
      errorMessage = "Network error. Check your internet connection";
    } else if (err.message.includes('timeout')) {
      errorMessage = "Clone operation timed out. Repository may be too large or network is slow";
    }

    throw new Error(errorMessage);
  }
};
