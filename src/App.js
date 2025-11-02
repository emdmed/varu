import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import useConfig from './hooks/useConfig.js';
import ConfigurationComponent from './components/configuration/configuration-component.js';
import { findPackageJsonFiles } from './commands/project-scanner.js';
import { executeCommandInTerminal } from './commands/run-command.js';
import { getTerminalsInPath, killProcessesInPath } from './commands/process-monitor.js';
import { useScreenSize } from "./hooks/useScreenSize.js";
import { getNodeModulesSize } from './utils/folder-size.js';
import Project from './components/project.js';
import ProjectDetails from './components/project-details.js';

const VERSION = "0.0.6"
const App = () => {
  const { configuration, isConfig, loading } = useConfig();
  const [projects, setProjects] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [view, setView] = useState('list'); // 'list', 'details', 'config'
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const { exit } = useApp();
  const size = useScreenSize();
  const [scrollOffset, setScrollOffset] = useState(0);
  const [runningProcesses, setRunningProcesses] = useState({});
  const [nodeModulesSizes, setNodeModulesSizes] = useState({});
  const [scanningModules, setScanningModules] = useState(false);

  const reservedLines = 3 + 2 + 2 + 4 + 2; // base UI elements
  const detailsLines = (view === 'details' && projects[selectedIndex]) ? 10 : 0;
  const scrollIndicatorLines = 2; // space for scroll indicators
  const availableLines = Math.max(5, size.height - reservedLines - detailsLines - scrollIndicatorLines);
  const VISIBLE_ITEMS = Math.max(5, availableLines); // minimum 5 items

  // Clear success message after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Scan for projects when config is loaded
  useEffect(() => {
    if (isConfig && configuration?.projectPath) {
      setScanning(true);
      setError(null);
      findPackageJsonFiles(configuration.projectPath)
        .then((foundProjects) => {
          // Sort projects alphabetically by project name
          const sortedProjects = foundProjects.sort((a, b) =>
            a.projectName.localeCompare(b.projectName, undefined, { sensitivity: 'base' })
          );
          setProjects(sortedProjects);
          if (sortedProjects.length === 0) {
            setError('No projects found in the configured directory');
          }
        })
        .catch((err) => {
          setError(`Error scanning projects: ${err.message}`);
        })
        .finally(() => setScanning(false));
    }
  }, [isConfig, configuration]);

  // Scan node_modules sizes incrementally
  useEffect(() => {
    if (projects.length === 0) return;

    let currentIndex = 0;
    let isActive = true;
    setScanningModules(true);

    const scanNextProject = async () => {
      if (!isActive || projects.length === 0) return;

      const project = projects[currentIndex];
      try {
        const sizeInfo = await getNodeModulesSize(project.path);

        if (isActive) {
          setNodeModulesSizes(prev => ({
            ...prev,
            [project.path]: sizeInfo
          }));
        }
      } catch (err) {
        // Silently fail for individual project checks
      }

      // Move to next project
      currentIndex = (currentIndex + 1);

      // If we've scanned all projects, stop
      if (currentIndex >= projects.length) {
        setScanningModules(false);
        return;
      }
    };

    // Check one project every 100ms for faster scanning
    const interval = setInterval(scanNextProject, 100);

    // Initial check
    scanNextProject();

    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, [projects]);

  // Monitor running processes incrementally
  useEffect(() => {
    if (projects.length === 0) return;

    let currentIndex = 0;
    let isActive = true;

    const checkNextProject = async () => {
      if (!isActive || projects.length === 0) return;

      const project = projects[currentIndex];
      try {
        const terminals = await getTerminalsInPath(project.path);

        if (terminals.length > 0 && isActive) {
          setRunningProcesses(prev => ({
            ...prev,
            [project.path]: {
              hasDevServer: terminals.some(t =>
                t.command.includes('npm run dev') ||
                t.command.includes('npm start') ||
                t.command.includes('yarn dev') ||
                t.command.includes('pnpm dev')
              ),
              hasEditor: terminals.some(t =>
                t.command.includes('nvim') ||
                t.command.includes('vim')
              ),
              count: terminals.length
            }
          }));
        } else if (isActive) {
          // Remove from state if no terminals found
          setRunningProcesses(prev => {
            const newState = { ...prev };
            delete newState[project.path];
            return newState;
          });
        }
      } catch (err) {
        // Silently fail for individual project checks
      }

      // Move to next project
      currentIndex = (currentIndex + 1) % projects.length;
    };

    // Check one project every 500ms (all projects checked in projectCount * 0.5 seconds)
    const interval = setInterval(checkNextProject, 500);

    // Initial check
    checkNextProject();

    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, [projects]);

  // Handle keyboard input
  useInput((input, key) => {
    if (view === 'config') return; // Let ConfigurationComponent handle input

    // Navigation
    if (key.upArrow || input === 'k') {
      setSelectedIndex(prev => {
        const newIndex = Math.max(0, prev - 1);
        // Scroll up if selection moves above visible window
        if (newIndex < scrollOffset) {
          setScrollOffset(newIndex);
        }
        return newIndex;
      });
    }
    if (key.downArrow || input === 'j') {
      setSelectedIndex(prev => {
        const newIndex = Math.min(projects.length - 1, prev + 1);
        // Scroll down if selection moves below visible window
        if (newIndex >= scrollOffset + VISIBLE_ITEMS) {
          setScrollOffset(newIndex - VISIBLE_ITEMS + 1);
        }
        return newIndex;
      });
    }

    // Actions
    if (key.return) {
      if (projects[selectedIndex]) {
        openProject(projects[selectedIndex]);
      }
    }

    if (input === 's') {
      if (projects[selectedIndex]) {
        const processInfo = runningProcesses[projects[selectedIndex].path];

        // If server is running, stop it. Otherwise, start it.
        if (processInfo && processInfo.hasDevServer) {
          stopServer(projects[selectedIndex]);
        } else {
          runDevServer(projects[selectedIndex]);
        }
      }
    }

    if (input === 'd') {
      setView(view === 'details' ? 'list' : 'details');
    }

    if (input === 'c') {
      setView('config');
    }

    if (input === 'r') {
      // Refresh projects list
      setScanning(true);
      setSelectedIndex(0);
      setScrollOffset(0);
      setNodeModulesSizes({}); // Clear sizes for rescan
      findPackageJsonFiles(configuration.projectPath)
        .then((foundProjects) => {
          // Sort projects alphabetically by project name
          const sortedProjects = foundProjects.sort((a, b) =>
            a.projectName.localeCompare(b.projectName, undefined, { sensitivity: 'base' })
          );
          setProjects(sortedProjects);
        })
        .finally(() => setScanning(false));
    }

    if (input === 'q' || (key.ctrl && input === 'c')) {
      exit();
    }
  });

  const openProject = async (project) => {
    try {
      // Open in nvim using the executeCommandInTerminal function
      await executeCommandInTerminal({
        command: 'nvim .',
        path: project.path
      });
    } catch (err) {
      setError(`Failed to open project: ${err.message}`);
      console.error('Error opening project:', err);
    }
  };

  const runDevServer = async (project) => {
    try {
      // Determine the command to run based on project.command or default to npm run dev
      const devCommand = project.command !== 'N/A' ? project.command : 'npm run dev';

      await executeCommandInTerminal({
        command: devCommand,
        path: project.path
      });
    } catch (err) {
      setError(`Failed to run dev server: ${err.message}`);
      console.error('Error running dev server:', err);
    }
  };

  const stopServer = async (project) => {
    try {
      const processInfo = runningProcesses[project.path];

      if (!processInfo || processInfo.count === 0) {
        setError('No running processes found for this project');
        setTimeout(() => setError(null), 3000);
        return;
      }

      // Kill all processes in the project path
      const killedCount = await killProcessesInPath(project.path);

      if (killedCount > 0) {
        setSuccessMessage(`✓ Stopped ${killedCount} process${killedCount > 1 ? 'es' : ''} for ${project.projectName}`);
        // Clear error if any
        setError(null);
        // Immediately update the running processes state
        setRunningProcesses(prev => {
          const newState = { ...prev };
          delete newState[project.path];
          return newState;
        });
      } else {
        setError('No processes were stopped');
        setTimeout(() => setError(null), 3000);
      }
    } catch (err) {
      setError(`Failed to stop server: ${err.message}`);
      setTimeout(() => setError(null), 3000);
      console.error('Error stopping server:', err);
    }
  };

  const handleConfigComplete = (newConfig) => {
    setView('list');
    // Trigger re-scan
    setScanning(true);
    setNodeModulesSizes({}); // Clear sizes for rescan
    findPackageJsonFiles(newConfig.projectPath)
      .then((foundProjects) => {
        // Sort projects alphabetically by project name
        const sortedProjects = foundProjects.sort((a, b) =>
          a.projectName.localeCompare(b.projectName, undefined, { sensitivity: 'base' })
        );
        setProjects(sortedProjects);
      })
      .finally(() => setScanning(false));
  };

  // Show configuration screen if no config
  if (!loading && !isConfig) {
    return (
      <>
        <Box>
          <Text>{'\x1Bc'}</Text>
        </Box>
        <ConfigurationComponent onComplete={handleConfigComplete} />
      </>
    );
  }

  // Show reconfiguration screen
  if (view === 'config') {
    return (
      <>
        <Box>
          <Text>{'\x1Bc'}</Text>
        </Box>
        <ConfigurationComponent onComplete={handleConfigComplete} />
      </>
    );
  }

  // Loading state
  if (loading || scanning) {
    return (
      <>
        <Box>
          <Text>{'\x1Bc'}</Text>
        </Box>
        <Box flexDirection="column" padding={1}>
          <Text color="yellow">
            {loading ? '⏳ Loading configuration...' : '🔍 Scanning for projects...'}
          </Text>
          {configuration?.projectPath && (
            <Text color="gray">Directory: {configuration.projectPath}</Text>
          )}
        </Box>
      </>
    );
  }

  // Error state
  if (error) {
    return (
      <>
        <Box>
          <Text>{'\x1Bc'}</Text>
        </Box>
        <Box flexDirection="column" padding={1}>
          <Text color="red">✗ {error}</Text>
          <Box marginTop={1}>
            <Text color="gray">
              Press <Text bold>c</Text> to reconfigure or <Text bold>q</Text> to quit
            </Text>
          </Box>
        </Box>
      </>
    );
  }

  const selectedProject = projects[selectedIndex];

  // Main UI
  return (
    <>
      <Box>
        <Text>{'\x1Bc'}</Text>
      </Box>
      <Box flexDirection="column" height={size.height} width={size.width} padding={1}>

        <Box flexDirection="column" marginBottom={1}>

          <Box flexDirection='row' justifyContent='space-between' marginBottom={1}>
            <Text bold underline>
              Projects: {selectedIndex + 1}/{projects.length}
            </Text>
            <Box gap={1}>
              <Text bold>Varu</Text>
              <Text dimColor>{VERSION}</Text>
            </Box>
          </Box>

          {successMessage && (
            <Box marginBottom={1}>
              <Text color="green">{successMessage}</Text>
            </Box>
          )}

          {projects.length === 0 ? (
            <Text color="yellow">No projects found</Text>
          ) : (
            <>
              {scrollOffset > 0 && (
                <Box marginLeft={1}>
                  <Text color="gray">↑ {scrollOffset} more above...</Text>
                </Box>
              )}

              {projects.slice(scrollOffset, scrollOffset + VISIBLE_ITEMS).map((project, index) => <Project
                index={index}
                key={index}
                project={project}
                selectedIndex={selectedIndex}
                runningProcesses={runningProcesses}
                nodeModulesSizes={nodeModulesSizes}
                scrollOffset={scrollOffset}
              />)}

              {scrollOffset + VISIBLE_ITEMS < projects.length && (
                <Box marginLeft={1}>
                  <Text color="gray">
                    ↓ {projects.length - (scrollOffset + VISIBLE_ITEMS)} more below...
                  </Text>
                </Box>
              )}
            </>
          )}
        </Box>

        {view === 'details' && selectedProject && <ProjectDetails selectedProject={selectedProject} nodeModulesSizes={nodeModulesSizes} />}

        <Box
          flexDirection="column"
        >
          <Text color="gray">
            ↑/↓ or j/k: Navigate | Enter: nvim | s: toggle server | d: Toggle details | r: Refresh | c: Configure | q: Quit
          </Text>
        </Box>
      </Box>
    </>
  );
};

export default App;
