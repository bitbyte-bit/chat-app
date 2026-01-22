import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = 'http://localhost:4000/api';

interface Contact {
  id: number;
  contact_name: string;
  phone_number?:  string;
  email?: string;
}

interface ContactsState {
  contacts: Contact[];
  loading:  boolean;
  error: string | null;
}

const initialState: ContactsState = {
  contacts: [],
  loading: false,
  error: null
};

export const fetchContacts = createAsyncThunk(
  'contacts/fetchContacts',
  async (token: string) => {
    const response = await axios. get(`${API_URL}/contacts/list`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  }
);

export const addContact = createAsyncThunk(
  'contacts/addContact',
  async (
    { contact_name, phone_number, email, token }: any,
    { rejectWithValue }
  ) => {
    try {
      const response = await axios.post(
        `${API_URL}/contacts/add`,
        { contact_name, phone_number, email },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to add contact');
    }
  }
);

const contactsSlice = createSlice({
  name: 'contacts',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchContacts.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchContacts. fulfilled, (state, action) => {
        state.loading = false;
        state.contacts = action.payload;
      })
      .addCase(fetchContacts. rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch contacts';
      });
  }
});

export default contactsSlice.reducer;