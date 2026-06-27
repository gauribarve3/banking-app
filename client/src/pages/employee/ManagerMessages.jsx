import { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { formatDateTime } from '../../utils/format';
import './ManagerMessages.css';

export default function ManagerMessages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState({});
  const [replyingId, setReplyingId] = useState('');
  const [error, setError] = useState('');

  const fetchMessages = async () => {
    try {
      const res = await apiClient.get('/employee/messages');
      setMessages(res.data.messages || []);
    } catch (err) {
      console.error('Fetch messages error:', err);
      setError('Failed to load customer messages.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const handleReplyChange = (msgId, text) => {
    setReplyText(prev => ({
      ...prev,
      [msgId]: text
    }));
  };

  const handleSendReply = async (msgId) => {
    const text = replyText[msgId];
    if (!text || !text.trim()) {
      alert('Please enter a response.');
      return;
    }

    setReplyingId(msgId);
    try {
      await apiClient.patch(`/employee/messages/${msgId}/reply`, { replyText: text.trim() });
      setReplyText(prev => ({ ...prev, [msgId]: '' }));
      await fetchMessages(); // Refresh messages list
    } catch (err) {
      console.error('Reply error:', err);
      alert(err.response?.data?.message || 'Failed to submit reply.');
    } finally {
      setReplyingId('');
    }
  };

  if (loading) {
    return (
      <div className="page-loading">
        <div className="loading-screen__spinner" />
      </div>
    );
  }

  return (
    <div className="manager-messages-page">
      <div className="page-header">
        <h1 className="page-title">Customer Messages</h1>
        <p className="page-subtitle">Read and reply to persistent messages from your assigned branch customers</p>
      </div>

      {error && <div className="messages-error">{error}</div>}

      <div className="messages-container">
        {messages.length === 0 ? (
          <Card>
            <div className="messages-empty">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <path d="M4 12v20c0 2.2 1.8 4 4 4h32c2.2 0 4-1.8 4-4V12c0-2.2-1.8-4-4-4H8c-2.2 0-4 1.8-4 4z" stroke="var(--color-accent)" strokeWidth="2"/>
                <path d="M4 12l20 12 20-12" stroke="var(--color-accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <h3>No Messages</h3>
              <p>Customers have not sent any inquiries to your branch inbox yet.</p>
            </div>
          </Card>
        ) : (
          <div className="messages-list">
            {messages.map((msg) => (
              <Card key={msg._id} className="message-card">
                <div className="message-card__header">
                  <div className="message-card__sender">
                    <div className="sender-avatar">
                      {msg.senderUserId?.firstName?.[0] || 'C'}{msg.senderUserId?.lastName?.[0] || 'U'}
                    </div>
                    <div>
                      <span className="sender-name">
                        {msg.senderUserId ? `${msg.senderUserId.firstName} ${msg.senderUserId.lastName}` : 'Unknown Customer'}
                      </span>
                      <span className="sender-email">{msg.senderUserId?.email || 'No email registered'}</span>
                    </div>
                  </div>
                  <div className="message-card__meta">
                    <span className="message-date">{formatDateTime(msg.createdAt)}</span>
                    <Badge variant={msg.isReplied ? 'success' : 'warning'}>
                      {msg.isReplied ? 'Replied' : 'Pending Reply'}
                    </Badge>
                  </div>
                </div>

                <div className="message-card__body">
                  <p className="message-text-quote">{msg.messageText}</p>
                </div>

                {msg.isReplied ? (
                  <div className="message-card__reply">
                    <div className="reply-header">
                      <span>↳ Your Response:</span>
                    </div>
                    <p className="reply-text-content">{msg.replyText}</p>
                  </div>
                ) : (
                  <div className="message-card__reply-action">
                    <div className="form-group">
                      <textarea
                        className="reply-textarea"
                        placeholder="Write your professional response to this customer query..."
                        rows={3}
                        value={replyText[msg._id] || ''}
                        onChange={(e) => handleReplyChange(msg._id, e.target.value)}
                      />
                    </div>
                    <div className="reply-button-wrap">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleSendReply(msg._id)}
                        isLoading={replyingId === msg._id}
                        disabled={!(replyText[msg._id] || '').trim()}
                      >
                        Send Reply
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
