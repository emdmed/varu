import { useState, useEffect } from 'react';
import { getPortToPidMap } from '../utils/port-scanner.js';

/**
 * Custom hook to monitor used ports with PID mappings
 */
export const usePortMonitor = () => {
  const [portToPidMap, setPortToPidMap] = useState({});
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const scanPorts = async () => {
      if (!isMounted) return;

      setIsScanning(true);
      try {
        const portMap = await getPortToPidMap();
        if (isMounted) {
          setPortToPidMap(portMap);
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
    portToPidMap,
    isScanning
  };
};
