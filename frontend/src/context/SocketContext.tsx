import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';

interface SocketContextType {
  isConnected: boolean;
  lastMessageEvent: any;
  sendMessageWs: (text: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastMessageEvent, setLastMessageEvent] = useState<any>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('skillbarter_token');
    if (!currentUser || !token) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    const getWsUrl = () => {
      const explicitWs = import.meta.env.VITE_WS_URL;
      if (explicitWs) return `${explicitWs.replace(/\/$/, '')}/ws/${token}`;
      const apiUrl = import.meta.env.VITE_API_URL;
      if (apiUrl) {
        const base = apiUrl.replace(/^http/, 'ws').replace(/\/api\/?$/, '');
        return `${base}/ws/${token}`;
      }
      return `ws://localhost:8000/ws/${token}`;
    };
    const wsUrl = getWsUrl();
    let socket: WebSocket | null = null;
    let reconnectTimeout: any = null;

    const connect = () => {
      try {
        socket = new WebSocket(wsUrl);
        wsRef.current = socket;

        socket.onopen = () => {
          setIsConnected(true);
        };

        socket.onmessage = (event) => {
          try {
            const parsed = JSON.parse(event.data);
            setLastMessageEvent(parsed);
          } catch {
            // non-json keepalive
          }
        };

        socket.onclose = () => {
          setIsConnected(false);
          // Try reconnecting after 4 seconds
          reconnectTimeout = setTimeout(connect, 4000);
        };

        socket.onerror = () => {
          setIsConnected(false);
        };
      } catch {
        setIsConnected(false);
      }
    };

    connect();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [currentUser?.id]);

  const sendMessageWs = (text: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(text);
    }
  };

  return (
    <SocketContext.Provider value={{ isConnected, lastMessageEvent, sendMessageWs }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
