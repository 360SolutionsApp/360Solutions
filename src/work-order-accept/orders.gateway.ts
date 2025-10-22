/* eslint-disable prettier/prettier */
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*', // ✅ Cambia si necesitas restringir dominios
  },
})
export class WorkOrderAcceptGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private readonly logger = new Logger('WorkOrderAcceptGateway');

  afterInit() {
    this.logger.log('✅ WebSocket Gateway inicializado');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Cliente conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Cliente desconectado: ${client.id}`);
  }

  // 🔥 Emitir evento cuando cambie el estado de las órdenes pendientes
  notifyPendingOrders(collaboratorId: number, pendingOrders: any) {
    this.server.emit(`pending-orders:${collaboratorId}`, pendingOrders);
  }
}
