import { DurableObject } from 'cloudflare:workers';

interface ChatMessage {
  id: string;
  userId: string;
  user: string;
  text: string;
  platform: string;
  originPlatform: string;
  avatar?: string;
  pronouns?: string;
  decoration?: string;
  messageDecoration?: string;
  color?: string;
  timestamp: number;
}

interface ClientConnection {
  id: string;
  controller: ReadableStreamDefaultController<Uint8Array>;
}

/**
 * ChatRoom Durable Object - manages real-time chat for the stream
 * Maintains message history and broadcasts updates to all connected clients
 */
export class ChatRoom extends DurableObject {
  private messageHistory: ChatMessage[] = [];
  private clients: Map<string, ClientConnection> = new Map();
  private readonly MAX_HISTORY = 100;
  env: any;

  constructor(state: DurableObjectState, env: any) {
    super(state, env);
    this.env = env;
  }

  /**
   * Add a new client connection and return the stream
   */
  addClient(clientId: string, controller: ReadableStreamDefaultController<Uint8Array>) {
    this.clients.set(clientId, { id: clientId, controller });

    // Send history to new client
    const encoder = new TextEncoder();
    const historyData = 'data: ' + JSON.stringify({
      type: 'history',
      messages: this.messageHistory,
    }) + '\n\n';
    controller.enqueue(encoder.encode(historyData));

    // Return cleanup function
    return () => {
      this.clients.delete(clientId);
    };
  }

  /**
   * Broadcast a message to all connected clients
   */
  broadcastMessage(message: ChatMessage) {
    this.messageHistory.push(message);
    if (this.messageHistory.length > this.MAX_HISTORY) {
      this.messageHistory.shift();
    }

    const encoder = new TextEncoder();
    const data = 'data: ' + JSON.stringify({
      type: 'chat',
      message,
    }) + '\n\n';
    const encoded = encoder.encode(data);

    // Send to all connected clients
    for (const [clientId, client] of this.clients) {
      try {
        client.controller.enqueue(encoded);
      } catch (e) {
        console.error(`Failed to send message to client ${clientId}:`, e);
        this.clients.delete(clientId);
      }
    }
  }

  /**
   * Get recent message history
   */
  getHistory(limit: number = 50): ChatMessage[] {
    return this.messageHistory.slice(-Math.min(limit, this.MAX_HISTORY));
  }

  /**
   * Clear recent messages
   */
  clearMessages(count: number = 50): number {
    const cleared = this.messageHistory.splice(-count, count);
    return cleared.length;
  }

  /**
   * Handle RPC calls from the router
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const method = url.pathname;

    if (method === '/add-client') {
      const { clientId } = (await request.json()) as { clientId: string };
      return this.handleClientStream(clientId);
    } else if (method === '/send-message') {
      const message = (await request.json()) as ChatMessage;
      this.broadcastMessage(message);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } else if (method === '/get-history') {
      const limit = parseInt(url.searchParams.get('limit') || '50');
      return new Response(JSON.stringify({ messages: this.getHistory(limit) }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } else if (method === '/clear') {
      const count = parseInt(url.searchParams.get('count') || '50');
      const cleared = this.clearMessages(count);
      return new Response(JSON.stringify({ ok: true, clearedCount: cleared }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Handle SSE client stream
   */
  private handleClientStream(clientId: string): Response {
    const encoder = new TextEncoder();
    const clientCleanupMap = new Map();

    const stream = new ReadableStream({
      start: (controller) => {
        const cleanup = this.addClient(clientId, controller);

        // Send heartbeat every 30 seconds to keep connection alive
        const heartbeatInterval = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(': heartbeat\n\n'));
          } catch (e) {
            clearInterval(heartbeatInterval);
            cleanup();
          }
        }, 30000);

        clientCleanupMap.set(clientId, { cleanup, heartbeat: heartbeatInterval });
      },
      cancel: () => {
        const cleanupData = clientCleanupMap.get(clientId);
        if (cleanupData) {
          clearInterval(cleanupData.heartbeat);
          cleanupData.cleanup();
          clientCleanupMap.delete(clientId);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}
