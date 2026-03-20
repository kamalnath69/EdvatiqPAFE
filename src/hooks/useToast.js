import { useCallback } from 'react';
import { addToast, removeToast } from '../store/toastSlice';
import { useAppDispatch } from '../store/hooks';

export function useToast() {
  const dispatch = useAppDispatch();

  const removeToastById = useCallback((id) => {
    dispatch(removeToast(id));
  }, [dispatch]);

  const pushToast = useCallback(
    ({ type = 'info', message, duration = 4200 }) => {
      if (!message) return;
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      dispatch(addToast({ id, type, message }));
      window.setTimeout(() => {
        dispatch(removeToast(id));
      }, duration);
    },
    [dispatch]
  );

  return { pushToast, removeToast: removeToastById };
}
