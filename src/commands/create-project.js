import { access, writeFile, unlink } from "fs/promises";
import path from "path";
import { executeCommandInTerminal } from './run-command.js';
import os from "os";

/**
 * Validate project name
 * @param {string} projectName - Project name
 * @returns {boolean} - True if project name is valid
 */
export const isValidProjectName = (projectName) => {
  if (!projectName || typeof projectName !== 'string') return false;

  const trimmed = projectName.trim();

  // Check for valid npm package name format
  // Allow alphanumeric, hyphens, underscores, dots
  const validPattern = /^[a-z0-9._-]+$/i;

  return validPattern.test(trimmed) && trimmed.length > 0;
};

/**
 * Create a new project (Next.js or Vite)
 * @param {Object} options - Create options
 * @param {string} options.projectType - Type of project ('nextjs' or 'vite')
 * @param {string} options.destinationPath - Directory where to create the project
 * @returns {Promise<Object>} - Result object with creation info
 */
export const createProject = async ({ projectType, destinationPath }) => {
  // Validate destination path
  if (!destinationPath) {
    throw new Error("Destination path is required");
  }

  try {
    await access(destinationPath);
  } catch (err) {
    throw new Error("Invalid or inaccessible destination path");
  }

  // Determine the command based on project type
  let command;
  let projectTypeName;

  if (projectType === 'nextjs') {
    command = 'npx shadcn@latest init';
    projectTypeName = 'Next.js with shadcn/ui';
  } else if (projectType === 'vite') {
    command = 'npm create vite@latest';
    projectTypeName = 'Vite';
  } else {
    throw new Error(`Unknown project type: ${projectType}`);
  }

  // Create a temporary script file to avoid escaping issues
  const tempScriptPath = path.join(os.tmpdir(), `create-project-${Date.now()}.sh`);
  const scriptContent = `#!/bin/bash
cd "${destinationPath}"

${command}

echo ""
echo "Press Enter to close this window..."
read
`;

  try {
    // Write the script file
    await writeFile(tempScriptPath, scriptContent, { mode: 0o755 });

    // Execute the script in a terminal
    await executeCommandInTerminal({
      command: tempScriptPath,
      path: destinationPath
    });

    // Clean up the script file after a delay (terminal needs time to read it)
    setTimeout(async () => {
      try {
        await unlink(tempScriptPath);
      } catch (err) {
        // Ignore cleanup errors
      }
    }, 5000);

    return {
      success: true,
      interactive: true,
      message: `Creating ${projectTypeName} project (check terminal for prompts)`,
    };
  } catch (err) {
    // Clean up script file on error
    try {
      await unlink(tempScriptPath);
    } catch (cleanupErr) {
      // Ignore cleanup errors
    }
    throw new Error(`Failed to create project: ${err.message}`);
  }
};
