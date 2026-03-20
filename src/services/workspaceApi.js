import api from '../api';

export async function getWorkspaceSettings() {
  const resp = await api.get('/settings/me');
  return resp.data;
}

export async function updateWorkspaceSettings(payload) {
  const resp = await api.put('/settings/me', payload);
  return resp.data;
}

export async function getAcademySettings() {
  const resp = await api.get('/settings/academy');
  return resp.data;
}

export async function updateAcademySettings(payload) {
  const resp = await api.put('/settings/academy', payload);
  return resp.data;
}

export async function listNotifications(unreadOnly = false) {
  const resp = await api.get('/notifications/', { params: unreadOnly ? { unread_only: true } : {} });
  return resp.data || [];
}

export async function markNotificationRead(notificationId) {
  const resp = await api.post(`/notifications/${notificationId}/read`);
  return resp.data;
}

export async function markAllNotificationsRead() {
  const resp = await api.post('/notifications/read-all');
  return resp.data;
}

export async function listReports() {
  const resp = await api.get('/reports/');
  return resp.data || [];
}

export async function createReport(payload) {
  const resp = await api.post('/reports/', payload);
  return resp.data;
}

export async function updateReport(reportId, payload) {
  const resp = await api.put(`/reports/${reportId}`, payload);
  return resp.data;
}

export async function shareReport(reportId) {
  const resp = await api.post(`/reports/${reportId}/share`);
  return resp.data;
}

export async function exportReport(reportId) {
  const resp = await api.post(`/reports/${reportId}/export`);
  return resp.data;
}

export async function listTrainingPlans() {
  const resp = await api.get('/training-plans/');
  return resp.data || [];
}

export async function createTrainingPlan(payload) {
  const resp = await api.post('/training-plans/', payload);
  return resp.data;
}

export async function updateTrainingPlan(planId, payload) {
  const resp = await api.put(`/training-plans/${planId}`, payload);
  return resp.data;
}

export async function updateTrainingPlanProgress(planId, payload) {
  const resp = await api.post(`/training-plans/${planId}/progress`, payload);
  return resp.data;
}

export async function listCoachReviews() {
  const resp = await api.get('/coach-reviews/');
  return resp.data || [];
}

export async function createCoachReview(payload) {
  const resp = await api.post('/coach-reviews/', payload);
  return resp.data;
}

export async function updateCoachReview(reviewId, payload) {
  const resp = await api.put(`/coach-reviews/${reviewId}`, payload);
  return resp.data;
}

export async function listCalendarEvents() {
  const resp = await api.get('/calendar/');
  return resp.data || [];
}

export async function createCalendarEvent(payload) {
  const resp = await api.post('/calendar/', payload);
  return resp.data;
}

export async function updateCalendarEvent(eventId, payload) {
  const resp = await api.put(`/calendar/${eventId}`, payload);
  return resp.data;
}

export async function listAuditLogs(params = {}) {
  const resp = await api.get('/audit/', { params });
  return resp.data || [];
}

export async function listInvites() {
  const resp = await api.get('/invites/');
  return resp.data || [];
}

export async function createInvite(payload) {
  const resp = await api.post('/invites/', payload);
  return resp.data;
}

export async function acceptInvite(payload) {
  const resp = await api.post('/invites/accept', payload);
  return resp.data;
}

export async function listFavorites() {
  const resp = await api.get('/favorites/');
  return resp.data || [];
}

export async function addFavorite(payload) {
  const resp = await api.post('/favorites/', payload);
  return resp.data;
}

export async function deleteFavorite(favoriteId) {
  const resp = await api.delete(`/favorites/${favoriteId}`);
  return resp.data;
}

export async function listAttachments(params = {}) {
  const resp = await api.get('/attachments/', { params });
  return resp.data || [];
}

export async function createAttachment(payload) {
  const resp = await api.post('/attachments/', payload);
  return resp.data;
}

export async function deleteAttachment(attachmentId) {
  const resp = await api.delete(`/attachments/${attachmentId}`);
  return resp.data;
}

export async function searchWorkspace(query) {
  const resp = await api.get('/search/', { params: { q: query } });
  return resp.data || [];
}

export async function getSystemStatus() {
  const resp = await api.get('/system/status');
  return resp.data;
}

export async function getPlatformAiSettings() {
  const resp = await api.get('/system/ai-settings');
  return resp.data;
}

export async function updatePlatformAiSettings(payload) {
  const resp = await api.put('/system/ai-settings', payload);
  return resp.data;
}

export async function getBillingWorkspace() {
  const resp = await api.get('/billing/workspace');
  return resp.data;
}

export async function getWalletSummary() {
  const resp = await api.get('/wallet/summary');
  return resp.data;
}

export async function listWalletTransactions(limit = 20) {
  const resp = await api.get('/wallet/transactions', { params: { limit } });
  return resp.data || [];
}

export async function topUpWallet(payload) {
  const resp = await api.post('/wallet/top-up', payload);
  return resp.data;
}

export async function createWalletRechargeOrder(payload) {
  const resp = await api.post('/wallet/create-order', payload);
  return resp.data;
}

export async function verifyWalletRecharge(payload) {
  const resp = await api.post('/wallet/verify-recharge', payload);
  return resp.data;
}

export async function listHelpArticles() {
  const resp = await api.get('/help-docs/');
  return resp.data || [];
}

export async function createHelpArticle(payload) {
  const resp = await api.post('/help-docs/', payload);
  return resp.data;
}

export async function updateHelpArticle(articleId, payload) {
  const resp = await api.put(`/help-docs/${articleId}`, payload);
  return resp.data;
}

export async function deleteHelpArticle(articleId) {
  const resp = await api.delete(`/help-docs/${articleId}`);
  return resp.data;
}
