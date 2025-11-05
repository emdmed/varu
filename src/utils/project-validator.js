import { stat, access, readFile } from 'fs/promises';
import { join } from 'path';

export const checkNodeModulesExists = async (projectPath) => {
  const nodeModulesPath = join(projectPath, 'node_modules');

  try {
    await access(nodeModulesPath);
    const stats = await stat(nodeModulesPath);
    return stats.isDirectory();
  } catch (err) {
    return false;
  }
};

export const validatePackageJsonScript = async (projectPath, command) => {
  try {
    const packageJsonPath = join(projectPath, 'package.json');
    const packageJsonContent = await readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);

    if (!packageJson.scripts) {
      return { valid: false, error: 'No scripts section in package.json' };
    }

    if (command === 'N/A' || !command) {
      return { valid: false, error: 'No dev or start script found in package.json' };
    }

    const scriptName = extractScriptName(command);
    if (!scriptName) {
      return { valid: true };
    }

    if (!packageJson.scripts[scriptName]) {
      return { valid: false, error: `Script "${scriptName}" not found in package.json` };
    }

    return { valid: true };
  } catch (err) {
    return { valid: false, error: `Failed to read package.json: ${err.message}` };
  }
};

const extractScriptName = (command) => {
  if (command.includes('npm run ')) {
    return command.replace('npm run ', '').trim();
  }
  if (command.includes('yarn ') && !command.includes('yarn start')) {
    return command.replace('yarn ', '').trim();
  }
  if (command.includes('pnpm run ')) {
    return command.replace('pnpm run ', '').trim();
  }
  if (command.includes('npm start') || command.includes('yarn start') || command.includes('pnpm start')) {
    return 'start';
  }
  return null;
};

export const validateProjectReadiness = async (project) => {
  const errors = [];

  const hasNodeModules = await checkNodeModulesExists(project.path);
  if (!hasNodeModules) {
    errors.push({
      type: 'missing_dependencies',
      message: 'Dependencies not installed. Run npm install first.'
    });
  }

  const scriptValidation = await validatePackageJsonScript(project.path, project.command);
  if (!scriptValidation.valid) {
    errors.push({
      type: 'missing_script',
      message: scriptValidation.error
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
};
