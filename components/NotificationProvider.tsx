import React, { createContext, useContext, useState, ReactNode } from 'react';
import Notification, { NotificationItem, NotificationAction } from './Notification';

interface NotificationContextType {
  showNotification: (message: string, actions?: NotificationAction[], type?: NotificationItem['type'], duration?: number) => void;
  confirm: (message: string) => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [confirmResolves, setConfirmResolves] = useState<Map<string, (value: boolean) => void>>(new Map());

  const showNotification = (
    message: string,
    actions?: NotificationAction[],
    type: NotificationItem['type'] = 'info',
    duration: number = actions && actions.length > 0 ? 0 : 3000
  ) => {
    const id = Date.now().toString();
    const notification: NotificationItem = {
      id,
      message,
      actions,
      type,
      duration,
    };
    setNotifications(prev => [...prev, notification]);
  };

  const confirm = (message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const id = Date.now().toString();
      setConfirmResolves(prev => new Map(prev.set(id, resolve)));
      showNotification(message, [
        { text: 'Yes', onClick: () => resolve(true), variant: 'primary' },
        { text: 'No', onClick: () => resolve(false), variant: 'secondary' },
      ], 'warning', 0);
    });
  };

  const closeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    const resolve = confirmResolves.get(id);
    if (resolve) {
      resolve(false); // Default to false if closed without action
      setConfirmResolves(prev => {
        const newMap = new Map(prev);
        newMap.delete(id);
        return newMap;
      });
    }
  };

  return (
    <NotificationContext.Provider value={{ showNotification, confirm }}>
      {children}
      <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
        {notifications.map(notification => (
          <div key={notification.id} className="pointer-events-auto">
            <Notification notification={notification} onClose={closeNotification} />
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};