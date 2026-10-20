import { User } from '../types/auth';

const SESSION_STORAGE_KEY = 'formlocal_user_session';

export const getCurrentUser = (): User | null => {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed?.user || null;
    }
  } catch (e) {
    console.error('Failed to parse current user session', e);
  }
  return null;
};
