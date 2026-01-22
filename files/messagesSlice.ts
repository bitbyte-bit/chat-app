import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = 'http://localhost:4000/api';

interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  body: string;
  media_url?: string;
  media_type?: string;
  created_at: string;
}

interface MessagesState {
  conversations: { [key: number]: Message[] };
  loading:  boolean;
  error: string | null;
}

const initialState: MessagesState = {
  conversations: {},
  loading: false,
  error: null
};

export const fetchConversation = createAsyncThunk(
  'messages/fetchConversation',
  async ({ userId, token }: { userId: number; token: string }) => {
    const response = await axios.get(`${API_URL}/messages/conversation/${userId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return { userId, messages: response.data };
  }
);

export const sendMessage = createAsyncThunk(
  'messages/sendMessage',
  async (
    { receiver_id, body, media_url, media_type, token }: any,
    { rejectWithValue }
  ) => {
    try {
      const response = await axios.post(
        `${API_URL}/messages/send`,
        { receiver_id, body, media_url, media_type },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (error:  any) {
      return rejectWithValue(error.response?.data?. error || 'Failed to send message');
    }
  }
);

const messagesSlice = createSlice({
  name:  'messages',
  initialState,
  reducers: {
    addMessage: (state, action) => {
      const { userId, message } = action.payload;
      if (!state.conversations[userId]) {
        state.conversations[userId] = [];
      }
      state.conversations[userId].push(message);
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchConversation.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchConversation.fulfilled, (state, action) => {
        state.loading = false;
        state.conversations[action.payload.userId] = action.payload.messages;
      })
      .addCase(fetchConversation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error. message || 'Failed to fetch conversation';
      });
  }
});

export const { addMessage } = messagesSlice. actions;
export default messagesSlice.reducer;