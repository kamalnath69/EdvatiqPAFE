import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { logout, refreshCurrentUser, setToken } from '../store/authSlice';

export function useAuthUser() {
  const dispatch = useAppDispatch();
  const { user, token, loadingUser } = useAppSelector((state) => state.auth);

  const login = useCallback(
    async (nextToken) => {
      dispatch(setToken(nextToken));
      return nextToken;
    },
    [dispatch]
  );

  const logoutUser = useCallback(() => {
    dispatch(logout());
  }, [dispatch]);

  const refreshUser = useCallback(async () => dispatch(refreshCurrentUser()).unwrap(), [dispatch]);

  return {
    user,
    token,
    loadingUser,
    login,
    logout: logoutUser,
    refreshUser,
    isAuthenticated: Boolean(user && token),
  };
}
