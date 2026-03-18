import api from '../api';

export async function askCoach(question) {
  const resp = await api.post('/chat/ask', null, { params: { question } });
  return resp.data;
}
