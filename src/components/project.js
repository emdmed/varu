import React from "react"
import { Box, Text } from "ink";

const Project = ({ scrollOffset, index, selectedIndex, runningProcesses, nodeModulesSizes, project }) => {

  const actualIndex = scrollOffset + index;
  const isSelected = actualIndex === selectedIndex;
  const processInfo = runningProcesses[project.path];
  const modulesInfo = nodeModulesSizes[project.path];

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
        {modulesInfo && modulesInfo.exists && (
          <Text color="magenta">deps {modulesInfo.sizeFormatted}</Text>
        )}
      </Box>
      {project.gitBranch && (
        <Text color="yellow">[{project.gitBranch}]</Text>
      )}
    </Box>
  )
}

export default Project
