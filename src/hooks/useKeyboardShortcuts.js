import { useState } from 'react';

/**
 * Custom hook to manage keyboard shortcuts that require double-tap (like 'gg')
 */
export const useKeyboardShortcuts = () => {
  const [lastKey, setLastKey] = useState(null);
  const [lastKeyTime, setLastKeyTime] = useState(0);

  const checkDoubleTap = (key, timeout = 500) => {
    const now = Date.now();
    if (lastKey === key && now - lastKeyTime < timeout) {
      setLastKey(null);
      setLastKeyTime(0);
      return true;
    }
    setLastKey(key);
    setLastKeyTime(now);
    return false;
  };

  const resetKeys = () => {
    setLastKey(null);
    setLastKeyTime(0);
  };

  return {
    lastKey,
    lastKeyTime,
    checkDoubleTap,
    resetKeys,
    setLastKey,
    setLastKeyTime
  };
};
