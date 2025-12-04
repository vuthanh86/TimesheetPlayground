
import React, { useRef, useEffect } from 'react';
import { Bell, CalendarX, AlertTriangle, X, CheckCircle2 } from 'lucide-react';

export interface SystemNotification {
  id: string;
  type: 'OVERDUE' | 'OVERTIME';
  title: string;
  message: string;
  severity: 'high' | 'medium';
}

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: SystemNotification[];
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ isOpen, onClose, notifications }) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      ref={dropdownRef}
      className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 origin-top-right"
    >
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
          <Bell className="w-4 h-4 text-indigo-600" />
          Notifications
          <span className="bg-indigo-100 text-indigo-700 text-[10px] px-2 py-0.5 rounded-full">
            {notifications.length}
          </span>
        </h3>
        <button 
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1 rounded-full transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-slate-400 flex flex-col items-center gap-2">
            <CheckCircle2 className="w-8 h-8 opacity-20" />
            <p className="text-sm">All clear! No issues detected.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {notifications.map((notif) => (
              <div key={notif.id} className="p-4 hover:bg-slate-50 transition-colors flex gap-3 items-start">
                <div className={`mt-0.5 p-2 rounded-full shrink-0 ${
                  notif.type === 'OVERDUE' 
                    ? 'bg-red-100 text-red-600' 
                    : 'bg-amber-100 text-amber-600'
                }`}>
                  {notif.type === 'OVERDUE' ? (
                    <CalendarX className="w-4 h-4" />
                  ) : (
                    <AlertTriangle className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <h4 className={`text-sm font-bold ${
                    notif.type === 'OVERDUE' ? 'text-red-700' : 'text-amber-700'
                  }`}>
                    {notif.title}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {notif.message}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationDropdown;
