
import { io } from "socket.io-client";

// Use any to bypass environment-specific typing issues with the Socket.io client
let socket: any = null;

export const initSocket = (userId: string): any => {
  // If socket already exists and is connected, reuse it
  if (socket && socket.connected) {
    console.log('Reusing existing connected socket');
    return socket;
  }

  // Disconnect existing socket if it exists
  if (socket) {
    console.log('Disconnecting existing socket');
    socket.disconnect();
  }

  // Use current host - proxy in development, direct in production
  const SOCKET_URL = window.location.origin;

  console.log('Attempting WebSocket connection to:', SOCKET_URL);
  console.log('Current location:', window.location.href);

  // Cast options to any to fix property existence errors in the build environment
  socket = io(SOCKET_URL, {
    autoConnect: true,
    transports: ['websocket', 'polling'] // Prefer websocket, fallback to polling
  } as any);

  // Access .on via the any-typed socket variable to resolve property missing errors
  socket.on("connect", () => {
    console.log("Zenj Relay Connected:", socket?.id);
    // Register the user with the server
    socket?.emit('register', userId);
  });

  socket.on("reconnect", () => {
    console.log("Zenj Relay Reconnected:", socket?.id);
    // Re-register the user with the server
    socket?.emit('register', userId);
  });

  socket.on("connect_error", (error) => {
    console.error("WebSocket connection error:", error);
  });

  socket.on("disconnect", (reason) => {
    console.log("WebSocket disconnected:", reason);
  });

  socket.on("error", (error) => {
    console.error("WebSocket error:", error);
  });

  return socket;
};

export const getSocket = () => socket;

export const emitMessage = (messageData: any) => {
  if (socket && socket.connected) {
    if (messageData.type?.startsWith('webrtc-')) {
      socket.emit(messageData.type, messageData);
    } else {
      // Check if mediaUrl is large, send in chunks
      const mediaUrl = messageData.mediaUrl;
      if (mediaUrl && typeof mediaUrl === 'string' && mediaUrl.length > 1000000) { // ~750KB binary
        const chunkSize = 500000; // 500KB chunks
        const totalChunks = Math.ceil(mediaUrl.length / chunkSize);
        for (let i = 0; i < totalChunks; i++) {
          const chunk = mediaUrl.slice(i * chunkSize, (i + 1) * chunkSize);
          socket.emit("send_message_chunk", {
            ...messageData,
            chunk,
            chunkIndex: i,
            totalChunks
          });
        }
      } else {
        socket.emit("send_message", messageData);
      }
    }
  } else {
    console.log('Socket not connected, cannot send message');
  }
};

export const emitReadReceipt = (data: { contactId: string, messageId: string, userId: string }) => {
  if (socket) {
    socket.emit("read_receipt", data);
  }
};

export const emitTypingStatus = (data: { recipientId: string, senderId: string, isTyping: boolean }) => {
  if (socket) {
    socket.emit("typing", data);
  }
};
