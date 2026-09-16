import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, MessageSquare, Repeat, ShieldCheck, UserPlus, ArrowLeftRight } from 'lucide-react';
import { AppPageShell } from '../components/ui/AppPageShell';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useNotifications } from '../context/NotificationContext';

const iconFor=(type:string)=>{if(type==='MESSAGE')return MessageSquare;if(type.startsWith('EXCHANGE'))return ArrowLeftRight;if(type.includes('CONNECT'))return UserPlus;if(type.includes('TRUST')||type.includes('REVIEW'))return ShieldCheck;return Repeat;};

export const NotificationsPage:React.FC=()=>{
 const {notifications,unreadCount,loading,markAsRead,markAllAsRead,refreshNotifications}=useNotifications();
 const navigate=useNavigate();
 const open=async(n:any)=>{await markAsRead(Number(n.id));if(n.link)navigate(n.link);};
 return <AppPageShell eyebrow="Activity" title="Notifications" description="Stay on top of messages, exchanges, connections and trust activity." icon={<Bell className="h-3.5 w-3.5"/>} actions={<div className="flex gap-2"><Button size="sm" variant="outline" onClick={refreshNotifications}>Refresh</Button>{unreadCount>0&&<Button size="sm" onClick={markAllAsRead} icon={<CheckCheck className="h-4 w-4"/>}>Mark all read</Button>}</div>}>
   <div className="mb-4 flex items-center justify-between"><p className="text-xs text-[#697386]">{unreadCount?`${unreadCount} unread notification${unreadCount===1?'':'s'}`:'You are all caught up.'}</p></div>
   <Card className="overflow-hidden">
    {loading?<div className="p-10 text-center text-xs text-slate-400">Loading notifications…</div>:notifications.length===0?<div className="p-14 text-center"><Bell className="mx-auto mb-3 h-8 w-8 text-slate-300"/><p className="text-sm font-bold text-[#17233b]">No activity yet</p><p className="mt-1 text-xs text-[#697386]">Messages and exchange updates will appear here.</p></div>:notifications.map((n:any)=>{const Icon=iconFor(String(n.type||''));return <button key={n.id} type="button" onClick={()=>open(n)} className={`flex w-full items-start gap-4 border-b border-[#edf0f2] p-5 text-left last:border-0 hover:bg-[#fafbfc] ${!n.is_read?'bg-[#fff8f8]':''}`}><span className={`flex h-9 w-9 shrink-0 items-center justify-center ${!n.is_read?'bg-[#fff0f0] text-[#d31d24]':'bg-[#f3f5f7] text-[#697386]'}`}><Icon className="h-4 w-4"/></span><span className="min-w-0 flex-1"><span className="flex items-center gap-2"><span className="text-sm font-bold text-[#17233b]">{n.title}</span>{!n.is_read&&<span className="h-1.5 w-1.5 bg-[#d31d24]"/>}</span><span className="mt-1 block text-xs leading-5 text-[#697386]">{n.message}</span><span className="mt-2 block text-[10px] text-slate-400">{n.created_at?new Date(n.created_at).toLocaleString():''}</span></span></button>})}
   </Card>
 </AppPageShell>;
};
