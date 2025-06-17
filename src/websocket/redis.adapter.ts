import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter>;

  async connectToRedis(): Promise<void> {
    const pubClient = createClient({ 
      url: 'redis://default:xNukaJlNeUllBgKlHtyzBRMPCApKeBzy@turntable.proxy.rlwy.net:41633' 
    });
    const subClient = pubClient.duplicate();

    await Promise.all([pubClient.connect(), subClient.connect()]);
    this.adapterConstructor = createAdapter(pubClient, subClient);
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, options);
    
    // Make sure the adapterConstructor is properly initialized
    if (!this.adapterConstructor) {
      throw new Error('Redis adapter is not initialized. Call connectToRedis() first.');
    }
    
    server.adapter(this.adapterConstructor);
    return server;
  }
}
