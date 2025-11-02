import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import useConfig from './hooks/useConfig.js';
import ConfigurationComponent from './components/configuration/configuration-component.js';
import { findPackageJsonFiles } from './commands/project-scanner.js';
import { executeCommandInTerminal } from './commands/run-command.js';
import { getTerminalsInPath } from './commands/process-monitor.js';
import { useScreenSize } from "./hooks/useScreenSize.js"

const App = () => {
  const { configuration, isConfig, loading } = useConfig();
  const [projects, setProjects] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [view, setView] = useState('list'); // 'list', 'details', 'config'
  const [error, setError] = useState(null);
  const { exit } = useApp();
  const size = useScreenSize();
  const [scrollOffset, setScrollOffset] = useState(0);
  const [runningProcesses, setRunningProcesses] = useState({});

  const reservedLines = 3 + 2 + 2 + 4 + 2; // base UI elements
  const detailsLines = (view === 'details' && projects[selectedIndex]) ? 10 : 0;
  const scrollIndicatorLines = 2; // space for scroll indicators
  const availableLines = Math.max(5, size.height - reservedLines - detailsLines - scrollIndicatorLines);
  const VISIBLE_ITEMS = Math.max(5, availableLines); // minimum 5 items

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

  // Monitor running processes every 3 seconds
  useEffect(() => {
    const checkRunningProcesses = async () => {
      if (projects.length === 0) return;

      const processMap = {};

      // Check each project for running processes
      await Promise.all(
        projects.map(async (project) => {
          try {
            const terminals = await getTerminalsInPath(project.path);
            if (terminals.length > 0) {
              processMap[project.path] = {
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
              };
            }
          } catch (err) {
            // Silently fail for individual project checks
          }
        })
      );

      setRunningProcesses(processMap);
    };

    // Initial check
    checkRunningProcesses();

    // Set up interval to check every 3 seconds
    const interval = setInterval(checkRunningProcesses, 3000);

    return () => clearInterval(interval);
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
        runDevServer(projects[selectedIndex]);
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

  const handleConfigComplete = (newConfig) => {
    setView('list');
    // Trigger re-scan
    setScanning(true);
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
    return <ConfigurationComponent onComplete={handleConfigComplete} />;
  }

  // Show reconfiguration screen
  if (view === 'config') {
    return <ConfigurationComponent onComplete={handleConfigComplete} />;
  }

  // Loading state
  if (loading || scanning) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="yellow">
          {loading ? '⏳ Loading configuration...' : '🔍 Scanning for projects...'}
        </Text>
        {configuration?.projectPath && (
          <Text color="gray">Directory: {configuration.projectPath}</Text>
        )}
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="red">✗ {error}</Text>
        <Box marginTop={1}>
          <Text color="gray">
            Press <Text bold>c</Text> to reconfigure or <Text bold>q</Text> to quit
          </Text>
        </Box>
      </Box>
    );
  }

  const selectedProject = projects[selectedIndex];

  return (
    <Box flexDirection="column" height={size.height} width={size.width} padding={1}>

      <Box flexDirection="column" marginBottom={1}>
        <Box gap={1} marginBottom={1}>
          <Text bold>Varu</Text>
          <Text dimColor>0.0.4</Text>

        </Box>

        <Box marginBottom={1}><Text bold underline>
          Projects: {selectedIndex + 1}/{projects.length}
        </Text></Box>

        {projects.length === 0 ? (
          <Text color="yellow">No projects found</Text>
        ) : (
          <>
            {scrollOffset > 0 && (
              <Box marginLeft={1}>
                <Text color="gray">↑ {scrollOffset} more above...</Text>
              </Box>
            )}

            {projects.slice(scrollOffset, scrollOffset + VISIBLE_ITEMS).map((project, index) => {
              const actualIndex = scrollOffset + index;
              const isSelected = actualIndex === selectedIndex;
              const processInfo = runningProcesses[project.path];

              return (
                <Box justifyContent="space-between" borderStyle={isSelected ? "round" : ""} key={actualIndex} >
                  <Box gap={1}>
                    <Text inverse={isSelected} bold >
                      {" "} {project.projectName} {" "}
                    </Text>
                    <Text color="gray">
                      ({project.framework})
                    </Text>
                    {processInfo && processInfo.hasDevServer && (
                      <Text inverse color="green">{" "}running{" "}</Text>
                    )}
                    {processInfo && processInfo.hasEditor && (
                      <Text color="cyan">vim</Text>
                    )}
                  </Box>
                  {project.gitBranch && (
                    <Text color="yellow">[{project.gitBranch}]</Text>
                  )}
                </Box>
              );
            })}

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

      {view === 'details' && selectedProject && (
        <Box
          flexDirection="column"
          marginBottom={1}
          borderStyle="round"
          borderColor="yellow"
          paddingX={1}
          paddingY={0}
        >
          <Text bold color="yellow">Project Details:</Text>
          <Text>
            <Text bold>Name: </Text>
            {selectedProject.projectName}
          </Text>
          <Text>
            <Text bold>Framework: </Text>
            {selectedProject.framework}
          </Text>
          <Text>
            <Text bold>Path: </Text>
            <Text color="gray">{selectedProject.path}</Text>
          </Text>
          {selectedProject.command !== 'N/A' && (
            <Text>
              <Text bold>Command: </Text>
              <Text color="green">{selectedProject.command}</Text>
            </Text>
          )}
          {selectedProject.gitBranch && (
            <Text>
              <Text bold>Git Branch: </Text>
              <Text color="yellow">{selectedProject.gitBranch}</Text>
            </Text>
          )}
          {selectedProject.availableBranches?.length > 0 && (
            <Text>
              <Text bold>Other Branches: </Text>
              <Text color="gray">
                {selectedProject.availableBranches.slice(0, 3).join(', ')}
                {selectedProject.availableBranches.length > 3 && '...'}
              </Text>
            </Text>
          )}
        </Box>
      )}

      <Box
        flexDirection="column"
      >
        <Text color="gray">
          ↑/↓ or j/k: Navigate | Enter: Open in nvim | s: Run dev server | d: Toggle details
        </Text>
        <Text color="gray">
          r: Refresh | c: Configure | q: Quit
        </Text>

      </Box>
    </Box>
  );
};

export default App;
