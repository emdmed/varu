import React from "react"
import { Box, Text } from "ink"

const ProjectDetails = ({ selectedProject, nodeModulesSizes }) => {
  return (<Box
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
    {nodeModulesSizes[selectedProject.path] && (
      <Text>
        <Text bold>node_modules: </Text>
        {nodeModulesSizes[selectedProject.path].exists ? (
          <Text color="magenta">
            {nodeModulesSizes[selectedProject.path].sizeFormatted}
          </Text>
        ) : (
          <Text color="gray">Not installed</Text>
        )}
      </Text>
    )}
  </Box>)
}

export default ProjectDetails
