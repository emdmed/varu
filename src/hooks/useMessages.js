import { useState, useEffect } from 'react';

/**
 * Custom hook to manage temporary messages (success/error)
 */
export const useMessages = () => {
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const showSuccess = (message) => {
    setSuccessMessage(message);
  };

  return {
    successMessage,
    showSuccess
  };
};
