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
        // Filter for ports > 3000 and remove duplicates
        const filteredPorts = [...new Set(allPorts.filter(port => port > 3000))];

        return filteredPorts.sort((a, b) => a - b);
    } catch (error) {
        // Log to stderr so it appears in terminal
        console.error('Port scanner error:', error.message);
        return [];
    }
}
