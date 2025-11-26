import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

export type WebSocketStatus = 'disconnected' | 'connected' | 'connecting' | 'error';

interface WebSocketContextType {
  weight: number;
  status: WebSocketStatus;
  sendMessage: (message: object) => void;
  lastMessage: any | null;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [weight, setWeight] = useState(0);
  const [status, setStatus] = useState<WebSocketStatus>('disconnected');
  const [lastMessage, setLastMessage] = useState<any | null>(null);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    const serverUrl = localStorage.getItem('weighingServerUrl');

    if (!serverUrl || !serverUrl.startsWith('ws://')) {
      if (status !== 'disconnected') {
        setStatus('disconnected');
        setWeight(0);
      }
      return;
    }

    if (ws.current) {
      ws.current.close();
    }

    setStatus('connecting');

    try {
      ws.current = new WebSocket(serverUrl);
    } catch (error) {
      console.error('WebSocket connection error:', error);
      setStatus('error');
      return;
    }

    ws.current.onopen = () => {
      console.log('WebSocket connected');
      setStatus('connected');
    };

    ws.current.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        setLastMessage(message); // Track last message for components to react to

        if (message.type === 'weight_update' && typeof message.payload === 'number') {
          setWeight(message.payload);
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.current.onclose = () => {
      console.log('WebSocket disconnected');
      setStatus('disconnected');
      setWeight(0);
    };

    ws.current.onerror = (err) => {
      console.error('WebSocket error:', err);
      setStatus('error');
      setWeight(0);
    };

    // Cleanup on component unmount
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []); // Re-run effect only on mount, settings screen will trigger a reload to reconnect

  const sendMessage = useCallback((message: object) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not connected. Cannot send message.');
      // Optionally, you can throw an error or alert the user
      // alert('Không thể gửi lệnh: Mất kết nối với server.');
    }
  }, []);

  const value = { weight, status, sendMessage, lastMessage };

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
};

export const useWebSocket = (): WebSocketContextType => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};
