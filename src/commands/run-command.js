import { spawn } from "child_process";
import { access } from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";
import net from "net";
import os from "os";

const execAsync = promisify(exec);

/**
 * Check if a port is available
 * @param {number} port - Port number to check
 * @returns {Promise<boolean>} - True if port is available
 */
export const isPortAvailable = async (port) => {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", (err) => {
      resolve(false);
    });
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port);
  });
};

/**
 * Find an available terminal emulator on Linux
 * @returns {Promise<string>} - Terminal command
 */
export const findAvailableTerminal = async () => {
  // Order prioritizes popular Arch Linux terminals first, then Ubuntu/GNOME defaults
  const possibleTerminals = [
    "alacritty",      // Very popular on Arch
    "kitty",          // Popular on Arch
    "wezterm",        // Modern terminal
    "gnome-terminal", // Ubuntu/GNOME default
    "konsole",        // KDE default
    "xfce4-terminal", // XFCE default
    "terminator",     // Popular alternative
    "tilix",          // GNOME-based
    "urxvt",          // Lightweight, often on Arch
    "st",             // Suckless terminal
    "xterm",          // Universal fallback
  ];
  for (const term of possibleTerminals) {
    try {
      await execAsync(`which ${term}`);
      return term;
    } catch (err) {
      // Terminal not found, continue to next
    }
  }
  throw new Error("No terminal emulator found. Please install one of: alacritty, kitty, gnome-terminal, konsole, or xterm");
};

/**
 * Execute a command in a new terminal window
 * @param {Object} options - Execution options
 * @param {string} options.command - Command to execute (default: "npm run dev")
 * @param {string} options.path - Working directory path
 * @param {number} [options.port] - Optional port to check availability
 * @returns {Promise<Object>} - Result object with process info
 */
export const executeCommandInTerminal = async ({ command = "npm run dev", path, port }) => {
  // Validate path
  if (!path) {
    throw new Error("Path is required");
  }
  try {
    await access(path);
  } catch (err) {
    throw new Error("Invalid or inaccessible path");
  }
  // Check port availability if specified
  if (port) {
    const available = await isPortAvailable(port);
    if (!available) {
      const error = new Error("Port is in use");
      error.isPortUnavailable = true;
      throw error;
    }
  }
  // Build platform-specific command
  let execCommand;
  if (os.platform() === "win32") {
    execCommand = `powershell -Command "Start-Process -NoNewWindow -FilePath 'cmd.exe' -ArgumentList '/k cd /d ${path} && ${command}'"`;
  } else {
    const terminal = await findAvailableTerminal();

    // Different terminals have different command syntax
    // Using bash instead of zsh for better compatibility
    switch (terminal) {
      case "alacritty":
        execCommand = `${terminal} --working-directory "${path}" -e bash -c "${command}; exec bash"`;
        break;
      case "kitty":
        execCommand = `${terminal} --directory "${path}" bash -c "${command}; exec bash"`;
        break;
      case "wezterm":
        execCommand = `${terminal} start --cwd "${path}" -- bash -c "${command}; exec bash"`;
        break;
      case "gnome-terminal":
      case "xfce4-terminal":
      case "tilix":
        execCommand = `${terminal} --working-directory="${path}" -- bash -c "${command}; exec bash"`;
        break;
      case "konsole":
        execCommand = `${terminal} --workdir "${path}" -e bash -c "${command}; exec bash"`;
        break;
      case "terminator":
        execCommand = `${terminal} --working-directory="${path}" -e "bash -c '${command}; exec bash'"`;
        break;
      default:
        // Generic fallback for xterm and others
        execCommand = `${terminal} -e bash -c "cd ${path} && ${command}; exec bash"`;
    }
  }
  console.log("Executing:", execCommand);
  // Spawn the process in detached mode so it continues running after parent exits
  const childProcess = spawn(execCommand, {
    shell: true,
    detached: true,  // Run process in separate process group
    stdio: "ignore", // Don't pipe stdio, let terminal handle it
    env: { ...process.env, DISPLAY: ":0" },
  });

  // Unref the child so parent can exit independently
  childProcess.unref();

  return {
    message: "Command executed successfully",
    executedCommand: command,
    executedPath: path,
    processId: childProcess.pid,
    childProcess, // Return the process for further control if needed
  };
};
