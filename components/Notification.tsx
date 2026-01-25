import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface NotificationAction {
  text: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

export interface NotificationItem {
  id: string;
  message: string;
  actions?: NotificationAction[];
  type?: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
}

interface NotificationProps {
  notification: NotificationItem;
  onClose: (id: string) => void;
}

const Notification: React.FC<NotificationProps> = ({ notification, onClose }) => {
  useEffect(() => {
    if (notification.duration && notification.duration > 0) {
      const timer = setTimeout(() => {
        onClose(notification.id);
      }, notification.duration);
      return () => clearTimeout(timer);
    }
  }, [notification, onClose]);

  const getBgColor = () => {
    switch (notification.type) {
      case 'success': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-[#00a884]';
    }
  };

  return (
    <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full mx-4 ${getBgColor()} text-white rounded-lg shadow-lg p-4`}>
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium flex-1">{notification.message}</p>
        <button
          onClick={() => onClose(notification.id)}
          className="ml-2 text-white hover:text-gray-200 transition-colors"
        >
          <X size={16} />
        </button>
      </div>
      {notification.actions && notification.actions.length > 0 && (
        <div className="flex gap-2 mt-3">
          {notification.actions.map((action, index) => (
            <button
              key={index}
              onClick={() => {
                action.onClick();
                onClose(notification.id);
              }}
              className={`px-3 py-1 text-xs font-medium rounded ${
                action.variant === 'secondary'
                  ? 'bg-white/20 text-white hover:bg-white/30'
                  : 'bg-white text-gray-800 hover:bg-gray-100'
              } transition-colors`}
            >
              {action.text}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notification;