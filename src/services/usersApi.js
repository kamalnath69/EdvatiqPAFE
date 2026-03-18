import api from '../api';

export async function listUsers() {
  const resp = await api.get('/users/');
  return resp.data || [];
}

export async function listStudents() {
  const resp = await api.get('/users/students');
  return resp.data || [];
}

export async function createUser(payload) {
  const resp = await api.post('/users/', payload);
  return resp.data;
}

export async function deleteUser(username) {
  const resp = await api.delete(`/users/${username}`);
  return resp.data;
}

export async function assignSport(username, sport) {
  const resp = await api.patch(`/users/${username}/assign_sport`, null, {
    params: { sport },
  });
  return resp.data;
}

export async function getMyProfile() {
  const resp = await api.get('/users/me/profile');
  return resp.data;
}

export async function updateMyProfile(payload) {
  const resp = await api.patch('/users/me/profile', payload);
  return resp.data;
}

export async function updateStudentAngleMeasurements(username, payload) {
  const resp = await api.patch(`/users/${username}/angle_measurements`, payload);
  return resp.data;
}
