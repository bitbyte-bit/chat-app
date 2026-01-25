
import { io } from "socket.io-client";

// Use any to bypass environment-specific typing issues with the Socket.io client
let socket: any = null;

export const initSocket = (userId: string): any => {
  // Use current host but point to the Node server port (usually 3003 in dev)
  // Or fallback to origin if running behind a proxy
  const SOCKET_URL = window.location.hostname === 'localhost'
    ? "http://localhost:3003"
    : window.location.origin;
  
  // Cast options to any to fix property existence errors in the build environment
  socket = io(SOCKET_URL, {
    autoConnect: true,
    transports: ['websocket']
  } as any);

  // Access .on via the any-typed socket variable to resolve property missing errors
  socket.on("connect", () => {
    console.log("Zenj Relay Connected:", socket?.id);
    // Register the user with the server
    socket?.emit('register', userId);
  });

  return socket;
};

export const getSocket = () => socket;

export const emitMessage = (messageData: any) => {
  if (socket) {
    if (messageData.type?.startsWith('webrtc-')) {
      socket.emit(messageData.type, messageData);
    } else {
      socket.emit("send_message", messageData);
    }
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
