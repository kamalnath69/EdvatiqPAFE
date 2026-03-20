import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import toastReducer from './toastSlice';
import uiReducer from './uiSlice';
import plansReducer from './plansSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    toast: toastReducer,
    ui: uiReducer,
    plans: plansReducer,
  },
});
