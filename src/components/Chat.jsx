import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import "../App.css";
import UserSelectionModal from './Common/UserSelectionModal';
import VerificationModal from './Common/VerificationModal';
import WelcomeMessage from './Common/WelcomeMessage';
import { BASE_ASSET_URL } from '../../utils/utils';

function Chat() {
  const socket = useRef(null);
  const typingTimeoutRef = useRef(null);
  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('');
  const [activeChat, setActiveChat] = useState(null);
  const [message, setMessage] = useState('');
  const [chats, setChats] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const [onlineUsers, setOnlineUsers] = useState({});

  const [showUserSelect, setShowUserSelect] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showVerification, setShowVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    if (!socket.current) {
      socket.current = io(BASE_ASSET_URL, { autoConnect: false });
    }

    const savedUser = sessionStorage.getItem('chatUser');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      setUserId(user.id);
      setUserName(user.name);
      setIsAuthenticated(true);
    } else {
      fetchUsers();
      setShowUserSelect(true);
    }

    return () => {
      if (socket.current) {
        socket.current.disconnect();
        socket.current = null;
      }
    };
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${BASE_ASSET_URL}/api/users`);
      setAvailableUsers(res.data);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !userId || !socket.current) return;

    if (!socket.current.connected) {
      socket.current.connect();
    }

    socket.current.emit('join', userId);

    const fetchChats = async () => {
      try {
        const res = await axios.get(`${BASE_ASSET_URL}/api/users`);
        const filteredUsers = res.data.filter(user => user._id !== userId);

        const chatPromises = filteredUsers.map(user =>
          axios.get(`${BASE_ASSET_URL}/api/messages/${userId}/${user._id}`)
            .then(msgRes => ({
              id: user._id,
              name: user.name,
              avatar: user.avatar || '👤',
              lastMessage: msgRes.data.length > 0 ? msgRes.data[msgRes.data.length - 1].content : '',
              time: msgRes.data.length > 0 ? new Date(msgRes.data[msgRes.data.length - 1].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
              messages: msgRes.data
            }))
            .catch(() => ({
              id: user._id,
              name: user.name,
              avatar: user.avatar || '👤',
              lastMessage: '',
              time: '',
              messages: []
            }))
        );

        const chatData = await Promise.all(chatPromises);
        setChats(chatData);
      } catch (err) {
        console.error("Failed to fetch chat data:", err);
      }
    };

    fetchChats();

    const handleReceive = (newMessage) => {
      setChats(prevChats => prevChats.map(chat => {
        if (chat.id === newMessage.senderId || chat.id === newMessage.receiverId) {
          return {
            ...chat,
            messages: [...chat.messages, newMessage],
            lastMessage: newMessage.content,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
        }
        return chat;
      }));

      if (activeChat && (activeChat.id === newMessage.senderId || activeChat.id === newMessage.receiverId)) {
        setActiveChat(prevChat => ({
          ...prevChat,
          messages: [...prevChat.messages, newMessage],
          lastMessage: newMessage.content,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }));
      }
    };

    const handleTyping = ({ senderId }) => {
      setTypingUsers(prev => ({ ...prev, [senderId]: true }));
    };

    const handleStoppedTyping = ({ senderId }) => {
      setTypingUsers(prev => {
        const updated = { ...prev };
        delete updated[senderId];
        return updated;
      });
    };

    const handleMessagesHistory = ({ chatId, messages }) => {
      setChats(prevChats => {
        const updatedChat = prevChats.find(c => c.id === chatId);
        if (!updatedChat) return prevChats;

        const updated = {
          ...updatedChat,
          messages,
          lastMessage: messages.length > 0 ? messages[messages.length - 1].content : '',
          time: messages.length > 0 ? new Date(messages[messages.length - 1].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
        };

        setActiveChat(updated);
        return prevChats.map(c => (c.id === chatId ? updated : c));
      });
    };

    const handleUserOnline = (userId) => {
      setOnlineUsers(prev => ({ ...prev, [userId]: true }));
    };

    const handleUserOffline = (userId) => {
      setOnlineUsers(prev => {
        const updated = { ...prev };
        delete updated[userId];
        return updated;
      });
    };

    const handleOnlineUsers = (onlineUsersList) => {
      const onlineUsersObj = {};
      onlineUsersList.forEach(id => {
        onlineUsersObj[id] = true;
      });
      setOnlineUsers(onlineUsersObj);
    };

    socket.current.on('receiveMessage', handleReceive);
    socket.current.on('userTyping', handleTyping);
    socket.current.on('userStoppedTyping', handleStoppedTyping);
    socket.current.on('messagesHistory', handleMessagesHistory);
    socket.current.on('userOnline', handleUserOnline);
    socket.current.on('userOffline', handleUserOffline);
    socket.current.on('onlineUsers', handleOnlineUsers);

    return () => {
      socket.current.off('receiveMessage', handleReceive);
      socket.current.off('userTyping', handleTyping);
      socket.current.off('userStoppedTyping', handleStoppedTyping);
      socket.current.off('messagesHistory', handleMessagesHistory);
      socket.current.off('userOnline', handleUserOnline);
      socket.current.off('userOffline', handleUserOffline);
      socket.current.off('onlineUsers', handleOnlineUsers);
    };
  }, [isAuthenticated, userId, activeChat]);

  const sendMessage = () => {
    if (!message.trim() || !activeChat) return;

    const payload = {
      senderId: userId,
      receiverId: activeChat.id,
      content: message,
      timestamp: new Date().toISOString()
    };

    socket.current.emit('sendMessage', payload);

    // Clear typing indicator after sending message
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    socket.current.emit('stopTyping', { senderId: userId, receiverId: activeChat.id });

    setChats(prevChats => prevChats.map(chat => {
      if (chat.id === activeChat.id) {
        return {
          ...chat,
          messages: [...chat.messages, payload],
          lastMessage: payload.content,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
      }
      return chat;
    }));

    setActiveChat(prevChat => ({
      ...prevChat,
      messages: [...prevChat.messages, payload],
      lastMessage: payload.content,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }));

    setMessage('');
  };

  const handleTypingInput = () => {
    if (!activeChat) return;
    
    socket.current.emit('typing', { senderId: userId, receiverId: activeChat.id });
    
    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout to stop typing indicator after 1 second of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      socket.current.emit('stopTyping', { senderId: userId, receiverId: activeChat.id });
      typingTimeoutRef.current = null;
    }, 1000);
  };

  const logout = () => {
    sessionStorage.removeItem('chatUser');
    setUserId('');
    setUserName('');
    setIsAuthenticated(false);
    setActiveChat(null);
    setChats([]);
    setShowUserSelect(true);

    if (socket.current) {
      socket.current.disconnect();
    }
  };

  const handleUserSelect = (user) => {
    setSelectedUser(user);
    setShowVerification(true);
  };

  const verifyUser = () => {
    if (verificationCode === "0000") {
      const userToSave = {
        id: selectedUser._id || selectedUser.id,
        name: selectedUser.name
      };
      sessionStorage.setItem('chatUser', JSON.stringify(userToSave));
      setUserId(userToSave.id);
      setUserName(userToSave.name);
      setIsAuthenticated(true);
      setShowUserSelect(false);
      setShowVerification(false);
      setShowWelcome(true);
      setTimeout(() => setShowWelcome(false), 3000);
    } else {
      alert("Invalid verification code.");
      setVerificationCode('');
    }
  };

  const selectChat = (chat) => {
    setActiveChat(chat);
    socket.current.emit('getMessages', { user1Id: userId, user2Id: chat.id });
  };

  return (
    <div className="chat-app">
      <UserSelectionModal
        visible={showUserSelect}
        users={availableUsers}
        onSelect={handleUserSelect}
      />
      <VerificationModal
        visible={showVerification}
        selectedUser={selectedUser}
        verificationCode={verificationCode}
        onCodeChange={(e) => setVerificationCode(e.target.value)}
        onBack={() => setShowVerification(false)}
        onVerify={verifyUser}
      />
      <WelcomeMessage visible={showWelcome} userName={userName} />

      {isAuthenticated && (
        <>
          <div className="sidebar">
            <div className="sidebar-header">
              <div className="menu-icon"><span></span><span></span><span></span></div>
              <div className="user-name">{userName}</div>
              <div className="status-icon">✓</div>
              <div className="logout-button" onClick={logout}>
                <span className="logout-icon">⇥</span>
              </div>
            </div>
            <div className="contacts-list">
              {chats.length > 0 ? chats.map(chat => (
                <div
                  key={chat.id}
                  className={`contact-item ${activeChat?.id === chat.id ? 'active' : ''}`}
                  onClick={() => selectChat(chat)}
                >
                  <div className="contact-avatar">{chat.avatar}</div>
                  <div className="contact-info">
                    <div className="contact-name">{chat.name}</div>
                    <div className="contact-last-message">{chat.lastMessage || 'No messages yet'}</div>
                  </div>
                  <div className="contact-time">
                    {onlineUsers[chat.id] ? 
                      <span className="status online">Online</span> : 
                      <span className="status offline">Offline</span>
                    }
                    <div>{chat.time}</div>
                  </div>
                </div>
              )) : (
                <div className="no-contacts">No other users available</div>
              )}
            </div>
          </div>

          <div className="chat-area">
            {activeChat ? (
              <>
                <div className="chat-header">
                  <div className="chat-recipient">
                    {activeChat.name}
                    {onlineUsers[activeChat.id] && <span className="status-indicator online-indicator"></span>}
                  </div>
                  <div className="chat-actions">
                    <span className="action-icon">🔍</span>
                    <span className="action-icon">📤</span>
                    <span className="action-icon">⋮</span>
                  </div>
                </div>

                <div className="messages-container">
                  {activeChat.messages.map((msg, idx) => (
                    <div key={idx} className="message-group">
                      <div className={`message ${msg.senderId === userId ? 'sent' : 'received'}`}>
                        {msg.senderId !== userId && <div className="message-avatar">{activeChat.avatar}</div>}
                        <div className="message-bubble">{msg.content}</div>
                      </div>
                    </div>
                  ))}
                  {typingUsers[activeChat.id] && (
                    <div className="message received">
                      <div className="message-avatar">{activeChat.avatar}</div>
                      <div className="message-bubble typing">typing...</div>
                    </div>
                  )}
                </div>

                <div className="message-input">
                  <div className="emoji-picker">😊</div>
                  <input
                    type="text"
                    value={message}
                    placeholder="Send a message"
                    onChange={(e) => {
                      setMessage(e.target.value);
                      handleTypingInput();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') sendMessage();
                    }}
                  />
                  <div className="attachment-icon" onClick={sendMessage}>📤</div>
                </div>
              </>
            ) : (
              <div className="no-chat-selected">Select a conversation to start chatting</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default Chat;