import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, MessageSquare, Repeat, ShieldCheck, UserPlus, ArrowLeftRight } from 'lucide-react';
import { AppPageShell } from '../components/ui/AppPageShell';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useNotifications } from '../context/NotificationContext';
import { trackEvent } from '../services/analytics';

const iconFor=(type:string)=>{if(type==='MESSAGE')return MessageSquare;if(type.startsWith('EXCHANGE'))return ArrowLeftRight;if(type.includes('CONNECT'))return UserPlus;if(type.includes('TRUST')||type.includes('REVIEW'))return ShieldCheck;return Repeat;};
const groupFor=(type:string)=>type==='MESSAGE'?'Messages':type.startsWith('EXCHANGE')?'Exchanges':type.includes('CONNECT')?'Connections':type.includes('TRUST')||type.includes('REVIEW')?'Trust & reviews':'Other';
const labelFor=(type:string)=>{const map:any={MESSAGE:'Message',EXCHANGE_ACCEPTED:'Exchange accepted',EXCHANGE_REJECTED:'Exchange declined',EXCHANGE_WITHDRAWN:'Exchange withdrawn',EXCHANGE_CANCELLED:'Exchange cancelled',EXCHANGE_COMPLETED:'Exchange completed',EXCHANGE_COMPLETION_PENDING:'Completion confirmed',EXCHANGE_SCHEDULE_UPDATED:'Schedule updated',CONNECTION_REQUEST:'Connection request',CONNECTION_ACCEPTED:'Connection accepted',NEW_REVIEW:'New review',TRUST_REVIEW:'New review',REVIEW:'New review'};return map[type]||'Activity';};
const timeFor=(value?:string)=>{if(!value)return '';const d=new Date(value),diff=Math.max(0,Date.now()-d.getTime()),m=Math.floor(diff/60000),h=Math.floor(m/60),day=Math.floor(h/24);if(m<1)return 'Just now';if(m<60)return `${m}m ago`;if(h<24)return `${h}h ago`;if(day<7)return `${day}d ago`;return d.toLocaleDateString();};

export const NotificationsPage:React.FC=()=>{
 const {notifications,unreadCount,loading,markAsRead,markAllAsRead,refreshNotifications}=useNotifications();
 const navigate=useNavigate();
 const [filter, setFilter] = useState('ALL');
 const filtered = useMemo(() => filter === 'ALL' ? notifications : notifications.filter((n:any) => groupFor(String(n.type||'')) === filter), [notifications, filter]);
 const filterOptions = ['ALL','Messages','Exchanges','Connections','Trust & reviews','Other'];
 const unreadByGroup = useMemo(() => filterOptions.slice(1).reduce((acc:any,key)=>{acc[key]=notifications.filter((n:any)=>!n.is_read&&groupFor(String(n.type||''))===key).length;return acc;},{}), [notifications]);
 const open=async(n:any)=>{await markAsRead(Number(n.id));trackEvent('notification_opened',{notification_type:String(n.type||'OTHER'),has_link:Boolean(n.link)});if(n.link)navigate(n.link);};
 return <AppPageShell eyebrow="Activity" title="Notifications" description="Stay on top of messages, exchanges, connections and trust activity. Open an alert to jump straight to the action that needs your attention." icon={<Bell className="h-3.5 w-3.5"/>} actions={<div className="flex gap-2"><Button size="sm" variant="outline" onClick={refreshNotifications}>Refresh</Button>{unreadCount>0&&<Button size="sm" onClick={markAllAsRead} icon={<CheckCheck className="h-4 w-4"/>}>Mark all read</Button>}</div>}>
   <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"><p className="text-xs text-[#697386]">{unreadCount?`${unreadCount} unread notification${unreadCount===1?'':'s'}`:'You are all caught up.'}</p><div className="flex max-w-full gap-1 overflow-x-auto border border-[#e1e4e8] bg-white p-1">{filterOptions.map(option=><button key={option} type="button" onClick={()=>setFilter(option)} className={`px-2.5 py-1.5 text-[10px] font-bold ${filter===option?'bg-[#17233b] text-white':'text-slate-500 hover:bg-[#f7f8f7]'}`}>{option === 'ALL' ? 'All' : option}{option !== 'ALL' && unreadByGroup[option] > 0 ? <span className="ml-1.5 inline-flex min-w-4 justify-center bg-[#d31d24] px-1 text-[8px] text-white">{unreadByGroup[option]}</span> : null}</button>)}</div></div>
   <Card className="overflow-hidden">
    {loading?<div className="p-10 text-center text-xs text-slate-400">Loading notifications…</div>:filtered.length===0?<div className="p-14 text-center"><Bell className="mx-auto mb-3 h-8 w-8 text-slate-300"/><p className="text-sm font-bold text-[#17233b]">No activity yet</p><p className="mt-1 text-xs text-[#697386]">Messages and exchange updates will appear here.</p></div>:filtered.map((n:any)=>{const Icon=iconFor(String(n.type||''));return <button key={n.id} type="button" onClick={()=>open(n)} className={`flex w-full items-start gap-4 border-b border-[#edf0f2] p-5 text-left last:border-0 hover:bg-[#fafbfc] ${!n.is_read?'bg-[#fff8f8]':''}`}><span className={`flex h-9 w-9 shrink-0 items-center justify-center ${!n.is_read?'bg-[#fff0f0] text-[#d31d24]':'bg-[#f3f5f7] text-[#697386]'}`}><Icon className="h-4 w-4"/></span><span className="min-w-0 flex-1"><span className="flex items-center gap-2"><span className="text-sm font-bold text-[#17233b]">{n.title || labelFor(String(n.type||''))}</span>{!n.is_read&&<span className="h-1.5 w-1.5 bg-[#d31d24]"/>}</span><span className="mt-1 block text-xs leading-5 text-[#697386]">{n.message}</span><span className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-slate-400"><span>{timeFor(n.created_at)}</span><span>·</span><span>{labelFor(String(n.type||''))}</span>{n.link&&<span className="font-bold text-[#d31d24]">Open →</span>}</span></span></button>})}
   </Card>
 </AppPageShell>;
};
