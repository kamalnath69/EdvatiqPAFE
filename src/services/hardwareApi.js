import api from '../api';

export async function getLatestHardwareTelemetry(student = '') {
  const resp = await api.get('/hardware/telemetry/latest', {
    params: student ? { student } : {},
  });
  return resp.data || null;
}

export async function sendHardwareTelemetry(payload) {
  const resp = await api.post('/hardware/telemetry', payload);
  return resp.data;
}

export async function listHardwareDevices(student = '') {
  const resp = await api.get('/hardware/devices', {
    params: student ? { student } : {},
  });
  return resp.data || [];
}

export async function createHardwareDevice(payload) {
  const resp = await api.post('/hardware/devices', payload);
  return resp.data;
}

export async function updateHardwareDevice(deviceId, payload) {
  const resp = await api.patch(`/hardware/devices/${deviceId}`, payload);
  return resp.data;
}

export async function rotateHardwareDeviceToken(deviceId) {
  const resp = await api.post(`/hardware/devices/${deviceId}/rotate-token`);
  return resp.data;
}

export async function listHardwareTelemetry(deviceId, limit = 20) {
  const resp = await api.get(`/hardware/devices/${deviceId}/telemetry`, {
    params: { limit },
  });
  return resp.data || [];
}
