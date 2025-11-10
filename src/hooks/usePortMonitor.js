import { useState, useEffect } from 'react';
import { getUsedPorts } from '../utils/port-scanner.js';

/**
 * Custom hook to monitor used ports
 */
export const usePortMonitor = () => {
  const [usedPorts, setUsedPorts] = useState([]);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const scanPorts = async () => {
      if (!isMounted) return;

      setIsScanning(true);
      try {
        const ports = await getUsedPorts();
        if (isMounted) {
          setUsedPorts(ports);
        }
      } catch (error) {
        console.error('Error in port monitoring:', error);
      } finally {
        if (isMounted) {
          setIsScanning(false);
        }
      }
    };

    // Initial scan
    scanPorts();

    // Refresh every 5 seconds
    const interval = setInterval(scanPorts, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return {
    usedPorts,
    isScanning
  };
};
