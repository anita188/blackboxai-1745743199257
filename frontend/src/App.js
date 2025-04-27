import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:5000');

function App() {
  const [username, setUsername] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isLoggedIn) {
      socket.emit('join', username);
      fetchUsers();
    }
  }, [isLoggedIn]);

  useEffect(() => {
    socket.on('receive_message', (message) => {
      if (
        (message.sender === selectedUser && message.receiver === username) ||
        (message.sender === username && message.receiver === selectedUser)
      ) {
        setMessages((prev) => [...prev, message]);
      }
    });

    socket.on('message_status', (statusUpdate) => {
      // For simplicity, not updating message status in UI now
    });

    return () => {
      socket.off('receive_message');
      socket.off('message_status');
    };
  }, [selectedUser, username]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('http://localhost:5000/users');
      const data = await res.json();
      setUsers(data.filter((user) => user.username !== username));
    } catch (err) {
      console.error('Failed to fetch users', err);
    }
  };

  const handleLogin = async () => {
    if (!username) return;
    try {
      const res = await fetch('http://localhost:5000/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsLoggedIn(true);
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('Registration failed');
    }
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedUser) return;
    const messageData = {
      sender: username,
      receiver: selectedUser,
      content: newMessage.trim(),
    };
    socket.emit('send_message', messageData);
    setMessages((prev) => [...prev, { ...messageData, timestamp: new Date().toISOString(), status: 'sent' }]);
    setNewMessage('');
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {!isLoggedIn ? (
        <div className="flex flex-col items-center justify-center flex-grow">
          <h1 className="text-3xl font-semibold mb-6">WhatsApp Clone</h1>
          <input
            type="text"
            placeholder="Enter your username"
            className="border border-gray-300 rounded px-4 py-2 mb-4 w-64"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <button
            onClick={handleLogin}
            className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600 transition"
          >
            Login
          </button>
        </div>
      ) : (
        <div className="flex flex-grow overflow-hidden">
          <div className="w-64 bg-white border-r border-gray-300 flex flex-col">
            <h2 className="text-xl font-semibold p-4 border-b border-gray-300">Contacts</h2>
            <div className="flex-grow overflow-y-auto">
              {users.map((user) => (
                <div
                  key={user.username}
                  onClick={() => {
                    setSelectedUser(user.username);
                    setMessages([]);
                  }}
                  className={`cursor-pointer px-4 py-3 border-b border-gray-200 hover:bg-gray-100 ${
                    selectedUser === user.username ? 'bg-green-100' : ''
                  }`}
                >
                  <i className="fas fa-user-circle mr-2 text-gray-600"></i>
                  {user.username}
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col flex-grow">
            {selectedUser ? (
              <>
                <div className="p-4 border-b border-gray-300 font-semibold">{selectedUser}</div>
                <div className="flex-grow overflow-y-auto p-4 space-y-2 bg-gray-50">
                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`max-w-xs rounded px-3 py-2 ${
                        msg.sender === username ? 'bg-green-400 text-white self-end' : 'bg-white text-gray-800'
                      }`}
                    >
                      {msg.content}
                      <div className="text-xs text-gray-600 mt-1">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
                <div className="p-4 border-t border-gray-300 flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="Type a message"
                    className="flex-grow border border-gray-300 rounded px-3 py-2"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSendMessage();
                    }}
                  />
                  <button
                    onClick={handleSendMessage}
                    className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition"
                  >
                    Send
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-grow flex items-center justify-center text-gray-500">
                Select a contact to start chatting
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
