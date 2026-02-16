'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Row,
  Col,
  Card,
  Badge,
  Form,
  Button,
  Modal,
  Spinner,
  Dropdown,
  ButtonGroup,
  Tabs,
  Tab
} from 'react-bootstrap';
import {
  Mail,
  Search,
  RefreshCw,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle,
  Archive,
  X,
  Send,
  Reply,
  Tag,
  Calendar,
  User,
  Inbox,
  Filter,
  ChevronDown,
  MessageSquare,
  CheckCheck,
  PenSquare,
  Star,
  Bell,
  Paperclip,
  Smile,
  MoreVertical,
  Check,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast, Toaster } from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import axios from 'axios';

const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'http://localhost:5000/api'
  : 'http://localhost:5000/api';

const STANDARD_SUBJECTS = [
  'Account Help',
  'Technical Support',
  'Feedback & Suggestions',
  'Report a Bug',
  'Feature Request',
  'Privacy Concerns',
  'Partnership Inquiry',
  'Other'
];

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
  senderContext?: string;
  displayName?: string;
}

interface ContactMessage {
  _id: string;
  name: string;
  email: string;
  message: string;
  subject: string;
  category: string;
  status: 'new' | 'in_progress' | 'resolved' | 'closed';
  isRead: boolean;
  isReplied: boolean;
  adminNotes?: string;
  submittedAt: string;
  resolvedAt?: string;
  replies?: MessageReply[];
  userId?: string;
}

export default function AdminContactsPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [accessChecked, setAccessChecked] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [submittingReply, setSubmittingReply] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const [stats, setStats] = useState({
    total: 0,
    new: 0,
    in_progress: 0,
    resolved: 0,
    closed: 0,
    unread: 0
  });

  // Auto scroll to bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [selectedMessage?.replies]);

  useEffect(() => {
    const checkAccess = async () => {
      if (accessChecked) return;
      
      if (!authLoading) {
        if (!isAuthenticated) {
          toast.error('Please login to access admin panel');
          router.push('/login');
          return;
        }
        
        try {
          const token = localStorage.getItem('token');
          
          const response = await axios.get(`${API_BASE_URL}/contact-us/check-admin`, {
            headers: { Authorization: `Bearer ${token}` }
          });

          if (!response.data.isAdmin && !response.data.isStaff) {
            toast.error('Access denied. Admin or staff privileges required.');
            router.push('/');
            return;
          }

          setAccessChecked(true);
          await fetchMessages();
          
        } catch (error: any) {
          console.error('Admin check error:', error);
          toast.error('Failed to verify admin access');
          router.push('/');
        }
      }
    };

    checkAccess();
  }, [authLoading, isAuthenticated, router, accessChecked]);

  const fetchMessages = useCallback(async () => {
    try {
      setRefreshing(true);
      const token = localStorage.getItem('token');

      const response = await axios.get(`${API_BASE_URL}/contact-us/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const allMessages = response.data.data || [];
      
      const contactMessages = allMessages.filter((msg: ContactMessage) => 
        STANDARD_SUBJECTS.includes(msg.subject)
      );
      
      setMessages(contactMessages);
      setFilteredMessages(contactMessages);
      
      const newStats = {
        total: contactMessages.length,
        new: contactMessages.filter(m => m.status === 'new').length,
        in_progress: contactMessages.filter(m => m.status === 'in_progress').length,
        resolved: contactMessages.filter(m => m.status === 'resolved').length,
        closed: contactMessages.filter(m => m.status === 'closed').length,
        unread: contactMessages.filter(m => !m.isRead).length
      };
      setStats(newStats);

    } catch (error: any) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let filtered = [...messages];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(msg => 
        msg.name.toLowerCase().includes(term) ||
        msg.email.toLowerCase().includes(term) ||
        msg.message.toLowerCase().includes(term) ||
        msg.subject.toLowerCase().includes(term)
      );
    }
    
    if (selectedSubject !== 'all') {
      filtered = filtered.filter(msg => msg.subject === selectedSubject);
    }
    
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(msg => msg.status === selectedStatus);
    }
    
    if (showUnreadOnly) {
      filtered = filtered.filter(msg => !msg.isRead);
    }
    
    filtered.sort((a, b) => 
      new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );
    
    setFilteredMessages(filtered);
  }, [messages, searchTerm, selectedSubject, selectedStatus, showUnreadOnly]);

  const handleReply = async () => {
    if (!selectedMessage || !replyContent.trim()) return;

    setSubmittingReply(true);
    try {
      const token = localStorage.getItem('token');
      
      await axios.post(`${API_BASE_URL}/contact-us/${selectedMessage._id}/reply`,
        { content: replyContent },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Refresh message conversation
      try {
        const res = await axios.get(`${API_BASE_URL}/contact-us/${selectedMessage._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = res.data.data || res.data.message || res.data;
        setSelectedMessage(data);
      } catch (e) {
        console.warn('Failed to refresh message after reply', e);
      }

      toast.success('Reply sent successfully');
      setReplyContent('');
      fetchMessages();
      
    } catch (error: any) {
      console.error('Reply error:', error);
      toast.error(error.response?.data?.error || 'Failed to send reply');
    } finally {
      setSubmittingReply(false);
    }
  };

  const saveAdminNote = async () => {
    if (!selectedMessage || !adminNote.trim()) return;
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE_URL}/contact-us/${selectedMessage._id}/note`,
        { note: adminNote },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // refresh single message
      try {
        const res = await axios.get(`${API_BASE_URL}/contact-us/${selectedMessage._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = res.data.data || res.data.message || res.data;
        setSelectedMessage(data);
      } catch (e) { console.warn('Failed to refresh after saving note', e); }

      toast.success('Note saved');
      setAdminNote('');
      fetchMessages();
    } catch (e: any) {
      console.error('Save note error', e);
      toast.error(e.response?.data?.error || 'Failed to save note');
    }
  };

  const updateStatus = async (messageId: string, status: string) => {
    try {
      setUpdatingStatus(messageId);
      
      const token = localStorage.getItem('token');
      
      console.log(`Updating message ${messageId} to status: ${status}`);
      
      const response = await axios.patch(`${API_BASE_URL}/contact-us/${messageId}/status`,
        { status },
        { 
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000
        }
      );

      console.log('Status update response:', response.data);

      toast.success(`Status updated to ${status.replace('_', ' ')}`);
      
      await fetchMessages();

      // Update selected message if it's the one being updated
      if (selectedMessage && selectedMessage._id === messageId) {
        setSelectedMessage(prev => prev ? { ...prev, status: status as any } : null);
      }

    } catch (error: any) {
      console.error('Status update error:', error);
      
      if (error.response) {
        toast.error(error.response.data?.error || `Server error: ${error.response.status}`);
      } else if (error.request) {
        toast.error('No response from server. Please check your connection.');
      } else {
        toast.error('Error: ' + error.message);
      }
    } finally {
      setUpdatingStatus(null);
    }
  };

  const toggleRead = async (messageId: string, isRead: boolean) => {
    try {
      const token = localStorage.getItem('token');
      
      await axios.patch(`${API_BASE_URL}/contact-us/${messageId}/read`,
        { isRead: !isRead },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      fetchMessages();

    } catch (error: any) {
      console.error('Toggle read error:', error);
      toast.error(error.response?.data?.error || 'Failed to update');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusConfig = (status: string) => {
    const configs = {
      new: { 
        bg: '#fee2e2', 
        text: '#991b1b', 
        icon: AlertCircle,
        label: 'New',
        gradient: 'linear-gradient(135deg, #fee2e2 0%, #ffcdd2 100%)'
      },
      in_progress: { 
        bg: '#fef3c7', 
        text: '#92400e', 
        icon: Clock,
        label: 'In Progress',
        gradient: 'linear-gradient(135deg, #fef3c7 0%, #ffe2a5 100%)'
      },
      resolved: { 
        bg: '#dcfce7', 
        text: '#166534', 
        icon: CheckCircle,
        label: 'Resolved',
        gradient: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)'
      },
      closed: { 
        bg: '#f3f4f6', 
        text: '#4b5563', 
        icon: Archive,
        label: 'Closed',
        gradient: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)'
      }
    };
    return configs[status as keyof typeof configs] || configs.new;
  };

  const getStatusBadge = (status: string) => {
    const config = getStatusConfig(status);
    const Icon = config.icon;
    
    return (
      <span className="status-badge" style={{ background: config.bg, color: config.text }}>
        <Icon size={12} />
        <span>{config.label}</span>
      </span>
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (replyContent.trim()) {
        handleReply();
      }
    }
  };

  if (authLoading || !accessChecked) {
    return (
      <div className="loading-container">
        <div className="spinner-wrapper">
          <div className="spinner"></div>
          <p className="loading-text">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-right" toastOptions={{
        style: {
          background: '#1f2937',
          color: '#fff',
          borderRadius: '12px',
          padding: '12px 16px',
          fontSize: '14px',
          fontWeight: '500',
        },
        success: {
          iconTheme: {
            primary: '#10b981',
            secondary: '#fff',
          },
        },
        error: {
          iconTheme: {
            primary: '#ef4444',
            secondary: '#fff',
          },
        },
      }} />
      
      <div className="admin-page">
        {/* Header with Glass Effect */}
        <div className="header-glass">
          <div className="header-content">
            <div className="header-left">
              <div className="header-icon">
                <MessageSquare size={24} />
              </div>
              <div>
                <h1 className="gradient-text">Contact Messages</h1>
                <div className="header-meta">
                  <span className="meta-item">
                    <User size={14} />
                    {user?.email}
                  </span>
                  <span className="meta-item">
                    <Mail size={14} />
                    {stats.total} total
                  </span>
                  {stats.unread > 0 && (
                    <span className="meta-badge">
                      <Bell size={14} />
                      {stats.unread} unread
                    </span>
                  )}
                </div>
              </div>
            </div>
            <Button 
              onClick={fetchMessages}
              disabled={refreshing}
              className="refresh-btn-glass"
            >
              <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
              <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </Button>
          </div>
        </div>

        {/* Stats Cards with Gradients */}
        <div className="stats-grid">
          {[
            { 
              label: 'Total', 
              value: stats.total, 
              icon: Mail, 
              gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              shadow: '0 10px 20px -5px rgba(59,130,246,0.3)'
            },
            { 
              label: 'New', 
              value: stats.new, 
              icon: AlertCircle, 
              gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              shadow: '0 10px 20px -5px rgba(239,68,68,0.3)'
            },
            { 
              label: 'In Progress', 
              value: stats.in_progress, 
              icon: Clock, 
              gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              shadow: '0 10px 20px -5px rgba(245,158,11,0.3)'
            },
            { 
              label: 'Resolved', 
              value: stats.resolved, 
              icon: CheckCircle, 
              gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              shadow: '0 10px 20px -5px rgba(16,185,129,0.3)'
            },
            { 
              label: 'Closed', 
              value: stats.closed, 
              icon: Archive, 
              gradient: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
              shadow: '0 10px 20px -5px rgba(107,114,128,0.3)'
            },
            { 
              label: 'Unread', 
              value: stats.unread, 
              icon: Mail, 
              gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              shadow: '0 10px 20px -5px rgba(139,92,246,0.3)'
            }
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="stat-card-glass"
              style={{ boxShadow: stat.shadow }}
            >
              <div className="stat-icon-wrapper" style={{ background: stat.gradient }}>
                <stat.icon size={20} color="white" />
              </div>
              <div className="stat-info">
                <span className="stat-value">{stat.value}</span>
                <span className="stat-label">{stat.label}</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Advanced Filters */}
        <div className="filters-glass">
          <div className="filters-header">
            <Filter size={16} />
            <span>Filter Messages</span>
          </div>
          <div className="filters-body">
            <div className="search-wrapper-glass">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Search by name, email, or message..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button className="clear-search" onClick={() => setSearchTerm('')}>
                  <X size={14} />
                </button>
              )}
            </div>

            <select 
              className="filter-select-glass"
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
            >
              <option value="all">📋 All Subjects</option>
              {STANDARD_SUBJECTS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <select
              className="filter-select-glass"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="all">📊 All Status</option>
              <option value="new">🆕 New</option>
              <option value="in_progress">⏳ In Progress</option>
              <option value="resolved">✅ Resolved</option>
              <option value="closed">📦 Closed</option>
            </select>

            <label className="unread-toggle-glass">
              <input
                type="checkbox"
                checked={showUnreadOnly}
                onChange={(e) => setShowUnreadOnly(e.target.checked)}
              />
              <span className="toggle-track">
                <span className="toggle-indicator"></span>
              </span>
              <span className="toggle-label">Unread only</span>
            </label>
          </div>
        </div>

        {/* Messages Grid */}
        <div className="messages-grid">
          {loading ? (
            <div className="loading-state">
              <Spinner animation="border" variant="primary" />
              <p>Loading messages...</p>
            </div>
          ) : filteredMessages.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="empty-state-glass"
            >
              <div className="empty-icon">
                <Inbox size={48} />
              </div>
              <h3>No messages found</h3>
              <p>
                {searchTerm 
                  ? 'Try adjusting your search terms' 
                  : 'No contact messages have been submitted yet'}
              </p>
              {searchTerm && (
                <Button 
                  variant="outline-primary"
                  onClick={() => setSearchTerm('')}
                  className="clear-btn"
                >
                  Clear Search
                </Button>
              )}
            </motion.div>
          ) : (
            <AnimatePresence>
              {filteredMessages.map((message, index) => {
                const statusConfig = getStatusConfig(message.status);
                const StatusIcon = statusConfig.icon;
                
                return (
                  <motion.div
                    key={message._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: index * 0.03 }}
                    className={`message-card ${!message.isRead ? 'unread' : ''}`}
                  >
                    <div className="message-card-header">
                      <div className="sender-info">
                        <div className="sender-avatar">
                          {message.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="sender-details">
                          <div className="sender-name">
                            {message.name}
                            {!message.isRead && <span className="unread-badge">New</span>}
                          </div>
                          <div className="sender-email">{message.email}</div>
                        </div>
                      </div>
                      <div className="message-meta">
                        <div className="status-indicator" style={{ background: statusConfig.bg }}>
                          <StatusIcon size={12} style={{ color: statusConfig.text }} />
                          <span style={{ color: statusConfig.text }}>{statusConfig.label}</span>
                        </div>
                        <span className="message-time">
                          <Calendar size={12} />
                          {formatDate(message.submittedAt)}
                        </span>
                      </div>
                    </div>

                    <div className="message-card-body">
                      <div className="subject-tags">
                        <span className="subject-tag">
                          <Tag size={12} />
                          {message.subject}
                        </span>
                        <Badge bg="light" text="dark" className="category-tag">
                          {message.category}
                        </Badge>
                      </div>
                      <p className="message-excerpt">{message.message}</p>
                    </div>

                    <div className="message-card-footer">
                      <button
                        className="action-btn view-btn-full"
                        onClick={async () => {
                          try {
                            const token = localStorage.getItem('token');
                            const res = await axios.get(`${API_BASE_URL}/contact-us/${message._id}`, {
                              headers: { Authorization: `Bearer ${token}` }
                            });
                            const data = res.data.data || res.data.message || res.data;
                            setSelectedMessage(data);
                            setShowMessageModal(true);
                            if (!message.isRead) toggleRead(message._id, message.isRead);
                          } catch (err) {
                            console.error('Failed to fetch message details', err);
                            toast.error('Failed to load message details');
                          }
                        }}
                      >
                        <Eye size={14} />
                        <span>View Details</span>
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Modern Modal with WhatsApp-style Conversation */}
      <Modal
        show={showMessageModal}
        onHide={() => setShowMessageModal(false)}
        size="lg"
        centered
        className="modern-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <div className="modal-title-icon">
              <Mail size={18} />
            </div>
            <span>Message Details</span>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedMessage && (
            <div className="modal-content-modern">
              <Tabs defaultActiveKey="conversation" id="message-detail-tabs" className="mb-3">
                <Tab eventKey="info" title="Info">
                  {/* Header Section */}
                  <div className="modal-section highlight">
                    <div className="modal-header-row">
                      <h4 className="modal-subject">{selectedMessage.subject}</h4>
                      <div className="modal-badge-group">
                        {getStatusBadge(selectedMessage.status)}
                        <Badge className="category-badge-modern">
                          <Tag size={12} />
                          {selectedMessage.category}
                        </Badge>
                      </div>
                    </div>
                    <div className="modal-time-row">
                      <Calendar size={14} />
                      <span>Received {formatDate(selectedMessage.submittedAt)}</span>
                    </div>
                  </div>

                  {/* Sender Info */}
                  <div className="modal-section">
                    <h6 className="section-title">
                      <User size={14} />
                      Sender Information
                    </h6>
                    <div className="sender-card">
                      <div className="sender-avatar-large">
                        {selectedMessage.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="sender-details-large">
                        <div className="sender-name-large">{selectedMessage.name}</div>
                        <div className="sender-email-large">{selectedMessage.email}</div>
                      </div>
                    </div>
                  </div>

                  {/* Message Content */}
                  <div className="modal-section">
                    <h6 className="section-title">
                      <MessageSquare size={14} />
                      Message
                    </h6>
                    <div className="message-content-box">
                      {selectedMessage.message}
                    </div>
                  </div>

                  {/* Admin Notes */}
                  {selectedMessage.adminNotes && (
                    <div className="modal-section">
                      <h6 className="section-title">
                        <PenSquare size={14} />
                        Admin Notes
                      </h6>
                      <div className="notes-box-modern">
                        {selectedMessage.adminNotes}
                      </div>
                    </div>
                  )}
                </Tab>

                <Tab eventKey="conversation" title="Conversation">
                  {/* WhatsApp-style Conversation View */}
                  <div className="whatsapp-conversation" ref={chatContainerRef}>
                    {/* Original Message - User */}
                    <div className="message-wrapper user-message">
                      <div className="message-bubble">
                        <div className="message-sender-info">
                          <span className="sender-name">{selectedMessage.name}</span>
                          <span className="message-time">{formatMessageTime(selectedMessage.submittedAt)}</span>
                        </div>
                        <div className="message-content">
                          {selectedMessage.message}
                        </div>
                        <div className="message-status">
                          <Check size={12} />
                          <span>Delivered</span>
                        </div>
                      </div>
                    </div>

                    {/* Replies */}
                    {(selectedMessage.replies || []).map((reply, idx) => {
                      const isUser = reply.sentBy?._id === selectedMessage.userId;
                      const isAdmin = !isUser;
                      
                      return (
                        <div 
                          key={reply._id || idx} 
                          className={`message-wrapper ${isAdmin ? 'admin-message' : 'user-message'}`}
                        >
                          <div className="message-bubble">
                            <div className="message-sender-info">
                              <span className="sender-name">
                                {isAdmin ? 'Support Team' : selectedMessage.name}
                              </span>
                              <span className="message-time">{formatMessageTime(reply.sentAt)}</span>
                            </div>
                            <div className="message-content">
                              {reply.content}
                            </div>
                            <div className="message-status">
                              {isAdmin ? (
                                <>
                                  <Check size={12} />
                                  <span>Delivered</span>
                                </>
                              ) : (
                                <>
                                  <CheckCheck size={12} className="read-icon" />
                                  <span>Read</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Reply Input Area - WhatsApp Style */}
                  {selectedMessage.status === 'resolved' || selectedMessage.status === 'closed' ? (
                    <div className="whatsapp-closed-message">
                      <AlertCircle size={18} />
                      <span>
                        {selectedMessage.status === 'resolved' 
                          ? 'This conversation has been resolved. No further replies can be added.'
                          : 'This conversation is closed. No further replies can be added.'}
                      </span>
                    </div>
                  ) : (
                    <div className="whatsapp-input-area">
                      <button className="input-action-btn" disabled={submittingReply}>
                        <Smile size={20} />
                      </button>
                      <button className="input-action-btn" disabled={submittingReply}>
                        <Paperclip size={20} />
                      </button>
                      <div className="input-wrapper">
                        <textarea
                          className="whatsapp-input"
                          placeholder="Type a message..."
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          onKeyDown={handleKeyDown}
                          rows={1}
                          disabled={submittingReply}
                        />
                      </div>
                      <button 
                        className={`send-btn-whatsapp ${replyContent.trim() ? 'active' : ''}`}
                        onClick={handleReply}
                        disabled={!replyContent.trim() || submittingReply}
                      >
                        <Send size={20} />
                      </button>
                    </div>
                  )}
                </Tab>
              </Tabs>

              {/* Add Note Section */}
              <div className="modal-section mt-3">
                <h6 className="section-title">
                  <PenSquare size={14} />
                  Add Internal Note
                </h6>
                <textarea
                  className="note-input-modern"
                  rows={2}
                  placeholder="Add a private note (only visible to admins)..."
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                />
                <div className="d-flex justify-content-end mt-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={saveAdminNote}
                    disabled={!adminNote.trim()}
                  >
                    Save Note
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <div className="modal-footer-actions">
            {selectedMessage && (
              <Dropdown className="me-auto">
                <Dropdown.Toggle 
                  variant="primary"
                  id="footer-status-dropdown"
                  className="status-footer-btn"
                  disabled={updatingStatus === selectedMessage._id}
                >
                  {updatingStatus === selectedMessage._id ? (
                    <>
                      <Spinner size="sm" animation="border" className="me-2" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <span>Status: {selectedMessage.status.replace('_', ' ')}</span>
                      <ChevronDown size={16} className="ms-2" />
                    </>
                  )}
                </Dropdown.Toggle>
                
                <Dropdown.Menu className="status-footer-menu">
                  <Dropdown.Item 
                    onClick={() => {
                      updateStatus(selectedMessage._id, 'new');
                    }}
                    active={selectedMessage.status === 'new'}
                    disabled={selectedMessage.status === 'new' || updatingStatus === selectedMessage._id}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <AlertCircle size={16} color="#ef4444" />
                      <span className="flex-grow-1">New</span>
                      {selectedMessage.status === 'new' && <Check size={14} className="text-success" />}
                    </div>
                  </Dropdown.Item>
                  <Dropdown.Item 
                    onClick={() => updateStatus(selectedMessage._id, 'in_progress')}
                    active={selectedMessage.status === 'in_progress'}
                    disabled={selectedMessage.status === 'in_progress' || updatingStatus === selectedMessage._id}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <Clock size={16} color="#f59e0b" />
                      <span className="flex-grow-1">In Progress</span>
                      {selectedMessage.status === 'in_progress' && <Check size={14} className="text-success" />}
                    </div>
                  </Dropdown.Item>
                  <Dropdown.Item 
                    onClick={() => updateStatus(selectedMessage._id, 'resolved')}
                    active={selectedMessage.status === 'resolved'}
                    disabled={selectedMessage.status === 'resolved' || updatingStatus === selectedMessage._id}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <CheckCircle size={16} color="#10b981" />
                      <span className="flex-grow-1">Resolved</span>
                      {selectedMessage.status === 'resolved' && <Check size={14} className="text-success" />}
                    </div>
                  </Dropdown.Item>
                  <Dropdown.Item 
                    onClick={() => updateStatus(selectedMessage._id, 'closed')}
                    active={selectedMessage.status === 'closed'}
                    disabled={selectedMessage.status === 'closed' || updatingStatus === selectedMessage._id}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <Archive size={16} color="#6b7280" />
                      <span className="flex-grow-1">Closed</span>
                      {selectedMessage.status === 'closed' && <Check size={14} className="text-success" />}
                    </div>
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            )}
            <Button 
              variant="outline-secondary"
              onClick={() => {
                setShowMessageModal(false);
                setReplyContent('');
                setAdminNote('');
              }}
              className="cancel-btn"
            >
              Close
            </Button>
          </div>
        </Modal.Footer>
      </Modal>

      <style jsx global>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          background: linear-gradient(135deg, #f6f9fc 0%, #f1f5f9 100%);
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          min-height: 100vh;
        }

        /* Loading Animation */
        .loading-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        .spinner-wrapper {
          text-align: center;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          padding: 40px;
          border-radius: 20px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }

        .spinner {
          width: 50px;
          height: 50px;
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-top: 3px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px;
        }

        .loading-text {
          color: white;
          font-size: 16px;
          font-weight: 500;
          letter-spacing: 0.5px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Admin Page */
        .admin-page {
          margin-top: 56px;
          padding: 32px 24px;
          max-width: 1400px;
          margin-left: auto;
          margin-right: auto;
        }

        /* Glass Header */
        .header-glass {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          padding: 24px 28px;
          margin-bottom: 32px;
          box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.5);
        }

        .header-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .header-icon {
          width: 50px;
          height: 50px;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 10px 20px -5px rgba(59,130,246,0.3);
        }

        .gradient-text {
          font-size: 28px;
          font-weight: 700;
          background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 4px;
        }

        .header-meta {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: #64748b;
        }

        .meta-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          background: #fee2e2;
          color: #991b1b;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
        }

        .refresh-btn-glass {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          color: #334155;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .refresh-btn-glass:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        /* Stats Grid */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 20px;
          margin-bottom: 32px;
        }

        .stat-card-glass {
          background: white;
          border-radius: 20px;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          transition: all 0.3s;
          border: 1px solid rgba(255, 255, 255, 0.5);
        }

        .stat-card-glass:hover {
          transform: translateY(-5px);
        }

        .stat-icon-wrapper {
          width: 56px;
          height: 56px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .stat-info {
          flex: 1;
        }

        .stat-value {
          display: block;
          font-size: 28px;
          font-weight: 700;
          color: #0f172a;
          line-height: 1.2;
        }

        .stat-label {
          font-size: 13px;
          color: #64748b;
          font-weight: 500;
        }

        /* Filters Section */
        .filters-glass {
          background: white;
          border-radius: 20px;
          padding: 20px;
          margin-bottom: 32px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.5);
        }

        .filters-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid #e2e8f0;
          color: #334155;
          font-size: 14px;
          font-weight: 600;
        }

        .filters-body {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }

        .search-wrapper-glass {
          flex: 2;
          min-width: 280px;
          position: relative;
        }

        .search-wrapper-glass .search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
        }

        .search-wrapper-glass input {
          width: 100%;
          padding: 12px 16px 12px 45px;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          font-size: 14px;
          outline: none;
          transition: all 0.2s;
          background: #f8fafc;
        }

        .search-wrapper-glass input:focus {
          border-color: #3b82f6;
          background: white;
          box-shadow: 0 0 0 4px rgba(59,130,246,0.1);
        }

        .clear-search {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
        }

        .clear-search:hover {
          background: #f1f5f9;
          color: #475569;
        }

        .filter-select-glass {
          flex: 1;
          min-width: 160px;
          padding: 12px 16px;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          font-size: 14px;
          color: #1e293b;
          background: #f8fafc;
          cursor: pointer;
          outline: none;
          transition: all 0.2s;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 12px center;
        }

        .filter-select-glass:focus {
          border-color: #3b82f6;
          background: white;
        }

        .unread-toggle-glass {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          padding: 8px 12px;
          background: #f8fafc;
          border-radius: 12px;
          border: 2px solid #e2e8f0;
        }

        .unread-toggle-glass input {
          display: none;
        }

        .toggle-track {
          width: 44px;
          height: 24px;
          background: #cbd5e1;
          border-radius: 30px;
          position: relative;
          transition: all 0.2s;
        }

        .unread-toggle-glass input:checked + .toggle-track {
          background: #3b82f6;
        }

        .toggle-indicator {
          width: 20px;
          height: 20px;
          background: white;
          border-radius: 50%;
          position: absolute;
          top: 2px;
          left: 2px;
          transition: all 0.2s;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .unread-toggle-glass input:checked + .toggle-track .toggle-indicator {
          left: 22px;
        }

        .toggle-label {
          font-size: 14px;
          font-weight: 500;
          color: #334155;
        }

        /* Messages Grid */
        .messages-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
          gap: 20px;
        }

        .loading-state {
          grid-column: 1 / -1;
          text-align: center;
          padding: 80px 20px;
        }

        .loading-state p {
          margin-top: 16px;
          color: #64748b;
        }

        .message-card {
          background: white;
          border-radius: 20px;
          padding: 20px;
          transition: all 0.3s;
          border: 1px solid #e2e8f0;
          position: relative;
          overflow: hidden;
        }

        .message-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 30px -10px rgba(0, 0, 0, 0.1);
          border-color: #cbd5e1;
        }

        .message-card.unread {
          background: linear-gradient(135deg, #f0f9ff 0%, #e6f3ff 100%);
          border-left: 4px solid #3b82f6;
        }

        .message-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
        }

        .sender-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .sender-avatar {
          width: 44px;
          height: 44px;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 18px;
          box-shadow: 0 8px 15px -3px rgba(59,130,246,0.3);
        }

        .sender-details {
          flex: 1;
        }

        .sender-name {
          font-weight: 600;
          color: #0f172a;
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
        }

        .unread-badge {
          display: inline-block;
          padding: 3px 8px;
          background: #3b82f6;
          color: white;
          border-radius: 20px;
          font-size: 10px;
          font-weight: 600;
        }

        .sender-email {
          font-size: 12px;
          color: #64748b;
        }

        .message-meta {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 8px;
        }

        .status-indicator {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 30px;
          font-size: 12px;
          font-weight: 600;
        }

        .message-time {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          color: #64748b;
        }

        .message-card-body {
          margin-bottom: 16px;
        }

        .subject-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 12px;
        }

        .subject-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          background: #f1f5f9;
          border-radius: 20px;
          font-size: 12px;
          color: #334155;
        }

        .category-tag {
          font-size: 11px;
          padding: 4px 10px;
          background: #e2e8f0 !important;
          color: #334155 !important;
          border-radius: 20px;
        }

        .message-excerpt {
          color: #334155;
          font-size: 14px;
          line-height: 1.6;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .message-card-footer {
          display: flex;
          gap: 10px;
          border-top: 1px solid #e2e8f0;
          padding-top: 16px;
        }

        .action-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          background: white;
          color: #475569;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .action-btn:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
          transform: translateY(-1px);
        }

        .view-btn-full {
          flex: 1;
          justify-content: center;
        }

        .view-btn-full:hover {
          background: #3b82f6;
          border-color: #3b82f6;
          color: white;
        }

        /* Empty State */
        .empty-state-glass {
          grid-column: 1 / -1;
          text-align: center;
          padding: 80px 20px;
          background: white;
          border-radius: 30px;
          border: 2px dashed #e2e8f0;
        }

        .empty-icon {
          width: 100px;
          height: 100px;
          background: #f1f5f9;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
          color: #94a3b8;
        }

        .empty-state-glass h3 {
          font-size: 22px;
          font-weight: 600;
          color: #0f172a;
          margin-bottom: 8px;
        }

        .empty-state-glass p {
          color: #64748b;
          font-size: 15px;
          margin-bottom: 20px;
        }

        .clear-btn {
          padding: 10px 24px;
          border-radius: 30px;
          font-size: 14px;
        }

        /* Modern Modal */
        .modern-modal .modal-content {
          border: none;
          border-radius: 30px;
          overflow: hidden;
          box-shadow: 0 50px 70px -20px rgba(0, 0, 0, 0.3);
        }

        .modal-header {
          padding: 20px 24px;
          border-bottom: 1px solid #e2e8f0;
          background: #f8fafc;
        }

        .modal-title {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 18px;
          font-weight: 600;
          color: #0f172a;
        }

        .modal-title-icon {
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .modal-body {
          padding: 24px;
          max-height: 70vh;
          overflow-y: auto;
          background: linear-gradient(135deg, #ffffff 0%, #fafdff 100%);
        }

        .modal-content-modern {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .modal-section {
          background: white;
          border-radius: 16px;
          padding: 20px;
          border: 1px solid #e2e8f0;
        }

        .modal-section.highlight {
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
        }

        .modal-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .modal-subject {
          font-size: 20px;
          font-weight: 600;
          color: #0f172a;
          margin: 0;
        }

        .modal-badge-group {
          display: flex;
          gap: 8px;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 30px;
          font-size: 12px;
          font-weight: 600;
        }

        .category-badge-modern {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: #f1f5f9 !important;
          color: #334155 !important;
          border-radius: 30px;
          font-size: 12px;
          font-weight: 500;
        }

        .modal-time-row {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #64748b;
          font-size: 13px;
        }

        .section-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 600;
          color: #334155;
          margin-bottom: 16px;
        }

        .sender-card {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .sender-avatar-large {
          width: 56px;
          height: 56px;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 24px;
          font-weight: 600;
        }

        .sender-details-large {
          flex: 1;
        }

        .sender-name-large {
          font-size: 16px;
          font-weight: 600;
          color: #0f172a;
          margin-bottom: 4px;
        }

        .sender-email-large {
          font-size: 14px;
          color: #64748b;
        }

        .message-content-box {
          background: #f8fafc;
          padding: 20px;
          border-radius: 12px;
          font-size: 15px;
          line-height: 1.7;
          color: #1e293b;
          white-space: pre-wrap;
          border: 1px solid #e2e8f0;
        }

        .notes-box-modern {
          background: #fffbeb;
          padding: 16px;
          border-radius: 12px;
          font-size: 14px;
          color: #92400e;
          border: 1px solid #fef3c7;
        }

        .reply-input-modern,
        .note-input-modern {
          width: 100%;
          padding: 14px 16px;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          font-size: 14px;
          resize: vertical;
          outline: none;
          transition: all 0.2s;
          background: #f8fafc;
        }

        .reply-input-modern:focus,
        .note-input-modern:focus {
          border-color: #3b82f6;
          background: white;
          box-shadow: 0 0 0 4px rgba(59,130,246,0.1);
        }

        .modal-footer {
          padding: 20px 24px;
          border-top: 1px solid #e2e8f0;
          background: #f8fafc;
        }

        .modal-footer-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          width: 100%;
        }

        /* Footer Status Dropdown */
        .status-footer-btn {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          border: none;
          color: white;
          padding: 10px 20px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          display: flex;
          align-items: center;
          justify-content: space-between;
          min-width: 180px;
          box-shadow: 0 4px 6px -1px rgba(59,130,246,0.2);
          transition: all 0.2s ease;
        }

        .status-footer-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 15px -3px rgba(59,130,246,0.3);
        }

        .status-footer-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .status-footer-btn.dropdown-toggle::after {
          display: none;
        }

        .status-footer-menu {
          min-width: 220px;
          padding: 8px;
          border: none;
          border-radius: 14px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }

        .status-footer-menu .dropdown-item {
          padding: 10px 16px;
          border-radius: 10px;
          margin-bottom: 4px;
          transition: all 0.2s ease;
        }

        .status-footer-menu .dropdown-item:hover {
          background-color: #f1f5f9;
        }

        .status-footer-menu .dropdown-item:active {
          background-color: #e2e8f0;
        }

        .status-footer-menu .dropdown-item.active {
          background-color: #e6f3ff;
          color: #1e293b;
        }

        .status-footer-menu .dropdown-item:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .status-footer-menu .dropdown-item .d-flex {
          width: 100%;
        }

        .status-footer-menu .dropdown-divider {
          margin: 8px 0;
          border-top: 1px solid #e2e8f0;
        }

        .cancel-btn {
          padding: 10px 24px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          border: 2px solid #e2e8f0;
          background: white;
          color: #475569;
        }

        .send-btn {
          padding: 10px 24px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          border: none;
          box-shadow: 0 8px 15px -3px rgba(16,185,129,0.3);
        }

        .send-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 20px -5px rgba(16,185,129,0.4);
        }

        .send-btn:disabled {
          opacity: 0.5;
          transform: none;
          box-shadow: none;
        }

        /* WhatsApp Style Conversation */
        .whatsapp-conversation {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 20px 16px;
          background: #e5ded8;
          background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23e5ded8" /><path d="M0 0 L100 100 M100 0 L0 100" stroke="%23ccc5be" stroke-width="0.5" /></svg>');
          border-radius: 12px;
          max-height: 400px;
          overflow-y: auto;
          scroll-behavior: smooth;
        }

        .message-wrapper {
          display: flex;
          width: 100%;
        }

        .user-message {
          justify-content: flex-end;
        }

        .admin-message {
          justify-content: flex-start;
        }

        .message-bubble {
          max-width: 80%;
          background: white;
          border-radius: 12px 12px 4px 12px;
          padding: 10px 14px;
          position: relative;
          box-shadow: 0 1px 2px rgba(0,0,0,0.1);
          word-wrap: break-word;
        }

        .admin-message .message-bubble {
          background: white;
          border-radius: 12px 12px 12px 4px;
        }

        .user-message .message-bubble {
          background: #dcf8c6;
        }

        .message-sender-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }

        .message-sender-info .sender-name {
          font-size: 12px;
          font-weight: 600;
          color: #3b82f6;
        }

        .user-message .message-sender-info .sender-name {
          color: #075e54;
        }

        .message-sender-info .message-time {
          font-size: 10px;
          color: #94a3b8;
        }

        .message-content {
          font-size: 14px;
          line-height: 1.5;
          color: #1e293b;
          margin-bottom: 4px;
        }

        .message-status {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 4px;
          font-size: 10px;
          color: #94a3b8;
        }

        .message-status .read-icon {
          color: #34b7f1;
        }

        /* WhatsApp Input Area */
        .whatsapp-input-area {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: #f0f2f5;
          border-radius: 30px;
          margin-top: 12px;
        }

        .input-action-btn {
          background: none;
          border: none;
          color: #54656f;
          cursor: pointer;
          padding: 8px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .input-action-btn:hover {
          background: #e4e6eb;
        }

        .input-wrapper {
          flex: 1;
          background: white;
          border-radius: 24px;
          padding: 8px 16px;
        }

        .whatsapp-input {
          width: 100%;
          border: none;
          outline: none;
          resize: none;
          font-size: 14px;
          line-height: 1.5;
          max-height: 100px;
          background: transparent;
          font-family: inherit;
        }

        .send-btn-whatsapp {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #e4e6eb;
          border: none;
          color: #8696a0;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .send-btn-whatsapp.active {
          background: #00a884;
          color: white;
        }

        .send-btn-whatsapp.active:hover {
          background: #008f72;
        }

        .whatsapp-closed-message {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 16px;
          background: #fee2e2;
          border-radius: 12px;
          color: #991b1b;
          font-size: 14px;
          margin-top: 12px;
        }

        .whatsapp-closed-message svg {
          flex-shrink: 0;
        }

        /* Scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        ::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }

        ::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .admin-page {
            padding: 16px;
          }

          .header-content {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .filters-body {
            flex-direction: column;
          }

          .search-wrapper-glass {
            min-width: 100%;
          }

          .filter-select-glass {
            min-width: 100%;
          }

          .unread-toggle-glass {
            width: 100%;
            justify-content: center;
          }

          .messages-grid {
            grid-template-columns: 1fr;
          }

          .message-card-header {
            flex-direction: column;
            gap: 12px;
          }

          .message-meta {
            width: 100%;
            flex-direction: row;
            justify-content: space-between;
          }

          .modal-header-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }

          .message-bubble {
            max-width: 90%;
          }
        }
      `}</style>
    </>
  );
}