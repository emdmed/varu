import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

function extractUsedPorts(portsStr, platform) {
    const ports = [];
    const lines = portsStr.split(/\r?\n/);

    if (platform === 'win32') {
        for (const line of lines) {
            if (!line.trim().startsWith('TCP')) continue;
            const tokens = line.trim().split(/\s+/);
            if (tokens.length < 2) continue;
            const localAddress = tokens[1];
            const parts = localAddress.split(':');
            const portStr = parts[parts.length - 1];
            const port = Number(portStr);
            if (!isNaN(port)) {
                ports.push(port);
            }
        }
    } else if (platform === 'linux') {
        for (const line of lines) {
            const trimmed = line.trim();
            // Skip non-tcp lines
            if (!trimmed.startsWith('tcp')) continue;

            // ss output format: "tcp   LISTEN 0      4096            127.0.0.1:45733      0.0.0.0:*"
            // Look for LISTEN state
            if (!trimmed.includes('LISTEN')) continue;

            const tokens = trimmed.split(/\s+/);
            if (tokens.length < 5) continue;

            // Local address is the 5th token (index 4)
            const localAddress = tokens[4];
            const match = localAddress.match(/:(\d+)$/);
            if (match) {
                ports.push(Number(match[1]));
            }
        }
    } else if (platform === 'darwin') {
        for (const line of lines) {
            if (!line.includes('(LISTEN)')) continue;
            const match = line.match(/:(\d+)\s+\(LISTEN\)/);
            if (match) {
                ports.push(Number(match[1]));
            } else {
                const matchGeneral = line.match(/:(\d+)\b/);
                if (matchGeneral) {
                    ports.push(Number(matchGeneral[1]));
                }
            }
        }
    } else {
        throw new Error('Unsupported platform');
    }

    return ports;
}

export async function getUsedPorts() {
    try {
        const platform = process.platform;
        let command = '';

        if (platform === 'win32') {
            command = 'netstat -ano';
        } else if (platform === 'linux') {
            // Use ss (modern replacement for netstat on Linux)
            command = 'ss -tuln';
        } else if (platform === 'darwin') {
            command = 'lsof -nP -iTCP -sTCP:LISTEN';
        } else {
            throw new Error('Unsupported platform');
        }

        const { stdout, stderr } = await execAsync(command);
        // stderr can have warnings, only fail on actual errors
        if (stderr && !stdout) {
            throw new Error(stderr);
        }

        const allPorts = extractUsedPorts(stdout, platform);
        // Filter for ports >= 3000 and remove duplicates
        const filteredPorts = [...new Set(allPorts.filter(port => port >= 3000))];

        return filteredPorts.sort((a, b) => a - b);
    } catch (error) {
        // Log to stderr so it appears in terminal
        console.error('Port scanner error:', error.message);
        return [];
    }
}

/**
 * Get port to PID mappings for accurate project matching
 * Returns object like { 3000: 12345, 5173: 67890 }
 */
export async function getPortToPidMap() {
    try {
        const platform = process.platform;
        let command = '';

        if (platform === 'win32') {
            command = 'netstat -ano';
        } else if (platform === 'linux') {
            // Use ss first as it's more comprehensive, fallback to lsof
            command = 'ss -tlnp 2>/dev/null || lsof -nP -iTCP -sTCP:LISTEN 2>/dev/null';
        } else if (platform === 'darwin') {
            command = 'lsof -nP -iTCP -sTCP:LISTEN';
        } else {
            throw new Error('Unsupported platform');
        }

        const { stdout } = await execAsync(command);
        const portToPid = {};
        const lines = stdout.split(/\r?\n/);

        if (platform === 'linux' || platform === 'darwin') {
            // Detect format: ss vs lsof
            const isSsFormat = lines[0] && lines[0].includes('State');

            for (const line of lines) {
                if (!line.includes('LISTEN')) continue;

                if (isSsFormat) {
                    // ss output format: LISTEN 0      511                *:3000             *:*    users:(("next-server (v1",pid=3023983,fd=24))
                    const tokens = line.trim().split(/\s+/);
                    if (tokens.length < 4) continue;

                    // Local address is 4th token (index 3) (e.g., "*:3000" or "[::1]:5173")
                    const localAddress = tokens[3];
                    const portMatch = localAddress.match(/:(\d+)$/);

                    if (portMatch) {
                        const port = Number(portMatch[1]);

                        // Extract PID from users field: users:(("process",pid=12345,fd=24))
                        const pidMatch = line.match(/pid=(\d+)/);
                        if (pidMatch && port >= 3000) {
                            portToPid[port] = Number(pidMatch[1]);
                        }
                    }
                } else {
                    // lsof output format: node    12345 user   21u  IPv4 123456      0t0  TCP *:3000 (LISTEN)
                    const tokens = line.trim().split(/\s+/);
                    if (tokens.length < 2) continue;

                    // PID is the second column
                    const pid = tokens[1];
                    if (!/^\d+$/.test(pid)) continue;

                    // Port is in a column like "*:3000" or "127.0.0.1:3000"
                    const portMatch = line.match(/:(\d+)\s+\(LISTEN\)/);
                    if (portMatch) {
                        const port = Number(portMatch[1]);
                        if (port >= 3000) {
                            portToPid[port] = Number(pid);
                        }
                    }
                }
            }
        } else if (platform === 'win32') {
            // Windows netstat format: TCP    127.0.0.1:3000    0.0.0.0:0    LISTENING    12345
            for (const line of lines) {
                if (!line.includes('LISTENING')) continue;

                const tokens = line.trim().split(/\s+/);
                if (tokens.length < 5) continue;

                const localAddress = tokens[1];
                const pid = tokens[tokens.length - 1];

                const portMatch = localAddress.match(/:(\d+)$/);
                if (portMatch && /^\d+$/.test(pid)) {
                    const port = Number(portMatch[1]);
                    if (port >= 3000) {
                        portToPid[port] = Number(pid);
                    }
                }
            }
        }

        return portToPid;
    } catch (error) {
        console.error('Port-to-PID mapping error:', error.message);
        return {};
    }
}
