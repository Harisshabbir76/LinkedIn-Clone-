'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Row,
  Col,
  Card,
  ListGroup,
  Badge,
  Button,
  Form,
  Alert,
  Spinner,
  InputGroup,
  FormControl
} from 'react-bootstrap';
import {
  MessageSquare,
  Send,
  Clock,
  CheckCircle,
  Check,
  ArrowLeft,
  Search,
  MoreVertical,
  Paperclip,
  Smile,
  Phone,
  Video,
  ChevronLeft
} from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';

interface MessageReply {
  _id: string;
  content: string;
  sentBy: {
    _id: string;
    name: string;
    email: string;
  };
  sentAt: string;
  emailSent: boolean;
  isRead: boolean;
}

interface ContactMessage {
  _id: string;
  subject: string;
  message: string;
  status: 'new' | 'in_progress' | 'resolved' | 'closed';
  submittedAt: string;
  replies: MessageReply[];
  isRead: boolean;
  assignedTo?: any;
  name?: string;
  companyId?: string;
  companyName?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function MessagesPage() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();

  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isMobileView, setIsMobileView] = useState(false);
  const [showChatList, setShowChatList] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const selectedMessageRef = useRef<ContactMessage | null>(null);

  // Check authentication
  useEffect(() => {
    if (!isAuthenticated && !loading) {
      router.push('/login');
      return;
    }
  }, [isAuthenticated, loading, router]);

  // Responsive check
  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto scroll to bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [selectedMessage?.replies]);

  // Focus input when conversation opens
  useEffect(() => {
    if (selectedMessage && inputRef.current && canReply(selectedMessage)) {
      inputRef.current.focus();
    }
    selectedMessageRef.current = selectedMessage;
  }, [selectedMessage]);

  // Mark message as read when selected
  useEffect(() => {
    if (selectedMessage && !selectedMessage.isRead) {
      markMessageAsRead(selectedMessage._id);
    }
  }, [selectedMessage]);

  // Fetch messages
  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/contact-us/user/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Sort messages by most recent activity (newest first)
        const sortedMessages = (data.messages || []).sort((a: ContactMessage, b: ContactMessage) => {
          const dateA = new Date(getLastActivityTime(a) as string).getTime();
          const dateB = new Date(getLastActivityTime(b) as string).getTime();
          return dateB - dateA; // Descending order (newest first)
        });
        
        setMessages(sortedMessages);
        setFilteredMessages(sortedMessages);
        
        // Update selected message with fresh data only if it's still the same message
        if (selectedMessageRef.current) {
          const updated = sortedMessages.find((m: ContactMessage) => m._id === selectedMessageRef.current?._id);
          if (updated) {
            setSelectedMessage(updated);
            selectedMessageRef.current = updated;
          }
        }
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  // Mark message as read
  const markMessageAsRead = async (messageId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/contact-us/user/${messageId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Update local state
        setMessages(prev => 
          prev.map(msg => 
            msg._id === messageId ? { ...msg, isRead: true } : msg
          )
        );
        
        // Update selected message if it's the current one
        if (selectedMessageRef.current?._id === messageId) {
          setSelectedMessage(prev => prev ? { ...prev, isRead: true } : null);
        }
        
        // Update counts
        try { 
          window.dispatchEvent(new Event('countsUpdate')); 
        } catch (e) {}
      }
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  // Initial load
  useEffect(() => {
    if (isAuthenticated) {
      fetchMessages();
    }
  }, [isAuthenticated]);

  // Filter messages
  useEffect(() => {
    let filtered = [...messages];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(msg =>
        msg.subject.toLowerCase().includes(term) ||
        msg.message.toLowerCase().includes(term)
      );
    }
    // Maintain sort order when filtering
    filtered.sort((a, b) => {
      const dateA = new Date(getLastActivityTime(a) as string).getTime();
      const dateB = new Date(getLastActivityTime(b) as string).getTime();
      return dateB - dateA;
    });
    setFilteredMessages(filtered);
  }, [messages, searchTerm]);

  // Socket connection and event handling
  useEffect(() => {
    if (!isAuthenticated) return;

    try {
      const token = localStorage.getItem('token');
      const socketClient = io(API_BASE_URL, {
        auth: { token },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });

      socketClient.on('connect', () => {
        if (user?.email) {
          socketClient.emit('join', `user:${user.email}`);
        }
      });

      // Socket event handler for new replies
      const handleMessageReplied = (payload: any) => {
        try {
          const messageId = payload?.messageId?.toString();
          const currentSelectedId = selectedMessageRef.current?._id?.toString();

          // Only update UI if this reply is for the currently selected message
          if (currentSelectedId && messageId === currentSelectedId) {
            const reply = payload.reply;
            
            // Update selected message with the new reply
            setSelectedMessage(prev => {
              if (!prev) return prev;
              const updatedReplies = Array.isArray(prev.replies) ? [...prev.replies, reply] : [reply];
              return { ...prev, replies: updatedReplies } as ContactMessage;
            });

            // Update messages list and maintain sort order
            setMessages(prev => {
              const updated = prev.map(m => 
                m._id === messageId 
                  ? { ...m, replies: Array.isArray(m.replies) ? [...m.replies, reply] : [reply] }
                  : m
              );
              // Re-sort to keep newest first
              return updated.sort((a, b) => {
                const dateA = new Date(getLastActivityTime(a) as string).getTime();
                const dateB = new Date(getLastActivityTime(b) as string).getTime();
                return dateB - dateA;
              });
            });

            // Scroll to bottom
            setTimeout(() => {
              if (chatContainerRef.current) {
                chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
              }
            }, 50);
          } else {
            // If it's for a different message, just refresh the list to show updated status
            fetchMessages();
          }
        } catch (e) {
          console.error('Error handling socket reply payload:', e);
          fetchMessages();
        }
      };

      socketClient.on('message:replied', handleMessageReplied);

      setSocket(socketClient);
      
      // Cleanup function
      return () => {
        socketClient.off('message:replied', handleMessageReplied);
        socketClient.disconnect();
      };
    } catch (e) {
      console.error('Socket connection failed:', e);
    }
  }, [user, isAuthenticated]);

  // Handle logout
  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // Handle reply submission
  const handleReply = async () => {
    if (!selectedMessage || !replyContent.trim()) return;

    // Ensure we have a valid message id before sending
    const messageId = (selectedMessage as any)._id || (selectedMessage as any).id;
    if (!messageId) {
      console.error('Attempted to send reply but selectedMessage._id is missing', selectedMessage);
      toast.error('Unable to send reply: no conversation selected');
      return;
    }

    try {
      setSubmittingReply(true);
      const token = localStorage.getItem('token');

      // Determine whether the logged-in user is the original sender (user) or the assigned owner (company)
      const assignedTo = (selectedMessage as any).assignedTo;
      const assignedToId = assignedTo ? ((assignedTo._id || assignedTo).toString ? (assignedTo._id || assignedTo).toString() : (assignedTo._id || assignedTo)) : null;
      const userId = user?._id ? user._id.toString() : null;

      const isAssignedOwner = assignedToId && userId && assignedToId === userId;

      const endpoint = isAssignedOwner
        ? `${API_BASE_URL}/api/contact-us/${messageId}/reply`
        : `${API_BASE_URL}/api/contact-us/user/${messageId}/reply`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: replyContent.trim() })
      });

      if (response.ok) {
        const data = await response.json();
        setReplyContent('');

        const messageData = data.messageData || (data.data && data.data.message) || data.data?.messageData || data.message;

        if (messageData) {
          // Update messages list and maintain sort order
          setMessages(prevMessages => {
            const updated = prevMessages.map(msg =>
              msg._id === selectedMessage._id
                ? messageData
                : msg
            );
            // Re-sort to keep newest first
            return updated.sort((a, b) => {
              const dateA = new Date(getLastActivityTime(a) as string).getTime();
              const dateB = new Date(getLastActivityTime(b) as string).getTime();
              return dateB - dateA;
            });
          });

          // Update selected message only if it's still the current one
          if (selectedMessageRef.current?._id === selectedMessage._id) {
            setSelectedMessage(messageData);
            selectedMessageRef.current = messageData;
          }
        }
        
        // Auto resize textarea
        if (inputRef.current) {
          inputRef.current.style.height = 'auto';
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to send reply');
      }
    } catch (error) {
      console.error('Error sending reply:', error);
      toast.error('Failed to send reply');
    } finally {
      setSubmittingReply(false);
    }
  };

  // Handle message click - INSTANT opening with cached data
  const handleMessageClick = (message: ContactMessage) => {
    // Clear any pending socket updates for the old message by updating the ref first
    setSelectedMessage(message);
    selectedMessageRef.current = message;
    
    if (isMobileView) {
      setShowChatList(false);
    }
    
    // Reset reply content when switching conversations
    setReplyContent('');
    
    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
    
    // Mark as read immediately
    if (!message.isRead) {
      markMessageAsRead(message._id);
    }
    
    // Fetch fresh data in background
    fetchMessageById(message._id, message).catch(console.error);
  };

  const handleBackToList = () => {
    setShowChatList(true);
    setSelectedMessage(null);
    selectedMessageRef.current = null;
  };

  // Fetch single message (background)
  const fetchMessageById = async (messageId: string, messageObj?: ContactMessage) => {
    try {
      const token = localStorage.getItem('token');

      // Determine correct endpoint
      let endpoint = `${API_BASE_URL}/api/contact-us/user/${messageId}`;

      try {
        const assignedTo = messageObj?.assignedTo || messages.find(m => m._id === messageId)?.assignedTo;
        const assignedToId = assignedTo ? (assignedTo as any)._id || (assignedTo as any) : null;
        const userId = user?._id ? user._id : null;
        if (assignedToId && userId && assignedToId.toString() === userId.toString()) {
          endpoint = `${API_BASE_URL}/api/contact-us/${messageId}`;
        }
      } catch (e) {
        // fallback to user endpoint
      }

      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        const returnedMessage = data.message || data.data || data.data?.message || data;
        
        // Only update if this is still the selected message
        if (selectedMessageRef.current?._id === messageId) {
          setSelectedMessage(returnedMessage);
          selectedMessageRef.current = returnedMessage;
        }
        
        // Update messages list and maintain sort order
        setMessages(prev => {
          const updated = prev.map(msg => 
            msg._id === messageId ? returnedMessage : msg
          );
          // Re-sort to keep newest first
          return updated.sort((a, b) => {
            const dateA = new Date(getLastActivityTime(a) as string).getTime();
            const dateB = new Date(getLastActivityTime(b) as string).getTime();
            return dateB - dateA;
          });
        });
        
        // Refresh the full list in background
        fetchMessages();
        
        try { 
          window.dispatchEvent(new Event('countsUpdate')); 
        } catch (e) {}
      }
    } catch (error) {
      console.error('Error fetching single message:', error);
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <span className="status-badge status-new">New</span>;
      case 'in_progress':
        return <span className="status-badge status-progress">In Progress</span>;
      case 'resolved':
        return <span className="status-badge status-resolved">Resolved</span>;
      case 'closed':
        return <span className="status-badge status-closed">Closed</span>;
      default:
        return null;
    }
  };

  const canReply = (message: ContactMessage) => {
    return message.status !== 'closed' && message.status !== 'resolved';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const getLastMessage = (msg: ContactMessage) => {
    if (msg.replies && msg.replies.length > 0) {
      const last = msg.replies[msg.replies.length - 1];
      return {
        content: last.content || msg.message || '',
        sentBy: last.sentBy
      };
    }
    return {
      content: msg.message || '',
      sentBy: null
    };
  };

  const getSenderName = (msg: ContactMessage) => {
    // For company messages (assigned), show as conversation with company
    if (msg.assignedTo) {
      // Show company name if available, else sender name
      return msg.name || 'Conversation';
    }
    // For support messages, show as conversation with "Support"
    return 'Support Team';
  };

  const getLastActivityTime = (msg: ContactMessage) => {
    if (msg.replies && msg.replies.length > 0) {
      return msg.replies[msg.replies.length - 1].sentAt;
    }
    return msg.submittedAt;
  };

  // Auto resize textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setReplyContent(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  // Handle enter key to send
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (replyContent.trim() && !submittingReply) {
        handleReply();
      }
    }
  };

  if (loading) {
    return (
      <>
        <div className="blue-white-loading">
          <div className="spinner">
            <div className="bounce1"></div>
            <div className="bounce2"></div>
            <div className="bounce3"></div>
          </div>
          <p className="mt-3 text-primary">Loading your messages...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />

      <div className="chat-application">
        {/* Desktop View */}
        {!isMobileView && (
          <Row className="g-0 h-100">
            {/* Chat List */}
            <Col md={4} className="chat-list-col">
              <div className="chat-list-header">
                <div className="d-flex align-items-center justify-content-between">
                  <h5 className="mb-0">Messages</h5>
                  <span className="unread-count-badge">
                    {messages.filter(m => !m.isRead).length} unread
                  </span>
                </div>
                <div className="search-container mt-3">
                  <Search size={18} className="search-icon" />
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Search conversations..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="chat-list-body">
                {filteredMessages.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">💬</div>
                    <h6>No conversations yet</h6>
                    <p>Your messages with support will appear here</p>
                    <Button variant="primary" size="sm" className="mt-3" href="/contact">
                      Start new conversation
                    </Button>
                  </div>
                ) : (
                  filteredMessages.map((message) => {
                    const lastMsg = getLastMessage(message);
                    const isSelected = selectedMessage?._id === message._id;
                    return (
                      <div
                        key={message._id}
                        className={`chat-item ${isSelected ? 'active' : ''}`}
                        onClick={() => handleMessageClick(message)}
                      >
                        <div className="chat-avatar">
                          {message.status === 'new' ? '🆕' : '👤'}
                        </div>
                        <div className="chat-info">
                          <div className="chat-header">
                            <span className="chat-name">{message.subject}</span>
                            <span className="chat-time">{formatDate(getLastActivityTime(message) as string)}</span>
                          </div>
                          <div className="chat-message">
                            <span className="message-preview">
                              {lastMsg.sentBy && lastMsg.sentBy._id !== user?._id
                                ? (message.assignedTo && message.companyName && (lastMsg.sentBy._id === (message.assignedTo._id || message.assignedTo))
                                    ? `${message.companyName}: `
                                    : `${lastMsg.sentBy.name || 'Support'}: `)
                                : 'You: '}
                              {lastMsg.content.substring(0, 50)}
                                {lastMsg.content.length > 50 ? '…' : ''}
                              </span>
                              {!message.isRead && message.replies && message.replies.length > 0 && (
                              <span className="unread-badge"></span>
                            )}
                          </div>
                          <div className="mt-1">
                            {!message.assignedTo && getStatusBadge(message.status)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Col>

            {/* Chat Area */}
            <Col md={8} className="chat-area-col">
              {!selectedMessage ? (
                <div className="welcome-screen">
                  <div className="welcome-icon">
                    <MessageSquare size={64} color="#0d6efd" />
                  </div>
                  <h4 className="text-primary">Your Messages</h4>
                  <p className="text-muted">Select a conversation to start chatting</p>
                  <Button variant="primary" href="/contact" className="mt-3">
                    New Message
                  </Button>
                </div>
              ) : (
                <>
                  <div className="chat-header">
                    <div className="d-flex align-items-center">
                      <div className="chat-header-avatar">
                        {selectedMessage.status === 'new' ? '🆕' : '👤'}
                      </div>
                      <div className="chat-header-info">
                        <h6 className="mb-0">{selectedMessage.subject}</h6>
                        <div className="d-flex align-items-center gap-2 mt-1">
                          {!selectedMessage.assignedTo && getStatusBadge(selectedMessage.status)}
                          <small className="text-muted">
                            {(selectedMessage.replies || []).length} messages
                          </small>
                        </div>
                      </div>
                    </div>
                    <div className="chat-header-actions">
                      <Button variant="link" className="text-primary">
                        <Phone size={18} />
                      </Button>
                      <Button variant="link" className="text-primary">
                        <Video size={18} />
                      </Button>
                      <Button variant="link" className="text-primary">
                        <MoreVertical size={18} />
                      </Button>
                    </div>
                  </div>

                  <div className="chat-messages" ref={chatContainerRef}>
                    {/* Original message */}
                    <div className="message-wrapper user-message">
                      <div className="message-bubble">
                        <div className="message-content">
                          <small className="sender-label text-primary">
                            {selectedMessage.name || 'You'}
                          </small>
                          <p className="mb-0">{selectedMessage.message}</p>
                          <div className="message-meta">
                            <span className="message-time">{formatDate(selectedMessage.submittedAt)}</span>
                            <Check size={14} className="message-status text-primary" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Replies */}
                    {(selectedMessage.replies || []).map((reply) => {
                      const isUser = reply.sentBy._id === user?._id;

                      // Prefer backend displayName if available, otherwise compute
                      let senderName: string;
                      if (reply.displayName) {
                        // Use backend-provided display name (most accurate)
                        senderName = reply.displayName;
                      } else if (isUser) {
                        // Fallback: current user's own reply
                        senderName = user?.name || 'You';
                      } else {
                        // Fallback: other user's reply
                        senderName = reply.sentBy?.name || 'Support';
                      }

                      return (
                        <div key={reply._id} className={`message-wrapper ${isUser ? 'user-message' : 'admin-message'}`}>
                          <div className="message-bubble">
                            <div className="message-content">
                              {!isUser && <small className="sender-label text-primary">{senderName}</small>}
                              {isUser && <small className="sender-label text-primary">{senderName}</small>}
                              <p className="mb-0">{reply.content}</p>
                              <div className="message-meta">
                                <span className="message-time">{formatDate(reply.sentAt)}</span>
                                {isUser && <Check size={14} className="message-status text-primary" />}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>

                  <div className="chat-input-area">
                    {canReply(selectedMessage) ? (
                      <>
                        <Button variant="link" className="emoji-btn">
                          <Smile size={24} color="#0d6efd" />
                        </Button>
                        <Button variant="link" className="attach-btn">
                          <Paperclip size={24} color="#0d6efd" />
                        </Button>
                        <div className="input-wrapper">
                          <textarea
                            ref={inputRef}
                            className="message-input"
                            placeholder="Type a message..."
                            value={replyContent}
                            onChange={handleTextareaChange}
                            onKeyDown={handleKeyDown}
                            rows={1}
                            disabled={submittingReply}
                          />
                        </div>
                        <Button 
                          variant="link" 
                          className="send-btn"
                          onClick={handleReply}
                          disabled={!replyContent.trim() || submittingReply}
                        >
                          <Send size={24} color={replyContent.trim() ? '#0d6efd' : '#adb5bd'} />
                        </Button>
                      </>
                    ) : (
                      <div className="closed-chat-message">
                        <span>
                          {selectedMessage.status === 'resolved' 
                            ? '✓ Your ticket has been resolved. You can\'t reply to closed tickets.' 
                            : 'This conversation is closed'}
                        </span>
                        <Button variant="primary" size="sm" href="/contact" className="ms-3">
                          Start new chat
                        </Button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </Col>
          </Row>
        )}

        {/* Mobile View */}
        {isMobileView && (
          <div className="h-100">
            {showChatList ? (
              <div className="mobile-chat-list">
                <div className="chat-list-header">
                  <div className="d-flex align-items-center justify-content-between">
                    <h5 className="mb-0">Messages</h5>
                    <span className="unread-count-badge">
                      {messages.filter(m => !m.isRead).length}
                    </span>
                  </div>
                  <div className="search-container mt-3">
                    <Search size={18} className="search-icon" />
                    <input
                      type="text"
                      className="search-input"
                      placeholder="Search"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <div className="chat-list-body">
                  {filteredMessages.map((message) => (
                    <div
                      key={message._id}
                      className="chat-item"
                      onClick={() => handleMessageClick(message)}
                    >
                      <div className="chat-avatar">
                        {message.status === 'new' ? '🆕' : '👤'}
                      </div>
                      <div className="chat-info">
                        <div className="chat-header">
                          <span className="chat-name">{message.subject}</span>
                          <span className="chat-time">{formatDate(getLastActivityTime(message) as string)}</span>
                        </div>
                        <div className="chat-message">
                          <span className="message-preview">
                            {getLastMessage(message).content && (
                              <>
                                {getLastMessage(message).sentBy && getLastMessage(message).sentBy._id !== user?._id
                                  ? (message.assignedTo && message.companyName && (getLastMessage(message).sentBy._id === (message.assignedTo._id || message.assignedTo))
                                      ? `${message.companyName}: `
                                      : `${getLastMessage(message).sentBy.name || 'Support'}: `)
                                  : 'You: '}
                                {getLastMessage(message).content.substring(0, 40)}
                              </>
                            )}
                          </span>
                          {!message.isRead && <span className="unread-badge"></span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mobile-chat-area">
                <div className="chat-header">
                  <Button variant="link" className="text-primary back-btn" onClick={handleBackToList}>
                    <ChevronLeft size={20} />
                  </Button>
                  <div className="d-flex align-items-center flex-grow-1">
                    <div className="chat-header-avatar">
                      {selectedMessage?.status === 'new' ? '🆕' : '👤'}
                    </div>
                    <div className="chat-header-info">
                      <h6 className="mb-0">{selectedMessage?.subject}</h6>
                      <small>{selectedMessage && !selectedMessage.assignedTo && getStatusBadge(selectedMessage.status)}</small>
                    </div>
                  </div>
                  <Button variant="link" className="text-primary">
                    <MoreVertical size={20} />
                  </Button>
                </div>

                <div className="chat-messages" ref={chatContainerRef}>
                  {selectedMessage && (
                    <>
                      <div className="message-wrapper user-message">
                        <div className="message-bubble">
                          <div className="message-content">
                            <small className="sender-label text-primary">
                              {selectedMessage.name || 'You'}
                            </small>
                            <p className="mb-0">{selectedMessage.message}</p>
                            <div className="message-meta">
                              <span className="message-time">{formatDate(selectedMessage.submittedAt)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      {(selectedMessage.replies || []).map((reply) => {
                        const isUser = reply.sentBy._id === user?._id;

                        // Prefer backend displayName if available, otherwise compute
                        let senderName: string;
                        if (reply.displayName) {
                          // Use backend-provided display name (most accurate)
                          senderName = reply.displayName;
                        } else if (isUser) {
                          // Fallback: current user's own reply
                          senderName = user?.name || 'You';
                        } else {
                          // Fallback: other user's reply
                          senderName = reply.sentBy?.name || 'Support';
                        }

                        return (
                          <div key={reply._id} className={`message-wrapper ${isUser ? 'user-message' : 'admin-message'}`}>
                            <div className="message-bubble">
                              <div className="message-content">
                                <small className="sender-label text-primary">{senderName}</small>
                                <p className="mb-0">{reply.content}</p>
                                <div className="message-meta">
                                  <span className="message-time">{formatDate(reply.sentAt)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {selectedMessage && canReply(selectedMessage) && (
                  <div className="chat-input-area">
                    <div className="input-wrapper">
                      <textarea
                        ref={inputRef}
                        className="message-input"
                        placeholder="Type a message"
                        value={replyContent}
                        onChange={handleTextareaChange}
                        onKeyDown={handleKeyDown}
                        rows={1}
                      />
                    </div>
                    <Button 
                      variant="link" 
                      className="send-btn"
                      onClick={handleReply}
                      disabled={!replyContent.trim() || submittingReply}
                    >
                      <Send size={24} color={replyContent.trim() ? '#0d6efd' : '#adb5bd'} />
                    </Button>
                  </div>
                )}
                {selectedMessage && !canReply(selectedMessage) && (
                  <div className="closed-chat-message" style={{ margin: '16px', marginTop: 'auto' }}>
                    <span style={{ flex: 1 }}>
                      {selectedMessage.status === 'resolved' 
                        ? '✓ Your ticket has been resolved. You can\'t reply to closed tickets.' 
                        : 'This conversation is closed'}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx global>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          background-color: #f8f9fa !important;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
        }

        /* Navbar Styles */
        .navbar-fixed {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1030;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .navbar.bg-primary {
          background-color: #0d6efd !important;
        }

        .navbar-dark .navbar-nav .nav-link {
          color: rgba(255,255,255,0.9) !important;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          transition: all 0.2s ease;
        }

        .navbar-dark .navbar-nav .nav-link:hover {
          background-color: rgba(255,255,255,0.1);
          color: white !important;
        }

        .navbar-dark .navbar-nav .nav-link.active {
          background-color: rgba(255,255,255,0.2);
          color: white !important;
          font-weight: 600;
        }

        /* Main Container */
        .chat-application {
          margin-top: 56px;
          height: calc(100vh - 56px);
          width: 100%;
          background-color: #fff;
          position: relative;
        }

        /* Loading Animation */
        .blue-white-loading {
          height: calc(100vh - 56px);
          margin-top: 56px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background-color: #fff;
        }

        .spinner {
          width: 70px;
          text-align: center;
        }

        .spinner > div {
          width: 18px;
          height: 18px;
          background-color: #0d6efd;
          border-radius: 100%;
          display: inline-block;
          animation: sk-bouncedelay 1.4s infinite ease-in-out both;
          margin: 0 2px;
        }

        .spinner .bounce1 { animation-delay: -0.32s; }
        .spinner .bounce2 { animation-delay: -0.16s; }

        @keyframes sk-bouncedelay {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1.0); }
        }

        /* Chat List Styles */
        .chat-list-col {
          background-color: #fff;
          border-right: 1px solid #e9ecef;
          height: calc(100vh - 56px);
        }

        .chat-list-header {
          background-color: #fff;
          color: #212529;
          padding: 20px 20px 15px;
          border-bottom: 1px solid #e9ecef;
        }

        .chat-list-header h5 {
          color: #0d6efd;
          font-weight: 600;
        }

        .unread-count-badge {
          background-color: #0d6efd;
          color: white;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
        }

        .search-container {
          position: relative;
        }

        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #6c757d;
          z-index: 10;
        }

        .search-input {
          width: 100%;
          padding: 10px 15px 10px 45px;
          background-color: #f8f9fa;
          border: 1px solid #e9ecef;
          border-radius: 24px;
          color: #212529;
          font-size: 14px;
          transition: all 0.2s ease;
        }

        .search-input:focus {
          outline: none;
          border-color: #0d6efd;
          background-color: #fff;
          box-shadow: 0 0 0 3px rgba(13,110,253,0.1);
        }

        .chat-list-body {
          height: calc(100vh - 180px);
          overflow-y: auto;
          background-color: #fff;
        }

        .chat-item {
          display: flex;
          padding: 16px 20px;
          cursor: pointer;
          transition: background-color 0.15s ease;
          border-bottom: 1px solid #f8f9fa;
        }

        .chat-item:hover {
          background-color: #f8f9fa;
        }

        .chat-item.active {
          background-color: #e7f1ff;
          border-left: 3px solid #0d6efd;
        }

        .chat-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background-color: #e9ecef;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          margin-right: 15px;
          flex-shrink: 0;
        }

        .chat-info {
          flex: 1;
          min-width: 0;
        }

        .chat-header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 6px;
        }

        .chat-name {
          font-weight: 600;
          color: #212529;
          font-size: 15px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .chat-time {
          font-size: 11px;
          color: #6c757d;
          white-space: nowrap;
          margin-left: 6px;
        }

        .chat-message {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .message-preview {
          font-size: 13px;
          color: #6c757d;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 200px;
        }

        .unread-badge {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background-color: #0d6efd;
          margin-left: 6px;
          flex-shrink: 0;
        }

        /* Chat Area Styles */
        .chat-area-col {
          height: calc(100vh - 56px);
          display: flex;
          flex-direction: column;
          background-color: #fff;
          position: relative;
        }

        .welcome-screen {
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background-color: #fff;
          position: relative;
          z-index: 1;
        }

        .welcome-icon {
          font-size: 64px;
          margin-bottom: 20px;
          color: #0d6efd;
        }

        .chat-header {
          background-color: #fff;
          color: #212529;
          padding: 12px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: relative;
          z-index: 2;
          border-bottom: 1px solid #e9ecef;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }

        .chat-header-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background-color: #e9ecef;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          margin-right: 12px;
        }

        .chat-header-info h6 {
          color: #212529;
          font-size: 16px;
          font-weight: 600;
        }

        .chat-header-actions {
          display: flex;
          gap: 8px;
        }

        .chat-messages {
          flex: 1;
          padding: 20px 30px;
          overflow-y: auto;
          position: relative;
          z-index: 1;
          background-color: #fff;
        }

        .message-wrapper {
          display: flex;
          margin-bottom: 16px;
        }

        .user-message {
          justify-content: flex-end;
        }

        .admin-message {
          justify-content: flex-start;
        }

        .message-bubble {
          max-width: 65%;
          position: relative;
        }

        .user-message .message-bubble .message-content {
          background-color: #e6f4ff;
          border-radius: 18px 18px 4px 18px;
          padding: 12px 16px;
          position: relative;
          box-shadow: 0 1px 2px rgba(0,0,0,0.04);
        }

        .admin-message .message-bubble .message-content {
          background-color: #ffffff;
          border-radius: 18px 18px 18px 4px;
          padding: 12px 16px;
          position: relative;
          box-shadow: 0 1px 2px rgba(0,0,0,0.03);
        }

        .sender-label {
          display: block;
          font-size: 13px;
          color: #0d6efd;
          font-weight: 700;
          margin-bottom: 6px;
        }

        .message-content p {
          font-size: 14px;
          line-height: 1.5;
          color: #212529;
          word-wrap: break-word;
        }

        .message-meta {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 4px;
          margin-top: 4px;
        }

        .message-time {
          font-size: 12px;
          color: #6b7280;
        }

        .message-status {
          color: #0d6efd;
        }

        /* Chat Input Area */
        .chat-input-area {
          background-color: #fff;
          padding: 16px 20px;
          display: flex;
          align-items: flex-end;
          gap: 12px;
          position: relative;
          z-index: 2;
          border-top: 1px solid #e9ecef;
        }

        .emoji-btn, .attach-btn {
          padding: 8px !important;
          margin: 0 !important;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          color: #0d6efd !important;
        }

        .emoji-btn:hover, .attach-btn:hover {
          background-color: #e7f1ff;
        }

        .input-wrapper {
          flex: 1;
          background-color: #f8f9fa;
          border-radius: 24px;
          padding: 8px 16px;
          border: 1px solid #e9ecef;
          transition: all 0.2s ease;
        }

        .input-wrapper:focus-within {
          border-color: #0d6efd;
          background-color: #fff;
          box-shadow: 0 0 0 3px rgba(13,110,253,0.1);
        }

        .message-input {
          width: 100%;
          border: none;
          outline: none;
          resize: none;
          font-size: 14px;
          line-height: 1.5;
          max-height: 120px;
          background: transparent;
          font-family: inherit;
        }

        /* Modern input look to match admin conversation */
        .message-input.reply-input-modern {
          background: #fff;
          border: 1px solid #e5e7eb;
          padding: 8px 10px;
          border-radius: 10px;
        }

        .send-btn {
          padding: 8px !important;
          margin: 0 !important;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background-color: #e7f1ff;
          width: 40px;
          height: 40px;
        }

        .send-btn:hover {
          background-color: #d4e2ff;
        }

        .send-btn:disabled {
          opacity: 0.5;
          background-color: #f8f9fa;
        }

        .closed-chat-message {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 20px;
          background-color: #f8f9fa;
          border-radius: 24px;
          color: #6c757d;
          font-size: 14px;
        }

        /* Status Badges */
        .status-badge {
          display: inline-block;
          padding: 3px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 500;
        }

        .status-new {
          background-color: #dc3545;
          color: white;
        }

        .status-progress {
          background-color: #ffc107;
          color: #212529;
        }

        .status-resolved {
          background-color: #198754;
          color: white;
        }

        .status-closed {
          background-color: #6c757d;
          color: white;
        }

        /* Empty State */
        .empty-state {
          text-align: center;
          padding: 60px 20px;
        }

        .empty-icon {
          font-size: 48px;
          margin-bottom: 16px;
          opacity: 0.7;
        }

        .empty-state h6 {
          color: #212529;
          margin-bottom: 8px;
          font-weight: 600;
        }

        .empty-state p {
          color: #6c757d;
          font-size: 14px;
        }

        /* Mobile Styles */
        .mobile-chat-list {
          height: calc(100vh - 56px);
          background-color: #fff;
          overflow-y: auto;
        }

        .mobile-chat-area {
          height: calc(100vh - 56px);
          display: flex;
          flex-direction: column;
          background-color: #fff;
        }

        .back-btn {
          padding: 8px !important;
          margin-right: 8px !important;
        }

        /* Scrollbar Styles */
        ::-webkit-scrollbar {
          width: 6px;
        }

        ::-webkit-scrollbar-track {
          background: #f8f9fa;
        }

        ::-webkit-scrollbar-thumb {
          background: #ced4da;
          border-radius: 10px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: #adb5bd;
        }

        /* Responsive Adjustments */
        @media (max-width: 768px) {
          .chat-application {
            margin-top: 56px;
          }
          
          .chat-list-header {
            padding: 16px;
          }
          
          .chat-item {
            padding: 12px 16px;
          }
          
          .chat-messages {
            padding: 16px;
          }
        }
      `}</style>
    </>
  );
}