import React from "react"
import { Box, Text } from "ink";
import Spinner from "ink-spinner";

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

const Project = ({ scrollOffset, index, selectedIndex, runningProcesses, nodeModulesSizes, project, checkedProjects }) => {
  const actualIndex = scrollOffset + index;
  const isSelected = actualIndex === selectedIndex;
  const processInfo = runningProcesses[project.path];
  const modulesInfo = nodeModulesSizes[project.path];
  const isRunning = processInfo && processInfo.hasDevServer
  const hasEditor = processInfo && processInfo.hasEditor
  const isChecked = checkedProjects?.has(project.path) ?? false;

  const getStatusIcon = () => {
    if (!isChecked) return '◐';
    if (isRunning) return '●'

    return '○';
  };

  const borderStyle = isSelected ? "" : ""
  const borderColor = isSelected ? undefined : "gray"

  return (
    <Box
      justifyContent="space-between"
      borderStyle={borderStyle}
      borderColor={borderColor}
      key={actualIndex}
    >
      <Box gap={1}>
        <Text inverse={isSelected || isRunning} bold color={isRunning ? "green" : "white"} >
          {isSelected ? "▶ " : "  "}{getStatusIcon()}{" "}{project.projectName}{" "}
        </Text>
        {project.framework && (
          <Text bold={isSelected} color="gray">
            ({project.framework})
          </Text>
        )}
      </Box>
      <Box gap={1}>
        {hasEditor && (
          <Text bold={isSelected} color="cyan">[vim]</Text>
        )}
        {shouldShowDeps(modulesInfo) && (
          <Text bold={isSelected} color="magenta">deps {formatSize(modulesInfo.sizeFormatted)}</Text>
        )}
        {modulesInfo === undefined && <Text color="magenta">deps <Spinner /></Text>}
        <Text bold={isSelected} color={project.gitBranch ? "yellow" : "gray"}>[{getBranchDisplay(project.gitBranch)}]</Text>
      </Box>
    </Box>
  )
}

export default Project
