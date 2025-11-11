import { useState, useEffect } from 'react';

/**
 * Custom hook to manage search functionality
 */
export const useSearchMode = (projects, navigation) => {
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [liveSearchQuery, setLiveSearchQuery] = useState('');

  const activeQuery = searchMode ? liveSearchQuery : searchQuery;
  const filteredProjects = activeQuery
    ? projects.filter(project =>
      project.projectName.toLowerCase().includes(activeQuery.toLowerCase())
    )
    : projects;

  // Reset selection when search query changes
  useEffect(() => {
    if (searchQuery && filteredProjects.length > 0) {
      navigation.reset();
    }
  }, [searchQuery]);

  const handleSearchChange = (query) => {
    setLiveSearchQuery(query);
  };

  const handleSearchSubmit = (query) => {
    setSearchQuery(query);
    setLiveSearchQuery('');
    setSearchMode(false);
  };

  const handleSearchCancel = () => {
    setLiveSearchQuery('');
    setSearchMode(false);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchMode(false);
  };

  const openSearch = () => {
    setSearchMode(true);
  };

  return {
    searchMode,
    searchQuery,
    filteredProjects,
    handleSearchChange,
    handleSearchSubmit,
    handleSearchCancel,
    clearSearch,
    openSearch
  };
};
