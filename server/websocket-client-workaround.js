/**
 * WebSocket Client Workaround
 * 
 * This file provides a workaround for connecting to WebSocket servers from HTTPS sites.
 * It uses a proxy service to bridge the connection between HTTPS and WS.
 * 
 * Usage:
 * 1. Include this file in your frontend
 * 2. Use the createSecureWebSocket function instead of directly creating a WebSocket
 */

/**
 * Creates a secure WebSocket connection that works from HTTPS sites
 * @param {string} serverUrl - The WebSocket server URL (ws:// or wss://)
 * @param {Object} options - Additional options
 * @returns {WebSocket} A WebSocket connection
 */
function createSecureWebSocket(serverUrl, options = {}) {
  // If the server already uses WSS, just connect directly
  if (serverUrl.startsWith('wss://')) {
    return new WebSocket(serverUrl);
  }
  
  // If we're on HTTPS and trying to connect to WS, use a proxy
  if (window.location.protocol === 'https:' && serverUrl.startsWith('ws://')) {
    // Option 1: Use websockify.io as a proxy
    const proxyUrl = `wss://websockify.io/${serverUrl.replace('ws://', '')}`;
    return new WebSocket(proxyUrl);
    
    // Option 2: Use PubNub as a proxy (requires PubNub account)
    // const pubnubProxy = 'wss://pubsub.pubnub.com/v1/blocks/sub-key/YOUR_SUB_KEY/YOUR_BLOCK_ID';
    // return new WebSocket(pubnubProxy);
    
    // Option 3: Use a custom proxy server
    // const customProxy = `wss://your-proxy-server.com/proxy?url=${encodeURIComponent(serverUrl)}`;
    // return new WebSocket(customProxy);
  }
  
  // Default: direct connection
  return new WebSocket(serverUrl);
}

/**
 * Creates a secure Socket.IO connection that works from HTTPS sites
 * @param {string} serverUrl - The Socket.IO server URL
 * @param {Object} options - Socket.IO options
 * @returns {Socket} A Socket.IO connection
 */
function createSecureSocketIO(serverUrl, options = {}) {
  // If we're on HTTPS and trying to connect to HTTP, use a proxy or alternative
  if (window.location.protocol === 'https:' && serverUrl.startsWith('http://')) {
    // Convert to HTTPS if possible
    const secureUrl = serverUrl.replace('http://', 'https://');
    
    // Try to connect with secure URL first
    try {
      return io(secureUrl, {
        ...options,
        transports: ['websocket'],
        secure: true
      });
    } catch (error) {
      console.warn('Failed to connect with secure URL, trying alternatives');
      
      // Option 1: Use a CORS proxy
      // const corsProxyUrl = `https://cors-anywhere.herokuapp.com/${serverUrl}`;
      // return io(corsProxyUrl, options);
      
      // Option 2: Use Socket.IO's path feature with your own proxy
      // return io('https://your-proxy-server.com', {
      //   ...options,
      //   path: `/proxy/${encodeURIComponent(serverUrl)}/socket.io`
      // });
    }
  }
  
  // Default: direct connection
  return io(serverUrl, options);
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createSecureWebSocket,
    createSecureSocketIO
  };
} 