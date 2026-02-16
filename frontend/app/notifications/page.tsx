'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Row,
  Col,
  Card,
  ListGroup,
  Badge,
  Button,
  Spinner,
  Pagination,
  Alert,
  InputGroup,
  FormControl,
  Dropdown
} from 'react-bootstrap';
import {
  Bell,
  ArrowLeft,
  RefreshCw,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  Clock,
  Trash2,
  Search,
  MessageCircle,
  CheckCheck,
  Filter,
  MoreVertical,
  BellOff
} from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

interface Notification {
  _id: string;
  type: 'message_status_changed' | 'message_replied' | 'new_message' | 'system';
  title: string;
  message: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  actionUrl: string;
  relatedData?: {
    messageSubject?: string;
    previousStatus?: string;
    newStatus?: string;
  };
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function NotificationsPage() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'unread' | 'read'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isMobileView, setIsMobileView] = useState(false);
  const itemsPerPage = 10;

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

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setRefreshing(true);
      const token = localStorage.getItem('token');

      const response = await fetch(`${API_BASE_URL}/api/notifications`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setFilteredNotifications(data.notifications || []);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to load notifications');
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
    }
  }, [isAuthenticated]);

  // Auto-refresh notifications every 10 seconds
  useEffect(() => {
    if (!isAuthenticated || !autoRefresh) return;

    const interval = setInterval(() => {
      fetchNotifications();
    }, 10000);

    return () => clearInterval(interval);
  }, [isAuthenticated, autoRefresh]);

  // Filter notifications based on search and type
  useEffect(() => {
    let filtered = [...notifications];

    // Filter by read/unread status
    if (filterType === 'unread') {
      filtered = filtered.filter(n => !n.isRead);
    } else if (filterType === 'read') {
      filtered = filtered.filter(n => n.isRead);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(n =>
        n.title.toLowerCase().includes(term) ||
        n.message.toLowerCase().includes(term)
      );
    }

    setFilteredNotifications(filtered);
    setCurrentPage(1);
  }, [notifications, searchTerm, filterType]);

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentNotifications = filteredNotifications.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage);

  // Handle logout
  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // Handle notification click (mark as read and navigate)
  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      try {
        const token = localStorage.getItem('token');
        await fetch(`${API_BASE_URL}/api/notifications/${notification._id}/read`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        });

        setNotifications(prev =>
          prev.map(n =>
            n._id === notification._id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
          )
        );
        try { window.dispatchEvent(new Event('countsUpdate')); } catch (e) {}
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    }

    if (notification.actionUrl) {
      router.push(notification.actionUrl);
    }
  };

  // Handle mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/notifications/read-all`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      if (response.ok) {
        toast.success('All notifications marked as read');
        setNotifications(prev =>
          prev.map(n => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
        );
        try { window.dispatchEvent(new Event('countsUpdate')); } catch (e) {}
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to mark all as read');
    }
  };

  // Handle delete notification
  const handleDeleteNotification = async (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      if (response.ok) {
        toast.success('Notification deleted');
        setNotifications(prev =>
          prev.filter(n => n._id !== notificationId)
        );
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSeconds < 60) return 'Just now';
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
    if (diffSeconds < 604800) return `${Math.floor(diffSeconds / 86400)}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  // Get notification icon and color
  const getNotificationIcon = (type: string, isRead: boolean) => {
    const color = isRead ? '#6c757d' : '#0d6efd';
    switch (type) {
      case 'message_status_changed':
        return <AlertCircle size={20} color={color} />;
      case 'message_replied':
        return <MessageCircle size={20} color={color} />;
      case 'new_message':
        return <MessageSquare size={20} color={color} />;
      default:
        return <Bell size={20} color={color} />;
    }
  };

  // Get notification badge
  const getNotificationBadge = (type: string) => {
    switch (type) {
      case 'message_status_changed':
        return <span className="notification-badge bg-info">Status Update</span>;
      case 'message_replied':
        return <span className="notification-badge bg-success">Reply</span>;
      case 'new_message':
        return <span className="notification-badge bg-primary">Message</span>;
      default:
        return <span className="notification-badge bg-secondary">System</span>;
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (loading) {
    return (
      <>
        <div className="blue-white-loading">
          <div className="spinner">
            <div className="bounce1"></div>
            <div className="bounce2"></div>
            <div className="bounce3"></div>
          </div>
          <p className="mt-3 text-primary">Loading your notifications...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />

      <div className="notifications-page">
        {/* Header Section */}
        <div className="notifications-header">
          <div className="container-fluid px-4">
            <div className="d-flex flex-wrap align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-3">
                <Button
                  variant="link"
                  onClick={() => router.push('/')}
                  className="back-button"
                >
                  <ArrowLeft size={20} color="#0d6efd" />
                </Button>
                <div>
                  <h1 className="page-title">Notifications</h1>
                  <p className="page-subtitle">
                    Stay updated with your support tickets and messages
                  </p>
                </div>
              </div>
              
              <div className="d-flex gap-2 mt-3 mt-md-0">
                {!isMobileView && (
                  <>
                    <Button
                      variant={autoRefresh ? "primary" : "outline-primary"}
                      onClick={() => setAutoRefresh(!autoRefresh)}
                      className="action-btn d-flex align-items-center"
                    >
                      <RefreshCw 
                        size={16} 
                        className="me-2"
                        style={{ animation: autoRefresh ? 'spin 2s linear infinite' : 'none' }}
                      />
                      {autoRefresh ? 'Auto ON' : 'Auto OFF'}
                    </Button>
                    
                    <Button
                      variant="outline-primary"
                      onClick={fetchNotifications}
                      disabled={refreshing}
                      className="action-btn d-flex align-items-center"
                    >
                      <RefreshCw 
                        size={16} 
                        className="me-2"
                        style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }}
                      />
                      {refreshing ? '...' : 'Refresh'}
                    </Button>
                  </>
                )}

                {unreadCount > 0 && (
                  <Button
                    variant="primary"
                    onClick={handleMarkAllAsRead}
                    className="action-btn d-flex align-items-center"
                  >
                    <CheckCheck size={16} className="me-2" />
                    {!isMobileView && 'Mark All Read'}
                    {isMobileView && 'Mark Read'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div className="filters-section">
          <div className="container-fluid px-4">
            <div className="row g-3">
              <div className="col-12 col-md-7 col-lg-8">
                <div className="search-wrapper">
                  <Search size={18} className="search-icon" />
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Search notifications..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <button 
                      className="clear-search"
                      onClick={() => setSearchTerm('')}
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
              <div className="col-12 col-md-5 col-lg-4">
                <div className="filter-buttons">
                  <button
                    className={`filter-btn ${filterType === 'all' ? 'active' : ''}`}
                    onClick={() => setFilterType('all')}
                  >
                    All ({notifications.length})
                  </button>
                  <button
                    className={`filter-btn ${filterType === 'unread' ? 'active' : ''}`}
                    onClick={() => setFilterType('unread')}
                  >
                    Unread ({notifications.filter(n => !n.isRead).length})
                  </button>
                  <button
                    className={`filter-btn ${filterType === 'read' ? 'active' : ''}`}
                    onClick={() => setFilterType('read')}
                  >
                    Read
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div className="notifications-list">
          <div className="container-fluid px-4">
            {currentNotifications.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <BellOff size={48} color="#0d6efd" />
                </div>
                <h3>No notifications found</h3>
                <p className="text-muted">
                  {searchTerm
                    ? 'Try adjusting your search terms.'
                    : filterType !== 'all'
                      ? `You have no ${filterType} notifications.`
                      : 'You\'ll get notifications when your support tickets are updated.'}
                </p>
                {searchTerm && (
                  <Button 
                    variant="outline-primary" 
                    onClick={() => setSearchTerm('')}
                    className="mt-3"
                  >
                    Clear search
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="notifications-timeline">
                  {currentNotifications.map((notification, index) => (
                    <div
                      key={notification._id}
                      className={`notification-item ${!notification.isRead ? 'unread' : ''}`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      {!notification.isRead && <div className="unread-indicator"></div>}
                      
                      <div className="notification-avatar">
                        {getNotificationIcon(notification.type, notification.isRead)}
                      </div>
                      
                      <div className="notification-content">
                        <div className="notification-header">
                          <div className="d-flex flex-wrap align-items-center gap-2">
                            <h6 className="notification-title">
                              {notification.title}
                            </h6>
                            {getNotificationBadge(notification.type)}
                            {!notification.isRead && (
                              <span className="new-badge">New</span>
                            )}
                          </div>
                          <div className="notification-actions">
                            <span className="notification-time">
                              <Clock size={14} className="me-1" />
                              {formatDate(notification.createdAt)}
                            </span>
                            <button
                              className="delete-btn"
                              onClick={(e) => handleDeleteNotification(notification._id, e)}
                              title="Delete notification"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        
                        <p className="notification-message">
                          {notification.message}
                        </p>
                        
                        {notification.relatedData?.messageSubject && (
                          <div className="notification-meta">
                            <MessageSquare size={14} className="me-1" />
                            <span>{notification.relatedData.messageSubject}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="pagination-wrapper">
                    <div className="pagination-container">
                      <button
                        className="pagination-nav"
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                      >
                        <ArrowLeft size={16} />
                      </button>
                      
                      <div className="pagination-pages">
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                          .filter(page => {
                            if (totalPages <= 7) return true;
                            if (page === 1 || page === totalPages) return true;
                            if (page >= currentPage - 1 && page <= currentPage + 1) return true;
                            return false;
                          })
                          .map((page, index, array) => (
                            <div key={page} className="d-flex align-items-center">
                              {index > 0 && page - array[index - 1] > 1 && (
                                <span className="pagination-ellipsis">...</span>
                              )}
                              <button
                                className={`pagination-item ${page === currentPage ? 'active' : ''}`}
                                onClick={() => setCurrentPage(page)}
                              >
                                {page}
                              </button>
                            </div>
                          ))
                        }
                      </div>
                      
                      <button
                        className="pagination-nav"
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                      >
                        <ArrowLeft size={16} style={{ transform: 'rotate(180deg)' }} />
                      </button>
                    </div>
                    <span className="pagination-info">
                      Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredNotifications.length)} of {filteredNotifications.length}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
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
          position: relative;
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

        .navbar-badge {
          position: absolute;
          top: 0;
          right: 0;
          background-color: #dc3545;
          color: white;
          font-size: 11px;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 10px;
          min-width: 18px;
          text-align: center;
        }

        /* Main Container */
        .notifications-page {
          margin-top: 56px;
          min-height: calc(100vh - 56px);
          background-color: #fff;
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

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Header Section */
        .notifications-header {
          background-color: #fff;
          border-bottom: 1px solid #e9ecef;
          padding: 24px 0;
        }

        .back-button {
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

        .back-button:hover {
          background-color: #d4e2ff;
        }

        .page-title {
          font-size: 28px;
          font-weight: 700;
          color: #212529;
          margin: 0;
          line-height: 1.2;
        }

        .page-subtitle {
          font-size: 14px;
          color: #6c757d;
          margin: 4px 0 0 0;
        }

        .action-btn {
          padding: 8px 16px !important;
          border-radius: 20px !important;
          font-size: 14px;
          font-weight: 500;
        }

        .action-btn.btn-primary {
          background-color: #0d6efd;
          border-color: #0d6efd;
        }

        .action-btn.btn-outline-primary {
          border-color: #0d6efd;
          color: #0d6efd;
        }

        .action-btn.btn-outline-primary:hover {
          background-color: #e7f1ff;
        }

        /* Filters Section */
        .filters-section {
          background-color: #fff;
          border-bottom: 1px solid #e9ecef;
          padding: 16px 0;
        }

        .search-wrapper {
          position: relative;
          width: 100%;
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
          padding: 12px 16px 12px 45px;
          background-color: #f8f9fa;
          border: 1px solid #e9ecef;
          border-radius: 30px;
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

        .clear-search {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #6c757d;
          font-size: 20px;
          cursor: pointer;
          padding: 0 4px;
        }

        .clear-search:hover {
          color: #212529;
        }

        .filter-buttons {
          display: flex;
          gap: 8px;
          height: 100%;
        }

        .filter-btn {
          flex: 1;
          padding: 8px 16px;
          background-color: #f8f9fa;
          border: 1px solid #e9ecef;
          border-radius: 30px;
          color: #6c757d;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .filter-btn:hover {
          background-color: #e7f1ff;
          border-color: #0d6efd;
          color: #0d6efd;
        }

        .filter-btn.active {
          background-color: #0d6efd;
          border-color: #0d6efd;
          color: white;
        }

        /* Notifications List */
        .notifications-list {
          padding: 24px 0 40px;
          background-color: #fff;
        }

        .notifications-timeline {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .notification-item {
          display: flex;
          gap: 16px;
          padding: 20px;
          background-color: #fff;
          border: 1px solid #e9ecef;
          border-radius: 12px;
          position: relative;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .notification-item:hover {
          background-color: #f8f9fa;
          border-color: #0d6efd;
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(13,110,253,0.1);
        }

        .notification-item.unread {
          background-color: #e7f1ff;
          border-color: #0d6efd;
        }

        .unread-indicator {
          position: absolute;
          left: -1px;
          top: 50%;
          transform: translateY(-50%);
          width: 4px;
          height: 70%;
          background-color: #0d6efd;
          border-radius: 0 4px 4px 0;
        }

        .notification-avatar {
          flex-shrink: 0;
          width: 48px;
          height: 48px;
          background-color: #fff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #e9ecef;
        }

        .notification-item.unread .notification-avatar {
          border-color: #0d6efd;
        }

        .notification-content {
          flex: 1;
          min-width: 0;
        }

        .notification-header {
          display: flex;
          flex-wrap: wrap;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 8px;
          gap: 12px;
        }

        .notification-title {
          font-size: 16px;
          font-weight: 600;
          color: #212529;
          margin: 0;
        }

        .notification-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
          color: white;
        }

        .new-badge {
          display: inline-block;
          padding: 4px 10px;
          background-color: #0d6efd;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
          color: white;
        }

        .notification-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-left: auto;
        }

        .notification-time {
          display: flex;
          align-items: center;
          font-size: 12px;
          color: #6c757d;
          white-space: nowrap;
        }

        .delete-btn {
          padding: 6px;
          background: none;
          border: none;
          color: #6c757d;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .delete-btn:hover {
          background-color: #dc3545;
          color: white;
        }

        .notification-message {
          font-size: 14px;
          line-height: 1.6;
          color: #4a5568;
          margin-bottom: 12px;
        }

        .notification-meta {
          display: inline-flex;
          align-items: center;
          padding: 6px 12px;
          background-color: #f8f9fa;
          border-radius: 20px;
          font-size: 12px;
          color: #6c757d;
        }

        /* Empty State */
        .empty-state {
          text-align: center;
          padding: 60px 20px;
          background-color: #fff;
          border-radius: 12px;
        }

        .empty-icon {
          width: 80px;
          height: 80px;
          background-color: #e7f1ff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
        }

        .empty-state h3 {
          font-size: 20px;
          font-weight: 600;
          color: #212529;
          margin-bottom: 8px;
        }

        .empty-state p {
          font-size: 14px;
          color: #6c757d;
          max-width: 400px;
          margin: 0 auto;
        }

        /* Pagination */
        .pagination-wrapper {
          margin-top: 32px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .pagination-container {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .pagination-nav {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #e9ecef;
          border-radius: 8px;
          background-color: #fff;
          color: #6c757d;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .pagination-nav:hover:not(:disabled) {
          background-color: #e7f1ff;
          border-color: #0d6efd;
          color: #0d6efd;
        }

        .pagination-nav:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .pagination-pages {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .pagination-item {
          min-width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #e9ecef;
          border-radius: 8px;
          background-color: #fff;
          color: #6c757d;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .pagination-item:hover {
          background-color: #e7f1ff;
          border-color: #0d6efd;
          color: #0d6efd;
        }

        .pagination-item.active {
          background-color: #0d6efd;
          border-color: #0d6efd;
          color: white;
        }

        .pagination-ellipsis {
          padding: 0 4px;
          color: #6c757d;
        }

        .pagination-info {
          font-size: 13px;
          color: #6c757d;
        }

        /* Mobile Responsive */
        @media (max-width: 768px) {
          .page-title {
            font-size: 24px;
          }

          .notification-item {
            padding: 16px;
            flex-direction: column;
          }

          .notification-avatar {
            width: 40px;
            height: 40px;
          }

          .notification-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .notification-actions {
            width: 100%;
            justify-content: space-between;
            margin-left: 0;
          }

          .filter-buttons {
            margin-top: 8px;
          }
        }

        /* Scrollbar */
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
      `}</style>
    </>
  );
}