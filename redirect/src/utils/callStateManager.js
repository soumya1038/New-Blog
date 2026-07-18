// Persist call state across page reloads and navigation

import { getSafeImageUrl } from './safeMediaUrls';
import { readSessionJson, removeSessionValue, writeSessionJson } from './sessionBackedStorage';

const CALL_STATE_KEY = 'active_call_state';
const GROUP_CALL_STATE_KEY = 'active_group_call_state';
const CALL_STATE_TTL_MS = 2 * 60 * 60 * 1000;
const MAX_ID_LENGTH = 120;
const MAX_NAME_LENGTH = 120;
const MAX_ROOM_NAME_LENGTH = 120;
const MAX_PARTICIPANT_NAME_LENGTH = 80;

const cleanText = (value, maxLength) =>
  String(value || '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, maxLength);

const normalizeCallType = (value) => {
  const callType = String(value || 'video').trim().toLowerCase();
  return ['audio', 'video'].includes(callType) ? callType : 'video';
};

const normalizeEventTimestamp = (value, now = Date.now()) => {
  const timestamp = Number(value);
  if (!Number.isFinite(timestamp) || timestamp <= 0) return now;
  if (timestamp > now + 60 * 1000) return now;
  return Math.max(timestamp, now - CALL_STATE_TTL_MS);
};

const normalizeStorageTimestamp = (value, now = Date.now()) => {
  const timestamp = Number(value);
  if (!Number.isFinite(timestamp) || timestamp <= 0) return now;
  if (timestamp > now + 60 * 1000) return now;
  return timestamp;
};

const getStorageKey = (type) => (type === 'group' ? GROUP_CALL_STATE_KEY : CALL_STATE_KEY);

const sanitizeOneToOneCallState = (callState, now) => {
  const remoteUser = callState?.remoteUser || {};
  const userId = cleanText(remoteUser.id, MAX_ID_LENGTH);
  if (!userId) return null;

  return {
    type: 'one-to-one',
    remoteUser: {
      id: userId,
      fullName: cleanText(remoteUser.fullName, MAX_NAME_LENGTH) || 'User',
      profileImage: getSafeImageUrl(remoteUser.profileImage)
    },
    callType: normalizeCallType(callState.callType),
    startTime: normalizeEventTimestamp(callState.startTime, now),
    callAccepted: callState.callAccepted === true,
    isAudioEnabled: callState.isAudioEnabled !== false,
    timestamp: normalizeStorageTimestamp(callState.timestamp, now)
  };
};

const sanitizeGroupCallState = (callState, now) => {
  const groupId = cleanText(callState.groupId, MAX_ID_LENGTH);
  const roomName = cleanText(callState.roomName, MAX_ROOM_NAME_LENGTH);
  if (!/^[a-f\d]{24}$/i.test(groupId)) return null;
  if (!/^[A-Za-z0-9._:-]+$/.test(roomName)) return null;

  return {
    type: 'group',
    groupId,
    roomName,
    participantName: cleanText(callState.participantName, MAX_PARTICIPANT_NAME_LENGTH) || 'User',
    callType: normalizeCallType(callState.callType),
    startTime: normalizeEventTimestamp(callState.startTime, now),
    timestamp: normalizeStorageTimestamp(callState.timestamp, now)
  };
};

const sanitizeCallState = (callState, type = callState?.type) => {
  const now = Date.now();
  return type === 'group'
    ? sanitizeGroupCallState(callState, now)
    : sanitizeOneToOneCallState(callState, now);
};

export const saveCallState = (callState) => {
  try {
    const type = callState?.type === 'group' ? 'group' : 'one-to-one';
    const key = getStorageKey(type);
    const sanitized = sanitizeCallState({ ...callState, type, timestamp: Date.now() }, type);
    if (!sanitized) {
      removeSessionValue(key);
      return;
    }

    writeSessionJson(key, sanitized);
  } catch (error) {
    console.error('Failed to save call state:', error);
  }
};

export const getCallState = (type = 'one-to-one') => {
  try {
    const key = getStorageKey(type);
    const state = readSessionJson(key, null);
    if (!state) return null;
    const sanitized = sanitizeCallState({ ...state, type }, type);
    if (!sanitized) {
      clearCallState(type);
      return null;
    }
    
    // Expire after 2 hours
    if (Date.now() - sanitized.timestamp > CALL_STATE_TTL_MS) {
      clearCallState(type);
      return null;
    }

    writeSessionJson(key, sanitized);
    return sanitized;
  } catch (error) {
    console.error('Failed to get call state:', error);
    return null;
  }
};

export const clearCallState = (type = 'one-to-one') => {
  try {
    const key = getStorageKey(type);
    removeSessionValue(key);
  } catch (error) {
    console.error('Failed to clear call state:', error);
  }
};

export const updateCallState = (updates, type = 'one-to-one') => {
  const current = getCallState(type);
  if (current) {
    saveCallState({ ...current, ...updates, type });
  }
};

export const hasActiveCall = () => {
  return !!(getCallState('one-to-one') || getCallState('group'));
};
