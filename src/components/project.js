import React from "react"
import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import { colors } from "../utils/colors";

const shouldShowDeps = (modulesInfo) => {
  if (!modulesInfo || !modulesInfo.exists) return false;
  const sizeMB = modulesInfo.sizeBytes / (1024 * 1024);
  return sizeMB >= 50; // Only show if >= 50MB
};

const getBranchDisplay = (branch) => {
  if (!branch) return 'none';
  return branch;
};

const formatSize = (sizeFormatted) => {
  return sizeFormatted ? sizeFormatted.replace(/\s+/g, '') : '';
};

const Project = ({ scrollOffset, index, selectedIndex, runningProcesses, nodeModulesSizes, project, checkedProjects, portToPidMap, scanningNodeModules }) => {
  const actualIndex = scrollOffset + index;
  const isSelected = actualIndex === selectedIndex;
  const processInfo = runningProcesses[project.path];
  const modulesInfo = nodeModulesSizes[project.path];
  const isRunning = processInfo && processInfo.hasDevServer
  const hasEditor = processInfo && processInfo.hasEditor
  const isChecked = checkedProjects?.has(project.path) ?? false;
  const { amber, green, violet } = colors

  const getProjectPort = () => {
    if (!isRunning || !processInfo || !processInfo.pids || !portToPidMap) return null;

    const projectPids = processInfo.pids;

    for (const [port, pid] of Object.entries(portToPidMap)) {
      if (projectPids.includes(Number(pid))) {
        return Number(port);
      }
    }

    return null;
  };

  const projectPort = getProjectPort();

  const borderStyle = isSelected ? "" : ""
  const borderColor = isSelected ? undefined : green

  return (
    <Box
      justifyContent="space-between"
      borderStyle={borderStyle}
      borderColor={borderColor}
      key={actualIndex}
    >
      <Box gap={1}>
        <Text bold={isRunning} color={green} >
          {isSelected ? "▶" : " "}
        </Text>
        {!isChecked && <Text color={green}><Spinner type="dots2" /></Text>}
        {isChecked && isRunning && <Text color={green}><Spinner type="arc" /></Text>}
        {isChecked && !isRunning && <Text color={green} dimColor>○</Text>}
        <Text inverse={isRunning || isSelected} color={green} >
          {" "}{project.projectName}{" "}
        </Text>
        {project.framework && (
          <Text bold={isSelected} color={green} dimColor>
            ({project.framework})
          </Text>
        )}
      </Box>
      <Box gap={1}>
        {projectPort && (
          <Text inverse={isSelected} color={green}>{projectPort}</Text>
        )}
        {hasEditor && (
          <Text inverse={isSelected} dimColor color={green}>[vim]</Text>
        )}
        {shouldShowDeps(modulesInfo) && !scanningNodeModules && (
          <Text inverse={isSelected} color={violet}>deps {formatSize(modulesInfo.sizeFormatted)}</Text>
        )}
        {(modulesInfo === undefined || scanningNodeModules) && <Text color={violet}>deps <Spinner /></Text>}
        <Text inverse={isSelected} color={amber}>[{getBranchDisplay(project.gitBranch)}]</Text>
      </Box>
    </Box>
  )
}

export default Project
