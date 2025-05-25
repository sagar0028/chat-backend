const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:3000'); // adjust port if different

ws.on('open', () => {
  console.log('Connected to WebSocket server');
  
  // First authenticate
  const authMessage = {
    type: 'auth',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImlhdCI6MTc0ODExNzY1NCwiZXhwIjoxNzQ4MjA0MDU0fQ.mGTfWVs50BjsfPqmyFpDPfxd4HDQkhOLWX7zXbw5gp8'
  };
  
  ws.send(JSON.stringify(authMessage));
});

ws.on('message', (data) => {
  const message = data.toString();
  console.log('Received:', message);
  
  // If we get auth success, send the test message
  if (message.includes('"type":"auth","status":"success"')) {
    setTimeout(() => {
      const chatMessage = {
        type: 'message',
        receiverId: 1,
        content: 'Hello, this is a test message'
      };
      console.log('Sending message:', JSON.stringify(chatMessage));
      ws.send(JSON.stringify(chatMessage));
    }, 1000);
  }
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});

ws.on('close', () => {
  console.log('Disconnected from WebSocket server');
}); 