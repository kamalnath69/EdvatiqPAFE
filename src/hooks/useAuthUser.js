import { useContext } from 'react';
import { AuthContext } from '../context/auth-context';

export function useAuthUser() {
  return useContext(AuthContext);
}
