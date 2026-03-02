import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { subscribeToParentChannel } from '../services/pusherService';

/**
 * Hook to manage Active SOS Modal
 * Use this in your main App component or Dashboard to show SOS alerts
 */
export const useSOSModal = () => {
  const { parent } = useAuth();
  const [activeAlert, setActiveAlert] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!parent?.id) return;

    // Subscribe to parent channel for SOS alerts
    const channel = subscribeToParentChannel(parent.id, {
      onSosAlert: (data) => {
        if (data.alert && data.alert.status === 'active') {
          setActiveAlert(data.alert);
          setIsVisible(true);
        }
      },
    });

    return () => {
      if (channel) {
        channel.unbind_all();
      }
    };
  }, [parent?.id]);

  const closeModal = () => {
    setIsVisible(false);
    setActiveAlert(null);
  };

  const viewAlert = () => {
    // Navigation will be handled by the modal component
    setIsVisible(false);
  };

  return {
    activeAlert,
    isVisible,
    closeModal,
    viewAlert,
  };
};

export default useSOSModal;

