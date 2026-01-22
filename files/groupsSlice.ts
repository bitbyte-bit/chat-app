import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = 'http://localhost:4000/api';

interface Group {
  id:  number;
  name: string;
  description?:  string;
  creator_id: number;
  profile_picture?: string;
  created_at: string;
}

interface GroupsState {
  groups: Group[];
  currentGroup: Group | null;
  loading: boolean;
  error:  string | null;
}

const initialState: GroupsState = {
  groups: [],
  currentGroup: null,
  loading:  false,
  error: null
};

export const fetchUserGroups = createAsyncThunk(
  'groups/fetchUserGroups',
  async (token: string) => {
    const response = await axios.get(`${API_URL}/groups/user/list`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response. data;
  }
);

export const createGroup = createAsyncThunk(
  'groups/createGroup',
  async (
    { name, description, password, token }: any,
    { rejectWithValue }
  ) => {
    try {
      const response = await axios.post(
        `${API_URL}/groups/create`,
        { name, description, password },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to create group');
    }
  }
);

export const joinGroup = createAsyncThunk(
  'groups/joinGroup',
  async (
    { groupId, password, token }: any,
    { rejectWithValue }
  ) => {
    try {
      const response = await axios.post(
        `${API_URL}/groups/${groupId}/join`,
        { password },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error. response?.data?.error || 'Failed to join group');
    }
  }
);

const groupsSlice = createSlice({
  name: 'groups',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserGroups.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchUserGroups.fulfilled, (state, action) => {
        state.loading = false;
        state.groups = action.payload;
      })
      .addCase(fetchUserGroups.rejected, (state, action) => {
        state.loading = false;
        state.error = action. error.message || 'Failed to fetch groups';
      });
  }
});

export default groupsSlice.reducer;