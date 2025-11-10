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

const Project = ({ scrollOffset, index, selectedIndex, runningProcesses, nodeModulesSizes, project, checkedProjects }) => {
  const actualIndex = scrollOffset + index;
  const isSelected = actualIndex === selectedIndex;
  const processInfo = runningProcesses[project.path];
  const modulesInfo = nodeModulesSizes[project.path];
  const isRunning = processInfo && processInfo.hasDevServer
  const hasEditor = processInfo && processInfo.hasEditor
  const isChecked = checkedProjects?.has(project.path) ?? false;
  const { amber, green, lime, violet } = colors

  const getStatusIcon = () => {
    if (!isChecked) return '◐';
    if (isRunning) return '●'

    return '○';
  };

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
        <Text inverse={isSelected || isRunning} bold={isRunning} color={green} >
          {isSelected ? "▶ " : "  "}{getStatusIcon()}{" "}{project.projectName}{" "}
        </Text>
        {project.framework && (
          <Text bold={isSelected} color={green} dimColor>
            ({project.framework})
          </Text>
        )}
      </Box>
      <Box gap={1}>
        {hasEditor && (
          <Text inverse={isSelected} color={lime}>[vim]</Text>
        )}
        {shouldShowDeps(modulesInfo) && (
          <Text inverse={isSelected} color={violet}>deps {formatSize(modulesInfo.sizeFormatted)}</Text>
        )}
        {modulesInfo === undefined && <Text color={violet}>deps <Spinner /></Text>}
        <Text inverse={isSelected} color={amber}>[{getBranchDisplay(project.gitBranch)}]</Text>
      </Box>
    </Box>
  )
}

export default Project
