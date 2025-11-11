# Varu CLI (varucli)

A terminal-based development dashboard for managing and monitoring your Node.js projects.

<img width="935" height="319" alt="screenshot-2025-11-10_20-08-41" src="https://github.com/user-attachments/assets/737f0711-34fa-41f9-94d0-b1d2aa371776" />

## Overview

Varu CLI is an interactive command-line interface built with React and Ink that helps developers manage multiple projects from a single dashboard. It provides a centralized view of all your projects, monitors running development servers, and offers quick access to common development tasks.

## Features

- **Project Management**
  - Automatically scans and lists all projects in a configured directory
  - Quick navigation with vim-style keyboard shortcuts
  - Search and filter projects by name
  - Monitor running development servers in real-time

- **Development Workflow**
  - Start/stop development servers with a single keystroke
  - Open projects directly in nvim
  - Install dependencies via npm
  - Clone repositories with auto-detection from clipboard

- **Node Modules Management**
  - Scan and display node_modules folder sizes
  - Identify and cleanup stale node_modules
  - Track last project usage

- **User Interface**
  - Clean, terminal-based interface
  - Real-time process monitoring
  - Responsive design that adapts to terminal size
  - Built-in help system

## Installation

```bash
npm install -g varucli
```

Or run directly with npx:

```bash
npx varucli
```

## Usage

Start the dashboard:

```bash
varucli
```

On first run, you'll be prompted to configure the root directory where your projects are located.

## Keyboard Shortcuts

### Navigation
- `j` / `↓` - Move down
- `k` / `↑` - Move up
- `gg` - Jump to top (double-tap g)
- `G` - Jump to bottom

### Actions
- `Enter` - Open project in nvim
- `s` - Start/stop development server
- `c` - Clone a repository (auto-detects git URLs from clipboard)
- `I` - Install npm dependencies
- `/` or `i` - Search/filter projects
- `m` - Scan node_modules sizes
- `r` - Refresh project list
- `dd` - Cleanup stale node_modules (double-tap d)

### Other
- `C` - Open configuration
- `?` - Show help
- `q` - Quit

## Configuration

The application stores configuration in `~/.varucli-config.json`. You can reconfigure at any time by pressing `C` in the main interface.

Configuration options:
- **Project Path**: Root directory to scan for projects
- Projects are identified by the presence of `package.json` files

## Project Structure

```
src/
├── App.js              # Main application component
├── index.js            # Entry point
├── commands/           # Command implementations
│   ├── clone-repo.js
│   ├── process-monitor.js
│   ├── project-scanner.js
│   └── run-command.js
├── components/         # UI components
├── hooks/              # React hooks for state management
└── utils/              # Utility functions
```

## Development

Build the project:

```bash
npm run build
```

Run in development mode:

```bash
npm run dev
```

Start the application:

```bash
npm start
```

## How It Works

1. **Project Scanning**: Recursively scans the configured directory for `package.json` files
2. **Process Monitoring**: Detects running development servers by monitoring processes
3. **Command Execution**: Executes commands in new terminal windows for interactive workflows
4. **State Management**: Uses React hooks for managing application state and side effects

## Requirements

- Node.js (version with ESM support)
- Terminal with ANSI color support
- Git (for cloning repositories)

## Version

Current version: 0.0.11

## License

See package.json for license information.
