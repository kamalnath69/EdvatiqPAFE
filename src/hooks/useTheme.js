import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { toggleTheme as toggleThemeAction } from '../store/uiSlice';

export function useTheme() {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((state) => state.ui.theme);

  const toggleTheme = useCallback(() => {
    dispatch(toggleThemeAction());
  }, [dispatch]);

  return {
    theme,
    toggleTheme,
  };
}
