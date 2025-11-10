import React, { useState } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import clipboardy from 'clipboardy';
import useConfig from './hooks/useConfig.js';
import { useProjectScanner } from './hooks/useProjectScanner.js';
import { useProjectNavigation } from './hooks/useProjectNavigation.js';
import { useProcessMonitor } from './hooks/useProcessMonitor.js';
import { useNodeModulesScanner } from './hooks/useNodeModulesScanner.js';
import { useSearchMode } from './hooks/useSearchMode.js';
import { useCloneMode } from './hooks/useCloneMode.js';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts.js';
import { usePortMonitor } from './hooks/usePortMonitor.js';
import ConfigurationComponent from './components/configuration/configuration-component.js';
import { findPackageJsonFiles } from './commands/project-scanner.js';
import { executeCommandInTerminal } from './commands/run-command.js';
import { killProcessesInPath } from './commands/process-monitor.js';
import { useScreenSize } from "./hooks/useScreenSize.js";
import { getNodeModulesSize } from './utils/folder-size.js';
import { saveNodeModulesSizes, saveProjectLastStarted } from './utils/config-manager.js';
import { validateProjectReadiness } from './utils/project-validator.js';
import Project from './components/project.js';
import SearchInput from './components/search/search-input.js';
import CloneInput from './components/clone/clone-input.js';
import CleanupConfirm from './components/cleanup/cleanup-confirm.js';
import HelpScreen from './components/help-screen.js';
import PortsSection from './components/ports-section.js';
import { deleteNodeModules, formatBytes, getStaleProjects } from './utils/node-modules-cleaner.js';
import { colors } from './utils/colors.js';

const VERSION = "0.0.11"
const App = () => {
  const { configuration, isConfig, loading, nodeModulesSizes: configSizes, projectLastStarted, reloadConfig } = useConfig();
  const { exit } = useApp();
  const size = useScreenSize();

  // View and UI state
  const [view, setView] = useState('list');
  const [helpMode, setHelpMode] = useState(false);
  const [showKeybindings, setShowKeybindings] = useState(false);
  const [cleanupMode, setCleanupMode] = useState(false);
  const [staleProjects, setStaleProjects] = useState([]);
  const [clipboardUrl, setClipboardUrl] = useState('');

  // Custom hooks
  const { projects, setProjects, scanning, setScanning, error, setError } = useProjectScanner(configuration, isConfig);
  const { runningProcesses, setRunningProcesses, checkedProjects, isInitialScan } = useProcessMonitor(projects);
  const { nodeModulesSizes, setNodeModulesSizes, scanAllNodeModules } = useNodeModulesScanner(projects, configSizes, reloadConfig);
  const { usedPorts } = usePortMonitor();
  const { checkDoubleTap } = useKeyboardShortcuts();

  // Calculate visible items for display
  const reservedLines = 3 + 2 + 2 + 4 + 2;
  const scrollIndicatorLines = 2;
  const availableLines = Math.max(5, size.height - reservedLines - scrollIndicatorLines);
  const VISIBLE_ITEMS = Math.max(5, availableLines);

  // Navigation and search hooks (need VISIBLE_ITEMS first)
  const navigation = useProjectNavigation(projects, VISIBLE_ITEMS);
  const { searchMode, searchQuery, filteredProjects, handleSearchChange, handleSearchSubmit, handleSearchCancel, clearSearch, openSearch } = useSearchMode(projects, navigation);

  // Callback for when clone auto-refresh finds the new project
  const handleCloneRefresh = (sortedProjects, newProjectIndex) => {
    setProjects(sortedProjects);
    if (newProjectIndex !== -1) {
      navigation.jumpToIndex(newProjectIndex);
    }
  };

  const { green } = colors

  // Helper function to validate if clipboard contains a git URL
  const isValidGitUrl = (url) => {
    if (!url || typeof url !== 'string') return false;
    const trimmed = url.trim();
    return (
      trimmed.startsWith('https://') ||
      trimmed.startsWith('git@') ||
      trimmed.startsWith('git://') ||
      trimmed.startsWith('ssh://')
    );
  };

  // Read clipboard and open clone mode with pre-filled URL if valid
  const handleOpenCloneMode = async () => {
    try {
      const clipboardContent = await clipboardy.read();
      if (isValidGitUrl(clipboardContent)) {
        setClipboardUrl(clipboardContent.trim());
      } else {
        setClipboardUrl('');
      }
    } catch (err) {
      // Silently fail - user can still manually paste
      setClipboardUrl('');
    }
    openCloneMode();
  };

  const { cloneMode, autoRefreshMode, handleCloneSubmit, handleCloneCancel, openCloneMode, cancelAutoRefresh } = useCloneMode(configuration, VISIBLE_ITEMS, handleCloneRefresh);

  const { selectedIndex, scrollOffset } = navigation;

  // Wrapper to reset clipboard URL when cancelling clone
  const handleCloneCancelWrapper = () => {
    setClipboardUrl('');
    handleCloneCancel();
  };

  useInput((input, key) => {
    if (view === 'config') return;
    if (searchMode) return;
    if (cloneMode) return;
    if (cleanupMode) return;

    if (helpMode) {
      setHelpMode(false);
      return;
    }

    // Navigation
    if (key.upArrow || input === 'k') {
      navigation.navigateUp();
    }
    if (key.downArrow || input === 'j') {
      navigation.navigateDown();
    }

    if (input === 'g') {
      if (checkDoubleTap('g', 300)) {
        navigation.jumpToTop();
      }
    }

    if (input === 'G') {
      navigation.jumpToBottom();
    }

    if (input === 'd') {
      if (checkDoubleTap('d', 300)) {
        const stale = getStaleProjects(projects, nodeModulesSizes, projectLastStarted, runningProcesses);
        setStaleProjects(stale);
        setCleanupMode(true);
      }
    }

    if (key.return) {
      if (filteredProjects[selectedIndex]) {
        openProject(filteredProjects[selectedIndex]);
      }
    }

    if (input === 's') {
      if (filteredProjects[selectedIndex]) {
        const processInfo = runningProcesses[filteredProjects[selectedIndex].path];

        if (processInfo && processInfo.hasDevServer) {
          stopServer(filteredProjects[selectedIndex]);
        } else {
          runDevServer(filteredProjects[selectedIndex]);
        }
      }
    }

    if (input === 'c') {
      handleOpenCloneMode();
    }

    if (input === 'C') {
      setView('config');
    }

    if (input === 'i' || input === '/') {
      openSearch();
    }

    if (input === 'r') {
      setScanning(true);
      navigation.reset();
      clearSearch();
      cancelAutoRefresh();
      findPackageJsonFiles(configuration.projectPath)
        .then((foundProjects) => {
          const sortedProjects = foundProjects.sort((a, b) =>
            a.projectName.localeCompare(b.projectName, undefined, { sensitivity: 'base' })
          );
          setProjects(sortedProjects);

          // Only scan projects that don't have cached sizes
          const projectsNeedingScan = sortedProjects.filter(
            p => !nodeModulesSizes[p.path]
          );

          if (projectsNeedingScan.length > 0) {
            scanAllNodeModules();
          }
        })
        .finally(() => {
          setScanning(false);
        });
    }

    if (input === 'x' && autoRefreshMode) {
      cancelAutoRefresh();
    }

    if (input === 'm' || input === 'S') {
      scanAllNodeModules();
    }

    if (input === 'I') {
      if (filteredProjects[selectedIndex]) {
        installDependencies(filteredProjects[selectedIndex]);
      }
    }

    if (input === '?') {
      setShowKeybindings(prev => !prev);
    }

    if (input === 'h') {
      setHelpMode(true);
    }

    if (input === 'q' || (key.ctrl && input === 'c')) {
      exit();
    }
  });

  const handleCloneSubmitWrapper = async (url) => {
    setError(null);
    setClipboardUrl(''); // Reset clipboard URL after submission

    try {
      const result = await handleCloneSubmit(url);

      if (result.type === 'success') {
        // Non-interactive clone completed
        setScanning(true);
        setNodeModulesSizes({});
        findPackageJsonFiles(configuration.projectPath)
          .then((foundProjects) => {
            const sortedProjects = foundProjects.sort((a, b) =>
              a.projectName.localeCompare(b.projectName, undefined, { sensitivity: 'base' })
            );
            setProjects(sortedProjects);

            const newProjectIndex = sortedProjects.findIndex(p =>
              p.projectName.toLowerCase() === result.repoName.toLowerCase()
            );
            if (newProjectIndex !== -1) {
              navigation.jumpToIndex(newProjectIndex);
            }
          })
          .catch((err) => {
            setError(`Error scanning projects: ${err.message}`);
          })
          .finally(() => {
            setScanning(false);
          });
      }
      // Interactive clone is handled by the hook's auto-refresh
    } catch (err) {
      setError(`Clone failed: ${err.message}`);
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleCleanupConfirm = async () => {
    if (staleProjects.length === 0) {
      setCleanupMode(false);
      return;
    }

    setCleanupMode(false);

    let successCount = 0;
    let failCount = 0;

    for (const project of staleProjects) {
      const result = await deleteNodeModules(project.path);
      if (result.success) {
        successCount++;

        setNodeModulesSizes(prev => ({
          ...prev,
          [project.path]: {
            exists: false,
            sizeBytes: 0,
            sizeFormatted: null,
            deletedAt: new Date().toISOString()
          }
        }));
      } else {
        failCount++;
      }
    }

    await saveNodeModulesSizes(nodeModulesSizes);

    if (failCount > 0) {
      setError(`Cleaned ${successCount} of ${staleProjects.length} projects (${failCount} failed)`);
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleCleanupCancel = () => {
    setCleanupMode(false);
  };

  const openProject = async (project) => {
    try {
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
      const validation = await validateProjectReadiness(project);

      if (!validation.valid) {
        const errorMessages = validation.errors.map(e => e.message).join(' ');
        setError(errorMessages);
        setTimeout(() => setError(null), 5000);
        return;
      }

      const devCommand = project.command || 'npm run dev';

      await executeCommandInTerminal({
        command: devCommand,
        path: project.path
      });

      await saveProjectLastStarted(project.path, new Date().toISOString());
    } catch (err) {
      setError(`Failed to run dev server: ${err.message}`);
      setTimeout(() => setError(null), 5000);
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

      const killedCount = await killProcessesInPath(project.path);

      if (killedCount > 0) {
        setError(null);
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

  const installDependencies = async (project) => {
    try {
      setError(null);

      await executeCommandInTerminal({
        command: 'npm install && echo "\\n✓ Installation complete! Press Enter to close..." && read',
        path: project.path
      });

      setTimeout(async () => {
        try {
          const sizeInfo = await getNodeModulesSize(project.path);
          setNodeModulesSizes(prev => ({
            ...prev,
            [project.path]: {
              ...sizeInfo,
              scannedAt: new Date().toISOString()
            }
          }));

          await saveNodeModulesSizes({
            ...nodeModulesSizes,
            [project.path]: {
              ...sizeInfo,
              scannedAt: new Date().toISOString()
            }
          });
        } catch (err) {
          console.error('Error updating node_modules size:', err);
        }
      }, 3000);

    } catch (err) {
      setError(`Failed to install dependencies: ${err.message}`);
      setTimeout(() => setError(null), 5000);
      console.error('Error installing dependencies:', err);
    }
  };

  const handleConfigComplete = (newConfig) => {
    setView('list');
    setScanning(true);
    setNodeModulesSizes({});
    clearSearch();
    findPackageJsonFiles(newConfig.projectPath)
      .then((foundProjects) => {
        const sortedProjects = foundProjects.sort((a, b) =>
          a.projectName.localeCompare(b.projectName, undefined, { sensitivity: 'base' })
        );
        setProjects(sortedProjects);
      })
      .finally(() => setScanning(false));
  };

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

  if (loading || scanning) {
    return (
      <>
        <Box>
          <Text>{'\x1Bc'}</Text>
        </Box>
        <Box flexDirection="column" padding={1}>
          <Text color={green}>
            {loading ? '⏳ Loading configuration...' : '🔍 Scanning for projects...'}
          </Text>
          {configuration?.projectPath && (
            <Text color={green}>Directory: {configuration.projectPath}</Text>
          )}
        </Box>
      </>
    );
  }

  if (error && projects.length === 0) {
    return (
      <>
        <Box>
          <Text>{'\x1Bc'}</Text>
        </Box>
        <Box flexDirection="column" padding={1}>
          <Text color="red">✗ {error}</Text>
          <Box marginTop={1}>
            <Text color={green}>
              Press <Text bold>C</Text> to reconfigure or <Text bold>q</Text> to quit
            </Text>
          </Box>
        </Box>
      </>
    );
  }

  return (
    <>
      <Box>
        <Text>{'\x1Bc'}</Text>
      </Box>
      <Box flexDirection="column" height={size.height} width={size.width} padding={1} justifyContent="space-between">

        <Box flexDirection="column" flexShrink={0}>

          <Box flexDirection='row' justifyContent='space-between' marginBottom={1}>
            <Text bold underline color={green}>
              Projects: {selectedIndex + 1}/{filteredProjects.length}
              {searchQuery && <Text color={green}> (filtered)</Text>}
            </Text>
            <Box gap={1}>
              <Text bold color={green}>Varu</Text>
              <Text dimColor color={green}>{VERSION}</Text>
            </Box>
          </Box>

          {searchMode && (
            <SearchInput
              onSubmit={handleSearchSubmit}
              onCancel={handleSearchCancel}
              onChange={handleSearchChange}
              initialValue={searchQuery}
            />
          )}

          {cloneMode && (
            <CloneInput
              onSubmit={handleCloneSubmitWrapper}
              onCancel={handleCloneCancelWrapper}
              initialValue={clipboardUrl}
            />
          )}

          {cleanupMode && (
            <CleanupConfirm
              staleProjects={staleProjects.map(p => ({
                ...p,
                sizeFormatted: nodeModulesSizes[p.path]?.sizeFormatted || '0 MB',
                sizeBytes: nodeModulesSizes[p.path]?.sizeBytes || 0,
                lastStarted: projectLastStarted[p.path]
              }))}
              totalSize={formatBytes(
                staleProjects.reduce((sum, p) => sum + (nodeModulesSizes[p.path]?.sizeBytes || 0), 0)
              )}
              onConfirm={handleCleanupConfirm}
              onCancel={handleCleanupCancel}
            />
          )}

          {helpMode && <HelpScreen />}

          {searchQuery && !searchMode && (
            <Box marginBottom={1}>
              <Text inverse dimColor>
                {" "}Filter: "{searchQuery}" ({filteredProjects.length} result{filteredProjects.length !== 1 ? 's' : ''})

                {' '}<Text dimColor>(press i to modify, r to clear)</Text>
                {" "}</Text>
            </Box>
          )}

          {error && (
            <Box marginBottom={1}>
              <Text color="red">✗ {error}</Text>
            </Box>
          )}

          <PortsSection usedPorts={usedPorts} projects={projects} runningProcesses={runningProcesses} />

          {filteredProjects.length === 0 ? (
            <Text color={green}>
              {searchQuery ? `No projects match "${searchQuery}"` : 'No projects found'}
            </Text>
          ) : (
            <>
              {scrollOffset > 0 && (
                <Box marginLeft={1}>
                  <Text color={green}>↑ {scrollOffset} more above...</Text>
                </Box>
              )}

              {filteredProjects.slice(scrollOffset, scrollOffset + VISIBLE_ITEMS).map((project, index) => <Project
                index={index}
                key={index}
                project={project}
                selectedIndex={selectedIndex}
                runningProcesses={runningProcesses}
                nodeModulesSizes={nodeModulesSizes}
                scrollOffset={scrollOffset}
                checkedProjects={checkedProjects}
              />)}

              {scrollOffset + VISIBLE_ITEMS < filteredProjects.length && (
                <Box marginLeft={1}>
                  <Text color={green}>
                    ↓ {filteredProjects.length - (scrollOffset + VISIBLE_ITEMS)} more below...
                  </Text>
                </Box>
              )}
            </>
          )}
        </Box>

        {showKeybindings ? (
          <Box flexDirection="column" flexShrink={0}>
            <Text color="gray">
              j/k: Navigate | gg/G: Jump top/bottom | Enter: nvim | s: Server | /: Search | dd: Cleanup | c: Clone | I: Install | m: Scan | r: Refresh | C: Config | h: Help | ?: Toggle Keys | q: Quit
            </Text>
          </Box>
        ) : (
          <Box flexDirection="column" flexShrink={0}>
            <Text dimColor>h for help</Text>
          </Box>
        )}
      </Box>
    </>
  );
};

export default App;
