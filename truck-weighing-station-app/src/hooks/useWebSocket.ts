// The actual context is defined in WebSocketContext.tsx
// To avoid circular dependencies, we assume the provider is used higher up.
// For simplicity, we can re-export the status type.

export type { WebSocketStatus } from '../contexts/WebSocketContext';
export { useWebSocket } from '../contexts/WebSocketContext';
