import React, { useState, useEffect } from 'react';
import { io } from "socket.io-client";
const socket = io("http://localhost:5000");

function ChatApp() {
  const [message, setMessage] = useState('');
  const [chatLog, setChatLog] = useState([]);

  useEffect(() => {
    // Listen for incoming messages
    socket.on('receive_message', (data) => {
      //setChatLog((prev) => [...prev, data]);
    });

    // Cleanup: remove listener on unmount
    return () => {
      socket.off('receive_message');
    };
  }, []);

  const sendMessage = () => {
    if (message !== '') {
      socket.emit('send_message', { text: message, id: socket.id });
      setMessage('');
    }
  };

  return (
    <div>
      <h3>Real-Time Chat</h3>
      <input 
        value={message} 
        onChange={(e) => setMessage(e.target.value)} 
        placeholder="Type a message..."
      />
      <button onClick={sendMessage}>Send</button>

      <div>
        {chatLog.map((msg, index) => (
       //   <p key={index}><strong>{msg.id.substring(0, 5)}:</strong> {msg.text}</p>
        ))}
      </div>
    </div>
  );
}

export default ChatApp;
