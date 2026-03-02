import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  subscribeToParentRealtime,
  subscribeToSosRealtime,
  unsubscribeRealtimeChannel,
} from '../services/realtimeService';

/**
 * useRealtime
 *
 * Generic hook to subscribe to realtime parent and SOS channels.
 * Returns latest event data and connection state while also allowing
 * custom callbacks for screen-specific behavior.
 *
 * @param {Object} options
 * @param {number} [options.childId] - Optional child ID to scope events
 * @param {number} [options.alertId] - Optional SOS alert ID for SOS channel
 * @param {Function} [options.onSosTriggered]
 * @param {Function} [options.onLocationUpdated]
 * @param {Function} [options.onGeofenceEvent]
 * @param {Function} [options.onChildStatusChanged]
 * @param {Function} [options.onSosLocationUpdated]
 */
const useRealtime = (options = {}) => {
  const {
    childId,
    alertId,
    onSosTriggered,
    onLocationUpdated,
    onGeofenceEvent,
    onChildStatusChanged,
    onSosLocationUpdated,
  } = options;

  const { parent, isAuthenticated } = useAuth();

  const parentChannelRef = useRef(null);
  const sosChannelRef = useRef(null);

  const [latestSos, setLatestSos] = useState(null);
  const [latestLocation, setLatestLocation] = useState(null);
  const [latestGeofenceEvent, setLatestGeofenceEvent] = useState(null);
  const [latestChildStatus, setLatestChildStatus] = useState(null);
  const [connectionState, setConnectionState] = useState(null);

  // Parent channel subscription
  useEffect(() => {
    if (!isAuthenticated || !parent?.id) return;

    const channel = subscribeToParentRealtime(parent.id, {
      onSosTriggered: (data) => {
        setLatestSos(data);
        if (!childId || data.alert?.child_id === childId) {
          onSosTriggered && onSosTriggered(data);
        }
      },
      onLocationUpdated: (data) => {
        setLatestLocation(data);
        if (!childId || data.child_id === childId) {
          onLocationUpdated && onLocationUpdated(data);
        }
      },
      onGeofenceEvent: (data) => {
        setLatestGeofenceEvent(data);
        onGeofenceEvent && onGeofenceEvent(data);
      },
      onChildStatusChanged: (data) => {
        setLatestChildStatus(data);
        onChildStatusChanged && onChildStatusChanged(data);
      },
      onConnectionStateChange: (states) => {
        setConnectionState(states.current);
      },
    });

    parentChannelRef.current = channel;

    return () => {
      if (parentChannelRef.current) {
        try {
          parentChannelRef.current.unbind_all();
        } catch (e) {
          // ignore
        }
        unsubscribeRealtimeChannel(parentChannelRef.current);
        parentChannelRef.current = null;
      }
    };
    // We intentionally don't include callbacks in deps to avoid re-subscribing on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, parent?.id, childId]);

  // SOS channel subscription (for specific alert)
  useEffect(() => {
    if (!alertId) return;

    const channel = subscribeToSosRealtime(alertId, (data) => {
      setLatestLocation(data);
      if (!childId || data.child_id === childId) {
        if (onSosLocationUpdated) {
          onSosLocationUpdated(data);
        } else if (onLocationUpdated) {
          onLocationUpdated(data);
        }
      }
    });

    sosChannelRef.current = channel;

    return () => {
      if (sosChannelRef.current) {
        try {
          sosChannelRef.current.unbind_all();
        } catch (e) {
          // ignore
        }
        unsubscribeRealtimeChannel(sosChannelRef.current);
        sosChannelRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alertId, childId]);

  return {
    latestSos,
    latestLocation,
    latestGeofenceEvent,
    latestChildStatus,
    connectionState,
  };
};

export default useRealtime;


