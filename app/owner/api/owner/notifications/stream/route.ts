import { NextRequest } from 'next/server';
import { verifyOwnerToken } from '@/lib/auth';

// Store active connections
const connections = new Set<ReadableStreamDefaultController>();

// Note: Broadcast function moved to separate utility file to avoid Next.js route export conflicts

export async function GET(request: NextRequest) {
  try {
    // Authenticate owner
    const tokenCookie = request.cookies.get('owner_token');
    if (!tokenCookie) {
      return new Response('Authentication required', { status: 401 });
    }

    const payload = verifyOwnerToken(tokenCookie.value);
    if (!payload) {
      return new Response('Invalid session', { status: 401 });
    }

    console.log('SSE connection established', { ownerId: payload.id });

    // Create a readable stream for SSE
    const stream = new ReadableStream({
      start(controller) {
        // Add connection to active connections
        connections.add(controller);

        // Send initial connection message
        const initialMessage = `data: ${JSON.stringify({
          id: 'connection',
          type: 'connection',
          title: 'Connected',
          message: 'Real-time notifications enabled',
          timestamp: new Date(),
          read: true,
          priority: 'low'
        })}\n\n`;
        
        controller.enqueue(new TextEncoder().encode(initialMessage));

        // Send periodic heartbeat
        const heartbeat = setInterval(() => {
          try {
            controller.enqueue(new TextEncoder().encode(': heartbeat\n\n'));
          } catch (error) {
            clearInterval(heartbeat);
            connections.delete(controller);
          }
        }, 30000); // Every 30 seconds

        // Cleanup on close
        request.signal.addEventListener('abort', () => {
          clearInterval(heartbeat);
          connections.delete(controller);
          controller.close();
        });
      },
      
      cancel() {
        connections.delete(this as any);
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      }
    });

  } catch (error) {
    console.error('SSE connection error', error);
    return new Response('Internal server error', { status: 500 });
  }
}

// Note: Simulation functions moved to separate utility to avoid Next.js route export conflicts