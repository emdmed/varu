import React from "react"
import { Box, Text } from "ink";
import Spinner from "ink-spinner";

const Project = ({ scrollOffset, index, selectedIndex, runningProcesses, nodeModulesSizes, project }) => {
  const actualIndex = scrollOffset + index;
  const isSelected = actualIndex === selectedIndex;
  const processInfo = runningProcesses[project.path];
  const modulesInfo = nodeModulesSizes[project.path];
  const isRunning = processInfo && processInfo.hasDevServer
  const hasEditor = processInfo && processInfo.hasEditor

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
          {isSelected ? ">" : " "} {project.projectName} {isRunning ? <Spinner type="triangle" /> : null} {" "}
        </Text>
        <Text bold={isSelected} color="gray">
          ({project.framework})
        </Text>

      </Box>
      <Box gap={1}>
        {hasEditor && (
          <Text bold={isSelected} color="cyan">{" "}[vim]{" "}</Text>
        )}
        {modulesInfo && modulesInfo.exists && (
          <Text bold={isSelected} color="magenta">deps {modulesInfo.sizeFormatted}</Text>
        )}
        {modulesInfo === undefined && <Text color="magenta"><Spinner /></Text>}
        {project.gitBranch && (
          <Text bold={isSelected} color="yellow">[{project.gitBranch}]</Text>
        )}
      </Box>
    </Box>
  )
}

export default Project
