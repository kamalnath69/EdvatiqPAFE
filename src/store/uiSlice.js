import { createSlice } from '@reduxjs/toolkit';

function getStoredTheme() {
  if (typeof window === 'undefined') return 'light';
  const saved = window.localStorage.getItem('archerypt-theme');
  return saved === 'dark' || saved === 'light' ? saved : 'light';
}

function getStoredSidebarCollapsed() {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem('shell.sidebar.collapsed') === '1';
}

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    theme: getStoredTheme(),
    sidebarCollapsed: getStoredSidebarCollapsed(),
  },
  reducers: {
    setTheme(state, action) {
      state.theme = action.payload;
    },
    toggleTheme(state) {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
    },
    setSidebarCollapsed(state, action) {
      state.sidebarCollapsed = Boolean(action.payload);
    },
    toggleSidebarCollapsed(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
  },
});

export const { setTheme, toggleTheme, setSidebarCollapsed, toggleSidebarCollapsed } = uiSlice.actions;
export default uiSlice.reducer;
