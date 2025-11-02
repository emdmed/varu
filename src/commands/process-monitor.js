import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';

const execAsync = promisify(exec);

/**
 * Get all terminals and their commands (cross-platform)
 * @returns {Promise<Array>} Array of process objects with pid, command, cwd, and path
 */
async function getTerminalsAndCommands() {
  try {
    if (os.platform() === "win32") {
      const { stdout } = await execAsync(
        `powershell -Command "Get-WmiObject Win32_Process | Select-Object ProcessId,CommandLine,ExecutablePath | ConvertTo-Json"`
      );
      const processes = JSON.parse(stdout);
      const processList = Array.isArray(processes) ? processes : [processes];
      return processList
        .filter(proc => proc.ExecutablePath)
        .map(proc => ({
          pid: proc.ProcessId,
          command: proc.CommandLine || "Unknown",
          path: proc.ExecutablePath,
          cwd: "Unknown (Windows does not expose cwd easily)",
        }));
    } else {
      const { stdout } = await execAsync(`ps aux | grep pts/ | grep -v grep`);
      if (!stdout.trim()) {
        return [];
      }
      const terminalInfo = await Promise.all(
        stdout.split("\n").map(async (line) => {
          const parts = line.trim().split(/\s+/);
          if (parts.length > 10) {
            const pid = parts[1];
            const tty = parts[6];
            const command = parts.slice(10).join(" ");
            try {
              const { stdout: cwd } = await execAsync(`readlink /proc/${pid}/cwd`);
              return { pid, tty, command, cwd: cwd.trim(), path: cwd.trim() };
            } catch (error) {
              return {
                pid,
                tty,
                command,
                cwd: "Unknown (Permission Denied or Process Ended)",
                path: "Unknown"
              };
            }
          }
          return null;
        })
      );
      return terminalInfo.filter(Boolean);
    }
  } catch (error) {
    console.error("Error fetching terminal details:", error.message);
    return [];
  }
}

/**
 * Get all terminal processes running in a specific path
 * @param {string} projectPath - The project directory path
 * @returns {Promise<Array>} Array of process objects with pid, command, and cwd
 */
export async function getTerminalsInPath(projectPath) {
  try {
    const allTerminals = await getTerminalsAndCommands();

    // Filter terminals that are running in the project path
    return allTerminals.filter(terminal => {
      if (!terminal.cwd || terminal.cwd === "Unknown" || terminal.cwd.includes("Permission Denied")) {
        return false;
      }
      return terminal.cwd === projectPath || terminal.cwd.startsWith(projectPath + '/');
    });
  } catch (error) {
    console.error("Error getting terminals in path:", error.message);
    return [];
  }
}

/**
 * Kill all processes running in a specific path
 * @param {string} projectPath - The project directory path
 * @returns {Promise<number>} Number of processes killed
 */
export async function killProcessesInPath(projectPath) {
  try {
    // Get all terminals running in this path
    const terminalsToKill = await getTerminalsInPath(projectPath);

    if (terminalsToKill.length === 0) {
      return 0;
    }

    let killedCount = 0;

    // Kill each terminal process
    for (const terminal of terminalsToKill) {
      try {
        const killCommand = os.platform() === "win32"
          ? `taskkill /PID ${terminal.pid} /F`
          : `kill -9 ${terminal.pid} || true`;

        await execAsync(killCommand);
        killedCount++;
      } catch (err) {
        // Process might have already ended or we don't have permission
        console.error(`Failed to kill process ${terminal.pid}:`, err.message);
      }
    }

    return killedCount;
  } catch (error) {
    throw new Error(`Failed to kill processes: ${error.message}`);
  }
}

/**
 * Kill a specific process by PID (cross-platform)
 * @param {number} pid - Process ID to kill
 * @returns {Promise<boolean>} True if process was killed successfully
 */
export async function killProcess(pid) {
  try {
    const killCommand = os.platform() === "win32"
      ? `taskkill /PID ${pid} /F`
      : `kill -9 ${pid} || true`;

    await execAsync(killCommand);
    return true;
  } catch (error) {
    console.error(`Failed to kill process ${pid}:`, error.message);
    return false;
  }
}
