import api from '../api';

export async function listAcademies() {
  const resp = await api.get('/academies/');
  return resp.data || [];
}

export async function createAcademy(payload) {
  const resp = await api.post('/academies/', payload);
  return resp.data;
}

export async function deleteAcademy(academyId) {
  const resp = await api.delete(`/academies/${academyId}`);
  return resp.data;
}

export async function addAcademyAdmin(academyId, payload) {
  const resp = await api.post(`/academies/${academyId}/admins`, payload);
  return resp.data;
}

export async function addStaff(academyId, payload, canAddStudents = false) {
  const resp = await api.post(`/academies/${academyId}/staff`, payload, {
    params: { can_add_students: canAddStudents },
  });
  return resp.data;
}

export async function addStudent(academyId, payload) {
  const resp = await api.post(`/academies/${academyId}/students`, payload);
  return resp.data;
}
