import { useState, useEffect } from 'react';

/**
 * Custom hook to manage search functionality
 */
export const useSearchMode = (projects, navigation) => {
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProjects = searchQuery
    ? projects.filter(project =>
      project.projectName.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : projects;

  // Reset selection when search query changes
  useEffect(() => {
    if (searchQuery && filteredProjects.length > 0) {
      navigation.reset();
    }
  }, [searchQuery, filteredProjects.length, navigation]);

  const handleSearchSubmit = (query) => {
    setSearchQuery(query);
    setSearchMode(false);
  };

  const handleSearchCancel = () => {
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
    handleSearchSubmit,
    handleSearchCancel,
    clearSearch,
    openSearch
  };
};
