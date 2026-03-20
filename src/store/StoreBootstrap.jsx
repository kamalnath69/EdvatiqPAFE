import { useEffect, useRef } from 'react';
import { registerApiAuthHandlers } from '../api';
import { useAppDispatch, useAppSelector } from './hooks';
import { logout, refreshCurrentUser } from './authSlice';

export default function StoreBootstrap({ children }) {
  const dispatch = useAppDispatch();
  const token = useAppSelector((state) => state.auth.token);
  const theme = useAppSelector((state) => state.ui.theme);
  const sidebarCollapsed = useAppSelector((state) => state.ui.sidebarCollapsed);
  const hydratedTokensRef = useRef(new Set());

  useEffect(() => {
    registerApiAuthHandlers({
      getTokenFn: () => token,
      onUnauthorizedFn: () => dispatch(logout()),
    });
  }, [dispatch, token]);

  useEffect(() => {
    if (!token) {
      hydratedTokensRef.current.clear();
      return;
    }
    if (!hydratedTokensRef.current.has(token)) {
      hydratedTokensRef.current.add(token);
      dispatch(refreshCurrentUser());
    }
  }, [dispatch, token]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    window.localStorage.setItem('archerypt-theme', theme);
  }, [theme]);

  useEffect(() => {
    window.localStorage.setItem('shell.sidebar.collapsed', sidebarCollapsed ? '1' : '0');
  }, [sidebarCollapsed]);

  useEffect(() => {
    if (token) {
      window.localStorage.setItem('token', token);
    } else {
      window.localStorage.removeItem('token');
    }
  }, [token]);

  return children;
}
