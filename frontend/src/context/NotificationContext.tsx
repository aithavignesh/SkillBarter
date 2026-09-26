import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { NotificationItem } from '../types';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';

interface NotificationContextType { notifications: NotificationItem[]; unreadCount: number; loading: boolean; error: string | null; refreshNotifications: () => Promise<void>; markAsRead: (id:number) => Promise<void>; markAllAsRead: () => Promise<void>; }
const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{children:React.ReactNode}> = ({children}) => {
  const {currentUser}=useAuth(); const {lastMessageEvent}=useSocket();
  const [notifications,setNotifications]=useState<NotificationItem[]>([]); const [unreadCount,setUnreadCount]=useState(0); const [loading,setLoading]=useState(Boolean(currentUser)); const [error,setError]=useState<string|null>(null);
  const refreshNotifications=async()=>{if(!currentUser){setNotifications([]);setUnreadCount(0);setError(null);setLoading(false);return;}try{setLoading(true);setError(null);const list=await api.getNotifications();setNotifications(list);setUnreadCount(list.filter((item:any)=>!item.is_read).length);}catch(e){console.error(e);setError(e instanceof Error ? e.message : 'Unable to load notifications.');}finally{setLoading(false);}};
  useEffect(()=>{refreshNotifications();},[currentUser?.id]);
  useEffect(()=>{if(lastMessageEvent)refreshNotifications();},[lastMessageEvent]);
  const markAsRead=async(id:number)=>{const item=notifications.find(n=>Number(n.id)===Number(id));if(!item)return;try{setError(null);await api.markNotificationRead(id);setNotifications(p=>p.map(n=>n.id===id?{...n,is_read:true}:n));if(!item.is_read)setUnreadCount(p=>Math.max(0,p-1));}catch(e){console.error(e);setError(e instanceof Error ? e.message : 'Unable to update this notification.');}};
  const markAllAsRead=async()=>{try{setError(null);await api.markAllNotificationsRead();setNotifications(p=>p.map(n=>({...n,is_read:true})));setUnreadCount(0);}catch(e){console.error(e);setError(e instanceof Error ? e.message : 'Unable to mark notifications as read.');}};
  return <NotificationContext.Provider value={{notifications,unreadCount,loading,error,refreshNotifications,markAsRead,markAllAsRead}}>{children}</NotificationContext.Provider>;
};
export const useNotifications=()=>{const context=useContext(NotificationContext);if(!context)throw new Error('useNotifications must be used within NotificationProvider');return context;};
