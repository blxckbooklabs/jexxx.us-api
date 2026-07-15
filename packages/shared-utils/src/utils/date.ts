import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

export const formatDate = (date: string | Date): string => {
  return dayjs(date).format('MMM D, YYYY');
};

export const formatDateTime = (date: string | Date): string => {
  return dayjs(date).format('MMM D, YYYY h:mm A');
};

export const timeAgo = (date: string | Date): string => {
  return dayjs(date).fromNow();
};

export const isToday = (date: string | Date): boolean => {
  return dayjs(date).isSame(dayjs(), 'day');
};
