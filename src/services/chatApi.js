import api from '../api';

let coachConfigCache = null;
let coachConfigFetchedAt = 0;
let coachConfigPromise = null;
let walletSummaryCache = null;
let walletSummaryFetchedAt = 0;
let walletSummaryPromise = null;
const CACHE_TTL_MS = 10000;

export async function getCoachConfig() {
  const now = Date.now();
  if (coachConfigCache && now - coachConfigFetchedAt < CACHE_TTL_MS) {
    return coachConfigCache;
  }
  if (coachConfigPromise) return coachConfigPromise;
  coachConfigPromise = api.get('/chat/config').then((resp) => {
    coachConfigCache = resp.data;
    coachConfigFetchedAt = Date.now();
    coachConfigPromise = null;
    return resp.data;
  }).catch((error) => {
    coachConfigPromise = null;
    throw error;
  });
  return coachConfigPromise;
}

export async function updateCoachConfig(payload) {
  const resp = await api.put('/chat/config', payload);
  coachConfigCache = resp.data;
  coachConfigFetchedAt = Date.now();
  return resp.data;
}

export async function askCoach(payload) {
  const resp = await api.post('/chat/ask', payload);
  return resp.data;
}

export async function getLiveCoachGuidance(payload) {
  const resp = await api.post('/chat/live-guidance', payload);
  return resp.data;
}

export async function getWalletSummary() {
  const now = Date.now();
  if (walletSummaryCache && now - walletSummaryFetchedAt < CACHE_TTL_MS) {
    return walletSummaryCache;
  }
  if (walletSummaryPromise) return walletSummaryPromise;
  walletSummaryPromise = api.get('/wallet/summary').then((resp) => {
    walletSummaryCache = resp.data;
    walletSummaryFetchedAt = Date.now();
    walletSummaryPromise = null;
    return resp.data;
  }).catch((error) => {
    walletSummaryPromise = null;
    throw error;
  });
  return walletSummaryPromise;
}

export async function listWalletTransactions(limit = 20) {
  const resp = await api.get('/wallet/transactions', { params: { limit } });
  return resp.data || [];
}

export async function topUpWallet(payload) {
  const resp = await api.post('/wallet/top-up', payload);
  return resp.data;
}
