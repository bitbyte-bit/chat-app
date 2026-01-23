
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export const initSocket = (userId: string) => {
  // Replace with actual signaling server URL if available
  // Using a mockable interface for the frontend demo
  const SOCKET_URL = "https://socket-io-chat.now.sh"; 
  
  socket = io(SOCKET_URL, {
    query: { userId },
    autoConnect: true,
    transports: ['websocket']
  });

  socket.on("connect", () => {
    console.log("Zenj Socket Connected:", socket?.id);
  });

  return socket;
};

export const getSocket = () => socket;

export const emitMessage = (messageData: any) => {
  if (socket) {
    socket.emit("send_message", messageData);
  }
};

export const emitReadReceipt = (data: { contactId: string, messageId: string, userId: string }) => {
  if (socket) {
    socket.emit("read_receipt", data);
  }
};
