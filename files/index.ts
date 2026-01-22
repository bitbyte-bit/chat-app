import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import messagesReducer from './slices/messagesSlice';
import groupsReducer from './slices/groupsSlice';
import contactsReducer from './slices/contactsSlice';

const store = configureStore({
  reducer: {
    auth: authReducer,
    messages: messagesReducer,
    groups:  groupsReducer,
    contacts: contactsReducer
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store. dispatch;

export default store;