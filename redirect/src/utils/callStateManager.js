// Persist call state across page reloads and navigation

const CALL_STATE_KEY = 'active_call_state';
const GROUP_CALL_STATE_KEY = 'active_group_call_state';

export const saveCallState = (callState) => {
  try {
    const key = callState.type === 'group' ? GROUP_CALL_STATE_KEY : CALL_STATE_KEY;
    localStorage.setItem(key, JSON.stringify({
      ...callState,
      timestamp: Date.now()
    }));
  } catch (error) {
    console.error('Failed to save call state:', error);
  }
};

export const getCallState = (type = 'one-to-one') => {
  try {
    const key = type === 'group' ? GROUP_CALL_STATE_KEY : CALL_STATE_KEY;
    const saved = localStorage.getItem(key);
    if (!saved) return null;
    
    const state = JSON.parse(saved);
    
    // Expire after 2 hours
    if (Date.now() - state.timestamp > 2 * 60 * 60 * 1000) {
      clearCallState(type);
      return null;
    }
    
    return state;
  } catch (error) {
    console.error('Failed to get call state:', error);
    return null;
  }
};

export const clearCallState = (type = 'one-to-one') => {
  try {
    const key = type === 'group' ? GROUP_CALL_STATE_KEY : CALL_STATE_KEY;
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to clear call state:', error);
  }
};

export const updateCallState = (updates, type = 'one-to-one') => {
  const current = getCallState(type);
  if (current) {
    saveCallState({ ...current, ...updates });
  }
};

export const hasActiveCall = () => {
  return !!(getCallState('one-to-one') || getCallState('group'));
};
