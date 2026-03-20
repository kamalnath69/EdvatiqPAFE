import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { getMe } from '../services/authApi';

const initialToken = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null;

export const refreshCurrentUser = createAsyncThunk('auth/refreshCurrentUser', async (_, { rejectWithValue }) => {
  try {
    return await getMe();
  } catch (error) {
    return rejectWithValue(error?.response?.data?.detail || 'Unable to refresh user');
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    token: initialToken,
    user: null,
    loadingUser: Boolean(initialToken),
  },
  reducers: {
    setToken(state, action) {
      state.token = action.payload || null;
      state.loadingUser = Boolean(action.payload);
      if (!action.payload) {
        state.user = null;
      }
    },
    logout(state) {
      state.token = null;
      state.user = null;
      state.loadingUser = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(refreshCurrentUser.pending, (state) => {
        state.loadingUser = true;
      })
      .addCase(refreshCurrentUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.loadingUser = false;
      })
      .addCase(refreshCurrentUser.rejected, (state) => {
        state.token = null;
        state.user = null;
        state.loadingUser = false;
      });
  },
});

export const { setToken, logout } = authSlice.actions;
export default authSlice.reducer;
