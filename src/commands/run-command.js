const { spawn } = require("child_process");
const { access } = require("fs/promises");
const { exec } = require("child_process");
const { promisify } = require("util");
const net = require("net");
const os = require("os");

const execAsync = promisify(exec);

/**
 * Check if a port is available
 * @param {number} port - Port number to check
 * @returns {Promise<boolean>} - True if port is available
 */
const isPortAvailable = async (port) => {
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
const findAvailableTerminal = async () => {
  const possibleTerminals = [
    "gnome-terminal",
    "konsole",
    "xfce4-terminal",
    "xterm",
  ];

  for (const term of possibleTerminals) {
    try {
      await execAsync(`which ${term}`);
      return term;
    } catch (err) {
      // Terminal not found, continue to next
    }
  }

  return "x-terminal-emulator"; // Fallback
};

/**
 * Execute a command in a new terminal window
 * @param {Object} options - Execution options
 * @param {string} options.command - Command to execute (default: "npm run dev")
 * @param {string} options.path - Working directory path
 * @param {number} [options.port] - Optional port to check availability
 * @returns {Promise<Object>} - Result object with process info
 */
const executeCommandInTerminal = async ({ command = "npm run dev", path, port }) => {
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
    execCommand = `${terminal} -- zsh -i -c "source ~/.zshrc; cd ${path} && ${command}; exec zsh"`;
  }

  console.log("Executing:", execCommand);

  // Spawn the process
  const childProcess = spawn(execCommand, {
    shell: true,
    stdio: "inherit",
    env: { ...process.env, DISPLAY: ":0" },
  });

  return {
    message: "Command executed successfully",
    executedCommand: command,
    executedPath: path,
    processId: childProcess.pid,
    childProcess, // Return the process for further control if needed
  };
};

module.exports = {
  executeCommandInTerminal,
  isPortAvailable,
  findAvailableTerminal,
};
