import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import useConfig from './hooks/useConfig.js';
import ConfigurationComponent from './components/configuration/configuration-component.js';
import { findPackageJsonFiles } from './commands/project-scanner.js';
import { executeCommandInTerminal } from './commands/run-command.js';
import { getTerminalsInPath, killProcessesInPath } from './commands/process-monitor.js';
import { useScreenSize } from "./hooks/useScreenSize.js";
import { getNodeModulesSize } from './utils/folder-size.js';
import { saveNodeModulesSizes, saveProjectLastStarted } from './utils/config-manager.js';
import { validateProjectReadiness } from './utils/project-validator.js';
import Project from './components/project.js';
import SearchInput from './components/search/search-input.js';
import CloneInput from './components/clone/clone-input.js';
import CleanupConfirm from './components/cleanup/cleanup-confirm.js';
import HelpScreen from './components/help-screen.js';
import { cloneRepository } from './commands/clone-repo.js';
import { deleteNodeModules, formatBytes } from './utils/node-modules-cleaner.js';

const VERSION = "0.0.9"
const App = () => {
  const { configuration, isConfig, loading, nodeModulesSizes: configSizes, projectLastStarted, reloadConfig } = useConfig();
  const [projects, setProjects] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [view, setView] = useState('list');
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const { exit } = useApp();
  const size = useScreenSize();
  const [scrollOffset, setScrollOffset] = useState(0);
  const [runningProcesses, setRunningProcesses] = useState({});
  const [nodeModulesSizes, setNodeModulesSizes] = useState({});
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [cloneMode, setCloneMode] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [autoRefreshMode, setAutoRefreshMode] = useState(false);
  const [expectedRepoName, setExpectedRepoName] = useState(null);
  const [scanningNodeModules, setScanningNodeModules] = useState(false);
  const [scanProgress, setScanProgress] = useState({ current: 0, total: 0 });
  const [cleanupMode, setCleanupMode] = useState(false);
  const [staleProjects, setStaleProjects] = useState([]);
  const [cleaning, setCleaning] = useState(false);
  const [lastKey, setLastKey] = useState(null);
  const [lastKeyTime, setLastKeyTime] = useState(0);
  const [helpMode, setHelpMode] = useState(false);

  const reservedLines = 3 + 2 + 2 + 4 + 2;
  const detailsLines = (view === 'details' && projects[selectedIndex]) ? 10 : 0;
  const searchLines = searchMode ? 2 : 0;
  const cloneLines = cloneMode ? 2 : 0;
  const scrollIndicatorLines = 2;
  const availableLines = Math.max(5, size.height - reservedLines - detailsLines - searchLines - cloneLines - scrollIndicatorLines);
  const VISIBLE_ITEMS = Math.max(5, availableLines);

  const filteredProjects = searchQuery
    ? projects.filter(project =>
      project.projectName.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : projects;

  const scanAllNodeModules = useCallback(async () => {
    if (scanningNodeModules || projects.length === 0) return;

    console.log('Starting node_modules scan for', projects.length, 'projects');
    setScanningNodeModules(true);
    setScanProgress({ current: 0, total: projects.length });
    setError(null);

    const newSizes = {};

    try {
      for (let i = 0; i < projects.length; i++) {
        const project = projects[i];
        const startTime = Date.now();

        try {
          const sizeInfo = await getNodeModulesSize(project.path);

          newSizes[project.path] = {
            ...sizeInfo,
            scannedAt: new Date().toISOString()
          };
        } catch (err) {
          newSizes[project.path] = {
            exists: false,
            sizeBytes: 0,
            sizeFormatted: null,
            scannedAt: new Date().toISOString(),
            error: err.message
          };
        }

        setScanProgress({ current: i + 1, total: projects.length });
        setNodeModulesSizes({ ...newSizes });


        const elapsed = Date.now() - startTime;
        if (elapsed < 300) {
          await new Promise(resolve => setTimeout(resolve, 300 - elapsed));
        }
      }

      console.log('Saving', Object.keys(newSizes).length, 'sizes to config');
      await saveNodeModulesSizes(newSizes);
      await reloadConfig();
    } catch (err) {
      console.error('Scan error:', err);
      setError(`Scan failed: ${err.message}`);
      setTimeout(() => setError(null), 5000);
    } finally {
      setScanningNodeModules(false);
      setScanProgress({ current: 0, total: 0 });
    }
  }, [projects, scanningNodeModules, reloadConfig]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (isConfig && configuration?.projectPath) {
      setScanning(true);
      setError(null);
      findPackageJsonFiles(configuration.projectPath)
        .then((foundProjects) => {
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

  useEffect(() => {
    if (searchQuery && filteredProjects.length > 0) {
      setSelectedIndex(0);
      setScrollOffset(0);
    }
  }, [searchQuery]);

  useEffect(() => {
    if (configSizes && Object.keys(configSizes).length > 0) {
      setNodeModulesSizes(configSizes);
    }
  }, [configSizes]);

  useEffect(() => {
    if (projects.length === 0 || scanning || scanningNodeModules) return;

    const hasSizes = configSizes && Object.keys(configSizes).length > 0;

    if (!hasSizes && projects.length > 0) {
      console.log('Auto-scanning node_modules on first load...', projects.length, 'projects');
      scanAllNodeModules();
    }
  }, [projects, configSizes, scanning, scanningNodeModules, scanAllNodeModules]);

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
          setRunningProcesses(prev => {
            const newState = { ...prev };
            delete newState[project.path];
            return newState;
          });
        }
      } catch (err) {
      }

      currentIndex = (currentIndex + 1) % projects.length;
    };

    const interval = setInterval(checkNextProject, 500);

    checkNextProject();

    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, [projects]);

  useEffect(() => {
    if (!autoRefreshMode || !expectedRepoName) return;

    let refreshCount = 0;
    const maxRefreshes = 12;

    const refreshProjects = async () => {
      refreshCount++;

      try {
        const foundProjects = await findPackageJsonFiles(configuration.projectPath);
        const sortedProjects = foundProjects.sort((a, b) =>
          a.projectName.localeCompare(b.projectName, undefined, { sensitivity: 'base' })
        );

        const newProjectIndex = sortedProjects.findIndex(p =>
          p.projectName.toLowerCase() === expectedRepoName.toLowerCase()
        );

        if (newProjectIndex !== -1) {
          setProjects(sortedProjects);
          setSelectedIndex(newProjectIndex);
          setScrollOffset(Math.max(0, newProjectIndex - Math.floor(VISIBLE_ITEMS / 2)));
          setAutoRefreshMode(false);
          setExpectedRepoName(null);
        } else if (refreshCount >= maxRefreshes) {
          setAutoRefreshMode(false);
          setExpectedRepoName(null);
        } else {
          setProjects(sortedProjects);
        }
      } catch (err) {
      }
    };

    const interval = setInterval(refreshProjects, 10000);

    const initialTimeout = setTimeout(refreshProjects, 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(initialTimeout);
    };
  }, [autoRefreshMode, expectedRepoName, configuration]);

  useInput((input, key) => {
    if (view === 'config') return;
    if (searchMode) return;
    if (cloneMode) return;
    if (cleanupMode) return;

    if (helpMode) {
      setHelpMode(false);
      return;
    }


    if (key.upArrow || input === 'k') {
      setSelectedIndex(prev => {
        const newIndex = Math.max(0, prev - 1);
        if (newIndex < scrollOffset) {
          setScrollOffset(newIndex);
        }
        return newIndex;
      });
    }
    if (key.downArrow || input === 'j') {
      setSelectedIndex(prev => {
        const newIndex = Math.min(filteredProjects.length - 1, prev + 1);
        if (newIndex >= scrollOffset + VISIBLE_ITEMS) {
          setScrollOffset(newIndex - VISIBLE_ITEMS + 1);
        }
        return newIndex;
      });
    }

    if (input === 'g') {
      const now = Date.now();
      if (lastKey === 'g' && now - lastKeyTime < 500) {
        setSelectedIndex(0);
        setScrollOffset(0);
        setLastKey(null);
        setLastKeyTime(0);
        return;
      }
      setLastKey('g');
      setLastKeyTime(now);
      setTimeout(() => {
        if (lastKey === 'g') {
          setCloneMode(true);
          setLastKey(null);
          setLastKeyTime(0);
        }
      }, 500);
    }

    if (input === 'G') {
      const lastIndex = filteredProjects.length - 1;
      setSelectedIndex(lastIndex);
      setScrollOffset(Math.max(0, lastIndex - VISIBLE_ITEMS + 1));
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
      setView('config');
    }

    if (input === 'i' || input === '/') {
      setSearchMode(true);
    }

    if (input === 'r') {
      setScanning(true);
      setSelectedIndex(0);
      setScrollOffset(0);
      setNodeModulesSizes({});
      setSearchQuery('');
      setSearchMode(false);
      setAutoRefreshMode(false);
      setExpectedRepoName(null);
      findPackageJsonFiles(configuration.projectPath)
        .then((foundProjects) => {
          const sortedProjects = foundProjects.sort((a, b) =>
            a.projectName.localeCompare(b.projectName, undefined, { sensitivity: 'base' })
          );
          setProjects(sortedProjects);
        })
        .finally(() => {
          setScanning(false);
          scanAllNodeModules();
        });
    }

    if (input === 'x' && autoRefreshMode) {
      setAutoRefreshMode(false);
      setExpectedRepoName(null);
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
      setHelpMode(true);
    }

    if (input === 'q' || (key.ctrl && input === 'c')) {
      exit();
    }
  });

  const handleSearchSubmit = (query) => {
    setSearchQuery(query);
    setSearchMode(false);
  };

  const handleSearchCancel = () => {
    setSearchMode(false);
  };

  const handleCloneSubmit = async (url) => {
    setCloneMode(false);
    setCloning(true);
    setError(null);

    try {
      const result = await cloneRepository({
        url,
        destinationPath: configuration.projectPath
      });

      if (result.interactive) {
        setCloning(false);
        setExpectedRepoName(result.repoName);
        setAutoRefreshMode(true);
      } else {

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
              setSelectedIndex(newProjectIndex);
              setScrollOffset(Math.max(0, newProjectIndex - Math.floor(VISIBLE_ITEMS / 2)));
            }
          })
          .catch((err) => {
            setError(`Error scanning projects: ${err.message}`);
          })
          .finally(() => {
            setScanning(false);
            setCloning(false);
          });
      }
    } catch (err) {
      setError(`Clone failed: ${err.message}`);
      setCloning(false);
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleCloneCancel = () => {
    setCloneMode(false);
  };

  const handleCleanupConfirm = async () => {
    if (staleProjects.length === 0) {
      setCleanupMode(false);
      return;
    }

    setCleanupMode(false);
    setCleaning(true);

    let successCount = 0;
    let failCount = 0;
    let totalFreed = 0;

    for (const project of staleProjects) {
      const result = await deleteNodeModules(project.path);
      if (result.success) {
        successCount++;
        totalFreed += project.sizeBytes || 0;

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

    setCleaning(false);

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
    setSearchQuery('');
    setSearchMode(false);
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

  if (error && projects.length === 0) {
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

  const selectedProject = filteredProjects[selectedIndex];

  return (
    <>
      <Box>
        <Text>{'\x1Bc'}</Text>
      </Box>
      <Box flexDirection="column" height={size.height} width={size.width} padding={1}>

        <Box flexDirection="column" marginBottom={1}>

          <Box flexDirection='row' justifyContent='space-between' marginBottom={1}>
            <Text bold underline>
              Projects: {selectedIndex + 1}/{filteredProjects.length}
              {searchQuery && <Text color="yellow"> (filtered)</Text>}
            </Text>
            <Box gap={1}>
              <Text bold>Varu</Text>
              <Text dimColor>{VERSION}</Text>
            </Box>
          </Box>

          {searchMode && (
            <SearchInput
              onSubmit={handleSearchSubmit}
              onCancel={handleSearchCancel}
              initialValue={searchQuery}
            />
          )}

          {cloneMode && (
            <CloneInput
              onSubmit={handleCloneSubmit}
              onCancel={handleCloneCancel}
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

          {filteredProjects.length === 0 ? (
            <Text color="yellow">
              {searchQuery ? `No projects match "${searchQuery}"` : 'No projects found'}
            </Text>
          ) : (
            <>
              {scrollOffset > 0 && (
                <Box marginLeft={1}>
                  <Text color="gray">↑ {scrollOffset} more above...</Text>
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
              />)}

              {scrollOffset + VISIBLE_ITEMS < filteredProjects.length && (
                <Box marginLeft={1}>
                  <Text color="gray">
                    ↓ {filteredProjects.length - (scrollOffset + VISIBLE_ITEMS)} more below...
                  </Text>
                </Box>
              )}
            </>
          )}
        </Box>

        <Box
          flexDirection="column"
        >
          <Text color="gray">
            j/k: Navigate | gg/G: Jump top/bottom | Enter: nvim | s: Server | /: Search | dd: Cleanup | g: Clone | I: Install | m: Scan | r: Refresh | c: Config | ?: Help | q: Quit
          </Text>
        </Box>
      </Box>
    </>
  );
};

export default App;
