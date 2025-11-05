import { useState, useEffect } from 'react';

/**
 * Custom hook to manage project selection and scrolling
 */
export const useProjectNavigation = (filteredProjects, visibleItems) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);

  const navigateUp = () => {
    setSelectedIndex(prev => {
      const newIndex = Math.max(0, prev - 1);
      if (newIndex < scrollOffset) {
        setScrollOffset(newIndex);
      }
      return newIndex;
    });
  };

  const navigateDown = () => {
    setSelectedIndex(prev => {
      const newIndex = Math.min(filteredProjects.length - 1, prev + 1);
      if (newIndex >= scrollOffset + visibleItems) {
        setScrollOffset(newIndex - visibleItems + 1);
      }
      return newIndex;
    });
  };

  const jumpToTop = () => {
    setSelectedIndex(0);
    setScrollOffset(0);
  };

  const jumpToBottom = () => {
    const lastIndex = filteredProjects.length - 1;
    setSelectedIndex(lastIndex);
    setScrollOffset(Math.max(0, lastIndex - visibleItems + 1));
  };

  const jumpToIndex = (index) => {
    setSelectedIndex(index);
    setScrollOffset(Math.max(0, index - Math.floor(visibleItems / 2)));
  };

  const reset = () => {
    setSelectedIndex(0);
    setScrollOffset(0);
  };

  return {
    selectedIndex,
    setSelectedIndex,
    scrollOffset,
    setScrollOffset,
    navigateUp,
    navigateDown,
    jumpToTop,
    jumpToBottom,
    jumpToIndex,
    reset
  };
};
