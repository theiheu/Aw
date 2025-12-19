import { Injectable, Logger } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, WebSocket } from 'ws';

interface WeightBroadcastPayload {
  type: 'weight_update' | 'agent_status' | 'print_result';
  payload?: number | string | Record<string, any>;
  machineId?: string;
  unit?: string;
  ts?: string;
}

@WebSocketGateway({ path: '/ws/weight', cors: true })
@Injectable()
export class WeightGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(WeightGateway.name);

  @WebSocketServer()
  server!: Server;

  handleConnection(client: WebSocket) {
    this.logger.log('WS client connected');
  }

  handleDisconnect(client: WebSocket) {
    this.logger.log('WS client disconnected');
  }

  broadcastWeight(machineId: string, value: number, unit = 'kg', ts?: string) {
    const msg: WeightBroadcastPayload = {
      type: 'weight_update',
      payload: value,
      machineId,
      unit,
      ts: ts || new Date().toISOString(),
    };
    this._broadcast(msg);
  }

  broadcastStatus(machineId: string, status: string) {
    const msg: WeightBroadcastPayload = {
      type: 'agent_status',
      payload: status,
      machineId,
      ts: new Date().toISOString(),
    };
    this._broadcast(msg);
  }

  broadcastPrint(machineId: string, result: string) {
    const msg: WeightBroadcastPayload = {
      type: 'print_result',
      payload: result,
      machineId,
      ts: new Date().toISOString(),
    };
    this._broadcast(msg);
  }

  private _broadcast(obj: any) {
    try {
      const data = JSON.stringify(obj);
      this.server?.clients?.forEach((c: WebSocket) => {
        try {
          if ((c as any).readyState === (c as any).OPEN) c.send(data);
        } catch (_) {}
      });
    } catch (e) {
      this.logger.error('WS broadcast error', e as any);
    }
  }
}

