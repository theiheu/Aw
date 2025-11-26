import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
// @ts-ignore
import * as mqttLib from 'mqtt';

export type MqttStatus = 'disconnected' | 'connected' | 'connecting' | 'error';

interface MqttContextType {
  weight: number;
  status: MqttStatus;
  error: string | null;
  publish: (topic: string, message: object) => void;
  machineId: string;
  mqttConfig: {
    ip: string;
    port: string;
    proto: string;
    path: string;
  };
}

const MqttContext = createContext<MqttContextType | undefined>(undefined);

export const MqttProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [weight, setWeight] = useState(0);
  const [status, setStatus] = useState<MqttStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const clientRef = useRef<any>(null);

  const toast = useCallback((type: 'success' | 'error' | 'info' | 'warning', message: string, subtext?: string) => {
    try {
      window.dispatchEvent(new CustomEvent('toast', { detail: { type, message, subtext } }));
    } catch {}
  }, []);

  // Load config from localStorage
  const [mqttIp] = useState(() => localStorage.getItem('mqttBrokerIp') || 'localhost');
  const [mqttPort] = useState(() => localStorage.getItem('mqttBrokerPort') || '9001');
  const [mqttProto] = useState(() => localStorage.getItem('mqttBrokerProto') || 'ws');
  const [mqttPath] = useState(() => localStorage.getItem('mqttBrokerPath') || '/mqtt');
  const [mqttUser] = useState(() => localStorage.getItem('mqttUsername') || '');
  const [mqttPass] = useState(() => localStorage.getItem('mqttPassword') || '');
  const [machineId] = useState(() => localStorage.getItem('machineId') || 'weigh1');

  useEffect(() => {
    // Clean up existing connection properly
    if (clientRef.current) {
      try {
        console.log('[MQTT] Cleaning up previous connection...');
        clientRef.current.end(true);
      } catch (e) {
        console.error(e);
      }
      clientRef.current = null;
    }

    if (!mqttIp) {
      setStatus('disconnected');
      return;
    }

    setStatus('connecting');
    // Don't clear error immediately to let user see previous failure if loop happens rapidly
    // setError(null);

    // Robust Path Handling: Ensure leading slash and trim whitespace
    const cleanPath = mqttPath.trim();
    const normalizedPath = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;

    // Construct base URL without path.
    // We pass path in options object to avoid parser ambiguity in mqtt.js v5+
    const brokerUrl = `${mqttProto}://${mqttIp}:${mqttPort}`;

    console.log(`[MQTT] Connecting to ${brokerUrl} (Path: ${normalizedPath}) as ${machineId}...`);

    const options: any = {
      clientId: `weigh-web-${Math.random().toString(16).substring(2, 10)}`,
      clean: true,
      reconnectPeriod: 5000, // Retry every 5 seconds
      connectTimeout: 10000,
      keepalive: 60,
      path: normalizedPath, // Pass normalized path here
    };

    if (mqttUser) options.username = mqttUser;
    if (mqttPass) options.password = mqttPass;

    let client;
    try {
      // Robustly resolve the connect function.
      // @ts-ignore
      const connectFn = mqttLib.connect || mqttLib.default?.connect || mqttLib.default;

      if (typeof connectFn !== 'function') {
        throw new Error("Could not find 'connect' function in mqtt library. Check imports.");
      }

      client = connectFn(brokerUrl, options);
    } catch (err: any) {
      console.error('[MQTT] Initialization Error:', err);
      setStatus('error');
      setError(err.message || 'Lỗi khởi tạo thư viện MQTT');
      return;
    }

    clientRef.current = client;

    const readingTopic = `weigh/${machineId}/reading`;
    const statusTopic = `weigh/${machineId}/status`;

    client.on('connect', () => {
      console.log('[MQTT] Connected successfully');
      setStatus('connected');
      setError(null);
      toast('success', 'Đã kết nối PC trung tâm', `${brokerUrl}${normalizedPath}`);

      client.subscribe([readingTopic, statusTopic], (err: any) => {
        if (err) console.error('[MQTT] Subscribe error:', err);
        else console.log(`[MQTT] Subscribed to ${readingTopic}`);
      });
    });

    client.on('reconnect', () => {
      console.log('[MQTT] Reconnecting...');
      setStatus('connecting');
      toast('info', 'Đang kết nối lại PC trung tâm...');
    });

    client.on('message', (topic: string, message: any) => {
      try {
        // Robust message decoding for Browser (Uint8Array/Buffer)
        let payloadStr = '';
        if (typeof message === 'string') {
          payloadStr = message;
        } else if (
          message instanceof Uint8Array ||
          message instanceof ArrayBuffer ||
          (message.buffer && message.buffer instanceof ArrayBuffer)
        ) {
          // Use TextDecoder for standard browser binary handling
          payloadStr = new TextDecoder('utf-8').decode(message);
        } else {
          // Fallback for Buffer polyfills
          payloadStr = message.toString();
        }

        const payload = JSON.parse(payloadStr);

        if (topic === readingTopic) {
          if (typeof payload.weight === 'number') {
            setWeight(payload.weight);
          }
        } else if (topic === statusTopic) {
          const s = (payload && payload.status) || '';
          if (s === 'PRINT_OK') {
            toast('success', 'In phiếu thành công', payload.ticketId ? `Phiếu: ${payload.ticketId}` : undefined);
          } else if (s === 'PRINT_ERROR') {
            toast('error', 'In phiếu thất bại', payload.error || payload.ticketId || undefined);
          } else if (s === 'ONLINE') {
            toast('success', 'PC trung tâm ONLINE');
          } else if (s === 'OFFLINE') {
            toast('warning', 'PC trung tâm OFFLINE');
          }
        }
      } catch (e) {
        console.error('[MQTT] Message parse error:', e);
      }
    });

    client.on('error', (err: any) => {
      console.error('[MQTT] Connection Error:', err);
      setStatus('error');

      let errMsg = err.message || 'Lỗi kết nối server';
      // Heuristics for common errors
      if (
        errMsg.includes('WebSocket') ||
        errMsg.includes('connection refused') ||
        errMsg.includes('404')
      ) {
        errMsg = `Không thể kết nối tới ${brokerUrl}. Kiểm tra Path (${normalizedPath}), Port, và Protocol.`;
      }
      setError(errMsg);
    });

    client.on('offline', () => {
      console.log('[MQTT] Client offline');
      // If we were connected, we are now reconnecting.
      // If we were already erroring, we stay erroring to show the message.
      setStatus((prev) => (prev === 'connected' ? 'connecting' : prev));
    });

    client.on('close', () => {
      console.log('[MQTT] Client closed');
      // Often fires on 404 or immediate disconnects
      if (status !== 'connected') {
        setStatus('error');
        if (!error) setError(`Kết nối bị đóng. Kiểm tra đường dẫn WebSocket (${normalizedPath})`);
      }
    });

    return () => {
      if (clientRef.current) {
        clientRef.current.end(true);
      }
    };
  }, [mqttIp, mqttPort, mqttProto, mqttPath, mqttUser, mqttPass, machineId]);

  const publish = useCallback((topic: string, message: object) => {
    if (clientRef.current && clientRef.current.connected) {
      clientRef.current.publish(topic, JSON.stringify(message));
    } else {
      console.warn('[MQTT] Cannot publish: Client not connected');
    }
  }, []);

  const value = {
    weight,
    status,
    error,
    publish,
    machineId,
    mqttConfig: { ip: mqttIp, port: mqttPort, proto: mqttProto, path: mqttPath },
  };

  return <MqttContext.Provider value={value}>{children}</MqttContext.Provider>;
};

export const useMqtt = (): MqttContextType => {
  const context = useContext(MqttContext);
  if (context === undefined) {
    throw new Error('useMqtt must be used within a MqttProvider');
  }
  return context;
};
