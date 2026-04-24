import api from './api';

export const listMyTemplatePresets = async () => {
  const { data } = await api.get('/template-presets/me');
  return Array.isArray(data?.presets) ? data.presets : [];
};

export const createTemplatePreset = async (payload) => {
  const { data } = await api.post('/template-presets', payload);
  return data?.preset || null;
};

export const updateTemplatePreset = async (presetId, payload) => {
  const { data } = await api.put(`/template-presets/${presetId}`, payload);
  return data?.preset || null;
};

export const deleteTemplatePreset = async (presetId) => {
  await api.delete(`/template-presets/${presetId}`);
};

export const toggleTemplatePresetShare = async (presetId, visibility) => {
  const payload = visibility ? { visibility } : {};
  const { data } = await api.post(`/template-presets/${presetId}/share`, payload);
  return data?.preset || null;
};
