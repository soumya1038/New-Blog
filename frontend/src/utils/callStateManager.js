// Persist call state across page reloads and navigation

const CALL_STATE_KEY = 'active_call_state';

export const saveCallState = (callState) => {
  try {
    localStorage.setItem(CALL_STATE_KEY, JSON.stringify({
      ...callState,
      timestamp: Date.now()
    }));
  } catch (error) {
    console.error('Failed to save call state:', error);
  }
};

export const getCallState = () => {
  try {
    const saved = localStorage.getItem(CALL_STATE_KEY);
    if (!saved) return null;
    
    const state = JSON.parse(saved);
    
    // Expire after 2 hours
    if (Date.now() - state.timestamp > 2 * 60 * 60 * 1000) {
      clearCallState();
      return null;
    }
    
    return state;
  } catch (error) {
    console.error('Failed to get call state:', error);
    return null;
  }
};

export const clearCallState = () => {
  try {
    localStorage.removeItem(CALL_STATE_KEY);
  } catch (error) {
    console.error('Failed to clear call state:', error);
  }
};

export const updateCallState = (updates) => {
  const current = getCallState();
  if (current) {
    saveCallState({ ...current, ...updates });
  }
};
