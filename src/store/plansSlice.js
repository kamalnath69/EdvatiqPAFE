import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { listPlans } from '../services/billingApi';

export const fetchPlans = createAsyncThunk('plans/fetchPlans', async (_, { rejectWithValue }) => {
  try {
    return await listPlans();
  } catch (error) {
    return rejectWithValue(error?.response?.data?.detail || 'Unable to load plans');
  }
});

const plansSlice = createSlice({
  name: 'plans',
  initialState: {
    items: [],
    loading: false,
    loaded: false,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPlans.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchPlans.fulfilled, (state, action) => {
        state.items = action.payload || [];
        state.loading = false;
        state.loaded = true;
      })
      .addCase(fetchPlans.rejected, (state) => {
        state.loading = false;
        state.loaded = true;
      });
  },
});

export default plansSlice.reducer;
