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
    // Auth tokens are stored in sessionStorage by the current auth flow.
    // Reading localStorage here prevents the notification/message socket from
    // connecting for normal browser sessions.
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
      // The current production auth session is issued by InsForge, while the
      // legacy FastAPI WebSocket expects a different JWT. Never fall back to
      // localhost or derive a socket URL from VITE_API_URL.
      if (!explicitWs) return null;
      return `${explicitWs.replace(/\/$/, '')}/ws/${token}`;
    };
    const wsUrl = getWsUrl();
    if (!wsUrl) {
      setIsConnected(false);
      return;
    }
    let socket: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;

    const connect = () => {
      if (stopped) return;
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
          // Reconnect only while this auth-scoped socket effect is active.
          if (!stopped) reconnectTimeout = setTimeout(connect, 4000);
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
      stopped = true;
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
