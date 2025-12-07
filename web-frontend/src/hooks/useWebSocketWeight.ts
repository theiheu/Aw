import { useEffect, useMemo, useRef, useState, useCallback } from 'react';

export type WSStatus = 'idle' | 'connecting' | 'open' | 'closed' | 'error';

export interface UseWebSocketWeightOptions {
  // WebSocket URL. Example: ws://<server>:4000/ws/weight
  url?: string;
  // Build URL dynamically from location
  buildUrl?: () => string;
  // Optional token for auth header via query or subprotocol (simple)
  token?: string;
  // Backoff config
  maxRetries?: number; // default: Infinity
  retryBaseDelayMs?: number; // default: 1000
  retryMaxDelayMs?: number; // default: 15000
  // Custom parser if backend payload format differs
  parse?: (data: any) => number | null;
}

export interface WeightMessage {
  value?: number;       // preferred
  weight?: number;      // legacy
  unit?: string;        // optional
  stable?: boolean;     // optional
  ts?: string;          // ISO timestamp
  [k: string]: any;
}

export function useWebSocketWeight(opts: UseWebSocketWeightOptions = {}) {
  const {
    url,
    buildUrl,
    token,
    maxRetries = Number.POSITIVE_INFINITY,
    retryBaseDelayMs = 1000,
    retryMaxDelayMs = 15000,
    parse,
  } = opts;

  const [status, setStatus] = useState<WSStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [weight, setWeight] = useState<number>(0);
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef<number>(0);
  const manualCloseRef = useRef<boolean>(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const endpoint = useMemo(() => {
    if (typeof buildUrl === 'function') return buildUrl();
    if (url) return url;
    // Default guess: current origin -> ws(s)://host/ws/weight
    if (typeof window !== 'undefined') {
      const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
      return `${proto}://${window.location.host}/ws/weight`;
    }
    return '';
  }, [buildUrl, url]);

  const clearReconnectTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const scheduleReconnect = useCallback(() => {
    if (manualCloseRef.current) return; // do not reconnect after manual close
    const attempt = retryRef.current;
    const delay = Math.min(retryBaseDelayMs * Math.pow(2, attempt), retryMaxDelayMs);
    timeoutRef.current = setTimeout(() => {
      connect();
    }, delay);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryBaseDelayMs, retryMaxDelayMs, endpoint, token]);

  const connect = useCallback(() => {
    try {
      if (!endpoint) return;
      // Cleanup existing
      if (wsRef.current) {
        try { wsRef.current.close(); } catch {}
        wsRef.current = null;
      }
      manualCloseRef.current = false;
      setStatus('connecting');
      setError(null);

      const urlObj = new URL(endpoint);
      if (token) urlObj.searchParams.set('token', token);

      const ws = new WebSocket(urlObj.toString());
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus('open');
        setError(null);
        retryRef.current = 0;
      };

      ws.onmessage = (ev) => {
        try {
          let data: any = ev.data;
          if (typeof data === 'string') {
            data = JSON.parse(data);
          }
          const msg = data as WeightMessage;
          const parsed = typeof parse === 'function'
            ? parse(msg)
            : (typeof msg.value === 'number' ? msg.value : (typeof msg.weight === 'number' ? msg.weight : null));
          if (typeof parsed === 'number' && isFinite(parsed)) {
            setWeight(parsed);
            setLastUpdate(Date.now());
          }
        } catch (e: any) {
          // swallow parse errors but keep connection
          console.error('[WS] parse error:', e?.message || e);
        }
      };

      ws.onerror = (ev: Event) => {
        setStatus('error');
        setError('WebSocket error');
      };

      ws.onclose = () => {
        setStatus('closed');
        if (!manualCloseRef.current) {
          if (retryRef.current < maxRetries) {
            retryRef.current += 1;
            scheduleReconnect();
          }
        }
      };
    } catch (e: any) {
      setStatus('error');
      setError(e?.message || 'Init error');
      if (retryRef.current < maxRetries) {
        retryRef.current += 1;
        scheduleReconnect();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, token, maxRetries, scheduleReconnect, parse]);

  const disconnect = useCallback(() => {
    manualCloseRef.current = true;
    clearReconnectTimer();
    if (wsRef.current) {
      try { wsRef.current.close(); } catch {}
      wsRef.current = null;
    }
    setStatus('closed');
  }, []);

  const reconnectNow = useCallback(() => {
    retryRef.current = 0;
    clearReconnectTimer();
    connect();
  }, [connect]);

  useEffect(() => {
    connect();
    return () => {
      manualCloseRef.current = true;
      clearReconnectTimer();
      if (wsRef.current) {
        try { wsRef.current.close(); } catch {}
        wsRef.current = null;
      }
    };
  }, [connect]);

  return {
    status,
    error,
    weight,
    lastUpdate,
    connect: reconnectNow,
    disconnect,
    endpoint,
  } as const;
}

