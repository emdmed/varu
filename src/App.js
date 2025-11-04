import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import useConfig from './hooks/useConfig.js';
import ConfigurationComponent from './components/configuration/configuration-component.js';
import { findPackageJsonFiles } from './commands/project-scanner.js';
import { executeCommandInTerminal } from './commands/run-command.js';
import { getTerminalsInPath, killProcessesInPath } from './commands/process-monitor.js';
import { useScreenSize } from "./hooks/useScreenSize.js";
import { getNodeModulesSize } from './utils/folder-size.js';
import { saveNodeModulesSizes } from './utils/config-manager.js';
import Project from './components/project.js';
import ProjectDetails from './components/project-details.js';
import SearchInput from './components/search/search-input.js';
import CloneInput from './components/clone/clone-input.js';
import { cloneRepository } from './commands/clone-repo.js';

const VERSION = "0.0.9"
const App = () => {
  const { configuration, isConfig, loading, nodeModulesSizes: configSizes, reloadConfig } = useConfig();
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

      setSuccessMessage(`✓ Scan complete! Updated sizes for ${projects.length} project${projects.length > 1 ? 's' : ''}.`);
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
          setSuccessMessage(`✓ Successfully cloned ${expectedRepoName}`);
          setAutoRefreshMode(false);
          setExpectedRepoName(null);
        } else if (refreshCount >= maxRefreshes) {
          setAutoRefreshMode(false);
          setExpectedRepoName(null);
          setSuccessMessage(null);
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

    if (input === 'd') {
      setView(view === 'details' ? 'list' : 'details');
    }

    if (input === 'c') {
      setView('config');
    }

    if (input === 'i') {
      setSearchMode(true);
    }

    if (input === 'g') {
      setCloneMode(true);
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
        .finally(() => setScanning(false));
    }

    if (input === 'x' && autoRefreshMode) {
      setAutoRefreshMode(false);
      setExpectedRepoName(null);
      setSuccessMessage(null);
    }

    if (input === 'S') {
      scanAllNodeModules();
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
        setSuccessMessage(`✓ ${result.message}. Auto-refreshing to detect completion...`);
        setCloning(false);
        setExpectedRepoName(result.repoName);
        setAutoRefreshMode(true);
      } else {
        setSuccessMessage(`✓ ${result.message}`);

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

      const killedCount = await killProcessesInPath(project.path);

      if (killedCount > 0) {
        setSuccessMessage(`✓ Stopped ${killedCount} process${killedCount > 1 ? 'es' : ''} for ${project.projectName}`);
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

          {cloning && (
            <Box marginBottom={1}>
              <Text color="yellow">⏳ Cloning repository...</Text>
            </Box>
          )}

          {autoRefreshMode && expectedRepoName && (
            <Box marginBottom={1}>
              <Text color="cyan">🔄 Watching for {expectedRepoName}... (auto-refreshing every 10s, press x to cancel)</Text>
            </Box>
          )}

          {scanningNodeModules && (
            <Box marginBottom={1}>
              <Text color="yellow">
                📊 Scanning node_modules... ({scanProgress.current}/{scanProgress.total})
              </Text>
            </Box>
          )}

          {searchQuery && !searchMode && (
            <Box marginBottom={1}>
              <Text inverse dimColor>
                {" "}Filter: "{searchQuery}" ({filteredProjects.length} result{filteredProjects.length !== 1 ? 's' : ''})

                {' '}<Text dimColor>(press i to modify, r to clear)</Text>
                {" "}</Text>
            </Box>
          )}

          {successMessage && (
            <Box marginBottom={1}>
              <Text color="green">{successMessage}</Text>
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

        {view === 'details' && selectedProject && <ProjectDetails selectedProject={selectedProject} nodeModulesSizes={nodeModulesSizes} />}

        <Box
          flexDirection="column"
        >
          <Text color="gray">
            ↑/↓ or j/k: Navigate | Enter: nvim | s: toggle server | d: Toggle details | i: Filter | g: Clone repo | S: Scan sizes | r: Refresh | c: Configure | q: Quit
          </Text>
        </Box>
      </Box>
    </>
  );
};

export default App;
