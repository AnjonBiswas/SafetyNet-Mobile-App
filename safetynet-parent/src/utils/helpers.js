import { formatDistanceToNow, format, isToday, isYesterday, parseISO } from 'date-fns';

/**
 * Format time relative to now (e.g., "5 mins ago")
 */
export const formatRelativeTime = (timestamp) => {
  if (!timestamp) return 'Unknown';
  try {
    const date = typeof timestamp === 'string' ? parseISO(timestamp) : new Date(timestamp);
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (error) {
    return 'Unknown';
  }
};

/**
 * Format date for display
 */
export const formatDate = (timestamp) => {
  if (!timestamp) return 'Unknown';
  try {
    const date = typeof timestamp === 'string' ? parseISO(timestamp) : new Date(timestamp);
    if (isToday(date)) {
      return 'Today';
    } else if (isYesterday(date)) {
      return 'Yesterday';
    } else {
      return format(date, 'MMM dd, yyyy');
    }
  } catch (error) {
    return 'Unknown';
  }
};

/**
 * Format date time for display
 */
export const formatDateTime = (timestamp) => {
  if (!timestamp) return 'Unknown';
  try {
    const date = typeof timestamp === 'string' ? parseISO(timestamp) : new Date(timestamp);
    return format(date, 'MMM dd, yyyy HH:mm');
  } catch (error) {
    return 'Unknown';
  }
};

/**
 * Group notifications by date
 */
export const groupNotificationsByDate = (notifications) => {
  const groups = {
    today: [],
    yesterday: [],
    earlier: [],
  };

  notifications.forEach((notification) => {
    const date = notification.created_at
      ? typeof notification.created_at === 'string'
        ? parseISO(notification.created_at)
        : new Date(notification.created_at)
      : null;

    if (!date) {
      groups.earlier.push(notification);
      return;
    }

    if (isToday(date)) {
      groups.today.push(notification);
    } else if (isYesterday(date)) {
      groups.yesterday.push(notification);
    } else {
      groups.earlier.push(notification);
    }
  });

  return groups;
};

