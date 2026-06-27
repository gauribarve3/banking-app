import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import apiClient from '../api/client';
import './ChatBubble.css';

export default function ChatBubble() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef(null);

  // Only display for customer role
  if (!user || user.role !== 'customer') {
    return null;
  }

  const fetchMessages = async () => {
    try {
      const res = await apiClient.get('/customer/messages');
      setMessages(res.data.messages || []);
      
      // Calculate unread (messages with replies that customer hasn't seen? Or just total count change)
      // For simplicity, we can clear unread when chat is opened
      if (!isOpen) {
        setUnreadCount(prev => prev + 1); // Simple visual notification on new load if closed
      }
    } catch (err) {
      console.error('Fetch chat messages error:', err);
    }
  };

  useEffect(() => {
    if (user && user.role === 'customer') {
      fetchMessages();
      // Poll every 10 seconds for real-time manager updates
      const interval = setInterval(fetchMessages, 10000);
      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      scrollToBottom();
    }
  }, [isOpen, messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || loading) return;

    setLoading(true);
    try {
      await apiClient.post('/customer/messages', { messageText: newMessage });
      setNewMessage('');
      await fetchMessages();
      scrollToBottom();
    } catch (err) {
      console.error('Send message error:', err);
      alert(err.response?.data?.message || 'Failed to send message.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`chat-bubble-container ${isOpen ? 'active' : ''}`}>
      {/* Floating Action Button */}
      <button 
        className="chat-fab" 
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Chat with Branch Manager"
      >
        {isOpen ? (
          <span className="close-icon">✕</span>
        ) : (
          <span className="chat-icon">💬</span>
        )}
        {unreadCount > 0 && !isOpen && (
          <span className="chat-badge">{unreadCount}</span>
        )}
      </button>

      {/* Expanded Chat Window */}
      {isOpen && (
        <div className="chat-drawer">
          <div className="chat-header">
            <div className="chat-header-avatar">🧑‍💼</div>
            <div className="chat-header-info">
              <h4>Relationship Manager</h4>
              <span className="online-indicator">Online</span>
            </div>
            <button className="chat-close-btn" onClick={() => setIsOpen(false)}>✕</button>
          </div>

          <div className="chat-body">
            {messages.length === 0 ? (
              <div className="chat-empty">
                <p>No message history. Type a message below to reach out to your Relationship Manager.</p>
              </div>
            ) : (
              <div className="chat-messages-list">
                {messages.map((msg) => {
                  const isManagerInitiated = msg.senderUserId._id !== user._id;
                  
                  return (
                    <div key={msg._id} className="message-wrapper">
                      {isManagerInitiated ? (
                        // Message initiated by manager
                        <div className="message-bubble manager">
                          <div className="sender-name">Manager</div>
                          <div className="message-text">{msg.messageText}</div>
                          <div className="message-time">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      ) : (
                        // Message initiated by customer
                        <>
                          <div className="message-bubble customer">
                            <div className="message-text">{msg.messageText}</div>
                            <div className="message-time">
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                          
                          {/* Render manager reply to this message */}
                          {msg.isReplied && msg.replyText && (
                            <div className="message-bubble manager reply">
                              <div className="sender-name">Manager Reply</div>
                              <div className="message-text">{msg.replyText}</div>
                              <div className="message-time">
                                {new Date(msg.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <form onSubmit={handleSendMessage} className="chat-footer">
            <input
              type="text"
              placeholder="Ask a question or request assistance..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={loading}
              required
            />
            <button type="submit" className="chat-send-button" disabled={loading || !newMessage.trim()}>
              {loading ? '...' : '▶'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
