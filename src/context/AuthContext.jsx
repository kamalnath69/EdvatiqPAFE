import { useCallback, useEffect, useMemo, useState } from 'react';
import { registerApiAuthHandlers } from '../api';
import { getMe } from '../services/authApi';
import { AuthContext } from './auth-context';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(Boolean(token));

  const logout = () => {
    setToken(null);
    setUser(null);
    setLoadingUser(false);
    localStorage.removeItem('token');
  };

  useEffect(() => {
    registerApiAuthHandlers({
      getTokenFn: () => token,
      onUnauthorizedFn: logout,
    });
  }, [token]);

  useEffect(() => {
    let isMounted = true;

    if (token) {
      getMe()
        .then((resp) => {
          if (!isMounted) return;
          setUser(resp);
          setLoadingUser(false);
        })
        .catch(() => {
          if (!isMounted) return;
          logout();
        });
    }

    return () => {
      isMounted = false;
    };
  }, [token]);

  const refreshUser = useCallback(async () => {
    if (!token) return null;
    const resp = await getMe();
    setUser(resp);
    return resp;
  }, [token]);

  const login = (tkn) => {
    setLoadingUser(true);
    setToken(tkn);
    localStorage.setItem('token', tkn);
  };

  const value = useMemo(
    () => ({
      user,
      token,
      loadingUser,
      login,
      logout,
      refreshUser,
      isAuthenticated: Boolean(user && token),
    }),
    [user, token, loadingUser, refreshUser]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
