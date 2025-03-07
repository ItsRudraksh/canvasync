/**
 * Frontend Connection Example
 * 
 * This file shows how to connect to your deployed WebSocket server from your frontend.
 * Replace your existing Socket.IO connection code with this approach.
 */

import { io } from 'socket.io-client';

// Function to create a socket connection that works with both development and production
function createSocketConnection() {
  // Get the WebSocket URL from environment variables or use a default
  const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'https://your-deployed-socket-server.fly.dev';
  
  // Options for Socket.IO connection
  const options = {
    transports: ['websocket'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  };

  // Create the socket connection
  const socket = io(SOCKET_URL, options);
  
  // Add event listeners for connection status
  socket.on('connect', () => {
    console.log('Connected to WebSocket server');
  });
  
  socket.on('connect_error', (error) => {
    console.error('WebSocket connection error:', error);
    
    // If connection fails, try alternative methods
    if (window.location.protocol === 'https:' && SOCKET_URL.startsWith('http://')) {
      console.log('Trying secure connection workaround...');
      
      // Try connecting through a proxy or with wss://
      const secureUrl = SOCKET_URL.replace('http://', 'https://');
      const secureSocket = io(secureUrl, {
        ...options,
        secure: true
      });
      
      return secureSocket;
    }
  });
  
  socket.on('disconnect', (reason) => {
    console.log('Disconnected from WebSocket server:', reason);
  });
  
  return socket;
}

// Usage in your application
export function useSocket() {
  const [socket, setSocket] = useState(null);
  
  useEffect(() => {
    // Create the socket connection
    const socketConnection = createSocketConnection();
    setSocket(socketConnection);
    
    // Clean up on unmount
    return () => {
      if (socketConnection) {
        socketConnection.disconnect();
      }
    };
  }, []);
  
  return socket;
}

// Example usage in a component
function WhiteboardComponent() {
  const socket = useSocket();
  
  useEffect(() => {
    if (!socket) return;
    
    // Join a whiteboard room
    socket.emit('join-whiteboard', {
      whiteboardId: 'your-whiteboard-id',
      instanceId: 'your-instance-id',
      user: { id: 'user-id', name: 'User Name' },
      canEdit: true
    });
    
    // Listen for events
    socket.on('user-joined', (data) => {
      console.log('User joined:', data);
    });
    
    // Clean up listeners
    return () => {
      socket.off('user-joined');
    };
  }, [socket]);
  
  // Rest of your component
} 