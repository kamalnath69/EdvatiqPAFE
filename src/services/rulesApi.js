import api from '../api';

export async function getRules(username, sport) {
  const resp = await api.get(`/rules/${username}/${sport}`);
  return resp.data;
}

export async function overrideRules(username, sport, rules) {
  const resp = await api.post('/rules/override', rules, {
    params: { username, sport },
  });
  return resp.data;
}
