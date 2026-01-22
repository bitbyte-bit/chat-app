import React, { useEffect, useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { io, Socket } from 'socket. io-client';
import { RootState, AppDispatch } from '../store';
import { fetchConversation, addMessage } from '../store/slices/messagesSlice';
import '../styles/Chat.css';

const Chat: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user, token } = useSelector((state: RootState) => state.auth);
  const { conversations } = useSelector((state: RootState) => state.messages);
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [messageText, setMessageText] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<number[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Initialize Socket.IO
    socketRef.current = io('http://localhost:4000', {
      auth: { token }
    });

    socketRef.current.emit('user-online', user?.id);

    socketRef.current.on('receive-message', (message) => {
      dispatch(addMessage({ userId: message.sender_id, message }));
    });

    socketRef.current.on('users-online', (userIds:  number[]) => {
      setOnlineUsers(userIds);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [user, token, dispatch]);

  const loadConversation = async (userId: number) => {
    setSelectedUser(userId);
    dispatch(fetchConversation({ userId, token:  token!  }));
  };

  const sendMessage = () => {
    if (! messageText.trim() || ! selectedUser) return;

    const messageData = {
      id: Date.now(),
      sender_id: user?.id,
      receiver_id: selectedUser,
      body: messageText,
      created_at: new Date().toISOString()
    };

    socketRef.current?.emit('send-message', messageData);
    dispatch(addMessage({ userId: selectedUser, message: messageData }));
    setMessageText('');
  };

  const captureCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      console.log('Camera access granted');
      // Handle camera capture UI
    } catch (error) {
      console.error('Camera access denied:', error);
    }
  };

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const { latitude, longitude } = position. coords;
        const locationMsg = `📍 Location: ${latitude}, ${longitude}`;
        setMessageText(locationMsg);
      });
    }
  };

  const recordAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('Microphone access granted');
      // Handle audio recording UI
    } catch (error) {
      console.error('Microphone access denied:', error);
    }
  };

  const currentMessages = selectedUser ? conversations[selectedUser] || [] : [];

  return (
    <div className="chat-container">
      <div className="chat-sidebar">
        <h2>Zion Chat</h2>
        <div className="user-list">
          {users. map((chatUser) => (
            <div
              key={chatUser.id}
              className={`user-item ${selectedUser === chatUser. id ? 'active' : ''}`}
              onClick={() => loadConversation(chatUser.id)}
            >
              <div className="user-avatar">{chatUser.username[0]}</div>
              <div className="user-info">
                <div className="user-name">{chatUser.username}</div>
                <div className={`user-status ${onlineUsers.includes(chatUser. id) ? 'online' : 'offline'}`}>
                  {onlineUsers.includes(chatUser.id) ? '🟢 Online' : '⚪ Offline'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="chat-main">
        {selectedUser ? (
          <>
            <div className="chat-header">
              <h3>Chat with User {selectedUser}</h3>
            </div>

            <div className="messages-container">
              {currentMessages.map((msg) => (
                <div key={msg.id} className={`message ${msg.sender_id === user?.id ? 'sent' : 'received'}`}>
                  <p>{msg.body}</p>
                  <small>{new Date(msg.created_at).toLocaleTimeString()}</small>
                </div>
              ))}
            </div>

            <div className="chat-input-area">
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Type a message..."
              />
              <button onClick={() => document.getElementById('fileInput')?.click()}>📎</button>
              <button onClick={captureCamera}>📷</button>
              <button onClick={getLocation}>📍</button>
              <button onClick={recordAudio}>🎤</button>
              <button onClick={sendMessage}>Send</button>
              <input id="fileInput" type="file" style={{ display: 'none' }} />
            </div>
          </>
        ) : (
          <div className="no-chat-selected">Select a user to start chatting</div>
        )}
      </div>
    </div>
  );
};

export default Chat;