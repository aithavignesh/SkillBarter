import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { NotificationItem } from '../types';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';

interface NotificationContextType { notifications: NotificationItem[]; unreadCount: number; loading: boolean; refreshNotifications: () => Promise<void>; markAsRead: (id:number) => Promise<void>; markAllAsRead: () => Promise<void>; }
const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{children:React.ReactNode}> = ({children}) => {
  const {currentUser}=useAuth(); const {lastMessageEvent}=useSocket();
  const [notifications,setNotifications]=useState<NotificationItem[]>([]); const [unreadCount,setUnreadCount]=useState(0); const [loading,setLoading]=useState(false);
  const refreshVersion = React.useRef(0);
  const refreshNotifications=async()=>{const version=++refreshVersion.current;const userId=Number(currentUser?.id||0);if(!userId){setNotifications([]);setUnreadCount(0);setLoading(false);return;}try{setLoading(true);const list=await api.getNotifications();if(version!==refreshVersion.current||Number(currentUser?.id||0)!==userId)return;setNotifications(list);setUnreadCount(list.filter((item:any)=>!item.is_read).length);}catch(e){if(version===refreshVersion.current)console.error(e);}finally{if(version===refreshVersion.current)setLoading(false);}};
  useEffect(()=>{refreshNotifications();},[currentUser?.id]);
  useEffect(()=>{if(lastMessageEvent)refreshNotifications();},[lastMessageEvent]);
  const markAsRead=async(id:number)=>{if(!currentUser)return;const item=notifications.find(n=>Number(n.id)===Number(id));if(!item)return;try{await api.markNotificationRead(id);setNotifications(p=>p.map(n=>n.id===id?{...n,is_read:true}:n));if(!item.is_read)setUnreadCount(p=>Math.max(0,p-1));}catch(e){console.error(e);}};
  const markAllAsRead=async()=>{if(!currentUser)return;try{await api.markAllNotificationsRead();setNotifications(p=>p.map(n=>({...n,is_read:true})));setUnreadCount(0);}catch(e){console.error(e);}};
  return <NotificationContext.Provider value={{notifications,unreadCount,loading,refreshNotifications,markAsRead,markAllAsRead}}>{children}</NotificationContext.Provider>;
};
export const useNotifications=()=>{const context=useContext(NotificationContext);if(!context)throw new Error('useNotifications must be used within NotificationProvider');return context;};
