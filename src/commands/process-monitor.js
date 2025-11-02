import { exec } from "child_process";
import { promisify } from "util";
import os from "os";

const execAsync = promisify(exec);

/**
 * Get information about active terminal processes and their commands
 * @returns {Promise<Array>} - Array of terminal process info
 */
export async function getTerminalsAndCommands() {
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
      // Linux/Unix - find processes associated with terminal sessions
      const { stdout: ptsProcesses } = await execAsync(`ps aux | grep pts/ | grep -v grep`);

      if (!ptsProcesses.trim()) {
        console.log("No active terminals found.");
        return [];
      }

      const terminalInfo = await Promise.all(
        ptsProcesses.split("\n").map(async (line) => {
          const parts = line.trim().split(/\s+/);
          if (parts.length > 10) {
            const pid = parts[1];
            const tty = parts[6];
            const command = parts.slice(10).join(" ");

            try {
              const { stdout: cwd } = await execAsync(`readlink /proc/${pid}/cwd`);
              return {
                pid,
                tty,
                command,
                cwd: cwd.trim(),
                path: cwd.trim()
              };
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
 * Get active terminals filtered by valid paths
 * @returns {Promise<Array>} - Array of active terminal info with valid paths
 */
export async function getActiveTerminals() {
  try {
    const activeTerminals = await getTerminalsAndCommands();
    return activeTerminals.filter(terminal => terminal.path !== "Unknown");
  } catch (error) {
    console.error("Unexpected error:", error.message);
    return [];
  }
}

/**
 * Find terminals running in a specific directory
 * @param {string} projectPath - Path to search for
 * @returns {Promise<Array>} - Array of terminals running in that path
 */
export async function getTerminalsInPath(projectPath) {
  try {
    const activeTerminals = await getActiveTerminals();
    return activeTerminals.filter(terminal =>
      terminal.cwd === projectPath || terminal.path === projectPath
    );
  } catch (error) {
    console.error("Error filtering terminals by path:", error.message);
    return [];
  }
}

/**
 * Find terminals running specific commands (e.g., npm, node, nvim)
 * @param {string} commandPattern - Command pattern to search for (e.g., "npm run dev", "nvim")
 * @returns {Promise<Array>} - Array of terminals running matching commands
 */
export async function getTerminalsByCommand(commandPattern) {
  try {
    const activeTerminals = await getActiveTerminals();
    return activeTerminals.filter(terminal =>
      terminal.command.includes(commandPattern)
    );
  } catch (error) {
    console.error("Error filtering terminals by command:", error.message);
    return [];
  }
}

/**
 * Get a summary of all running dev servers and editors
 * @returns {Promise<Object>} - Object containing categorized processes
 */
export async function getProcessSummary() {
  try {
    const activeTerminals = await getActiveTerminals();

    const summary = {
      total: activeTerminals.length,
      devServers: activeTerminals.filter(t =>
        t.command.includes("npm run dev") ||
        t.command.includes("npm start") ||
        t.command.includes("yarn dev") ||
        t.command.includes("pnpm dev")
      ),
      editors: activeTerminals.filter(t =>
        t.command.includes("nvim") ||
        t.command.includes("vim") ||
        t.command.includes("code")
      ),
      other: activeTerminals.filter(t =>
        !t.command.includes("npm") &&
        !t.command.includes("nvim") &&
        !t.command.includes("vim") &&
        !t.command.includes("code") &&
        !t.command.includes("yarn") &&
        !t.command.includes("pnpm")
      )
    };

    return summary;
  } catch (error) {
    console.error("Error getting process summary:", error.message);
    return {
      total: 0,
      devServers: [],
      editors: [],
      other: []
    };
  }
}

/**
 * Check if a dev server is already running for a project
 * @param {string} projectPath - Path to the project
 * @returns {Promise<boolean>} - True if dev server is running
 */
export async function isDevServerRunning(projectPath) {
  try {
    const terminalsInPath = await getTerminalsInPath(projectPath);
    return terminalsInPath.some(terminal =>
      terminal.command.includes("npm run dev") ||
      terminal.command.includes("npm start") ||
      terminal.command.includes("yarn dev") ||
      terminal.command.includes("pnpm dev")
    );
  } catch (error) {
    console.error("Error checking dev server status:", error.message);
    return false;
  }
}
