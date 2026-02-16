'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Container, Navbar, Nav, Button, Badge, Tooltip, OverlayTrigger, Spinner } from 'react-bootstrap';
import { 
  Bell, 
  MessageSquare, 
  Briefcase, 
  FileCheck,
  User, 
  LogOut, 
  Building, 
  ChevronDown, 
  Settings, 
  Bookmark, 
  UserPlus, 
  FileText, 
  PlusCircle, 
  ExternalLink,
  Sparkles,
  Home
} from 'lucide-react';
import SearchBar from '@/components/SearchBar';

// Define user type
interface User {
  _id: string;
  name: string;
  email: string;
  profileImage?: string;
  role?: string;
  companyId?: string;
}

// Define company type
interface Company {
  _id: string;
  name: string;
  logo?: string;
  industry?: string;
}

export default function NavBar() {
  const [user, setUser] = useState<User | null>(null);
  const [userCompanies, setUserCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notificationCount, setNotificationCount] = useState(0);
  const [messageCount, setMessageCount] = useState(0);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  // Listen for auth state changes in localStorage
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token' || e.key === 'user') {
        checkAuthStatus();
      }
    };

    const handleAuthEvent = () => {
      checkAuthStatus();
    };

    const handleCountsUpdate = () => {
      // Refresh notification and message counts immediately
      const token = localStorage.getItem('token');
      if (token) {
        fetchNotifications(token);
        fetchMessages(token);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('authChange', handleAuthEvent);
    window.addEventListener('countsUpdate', handleCountsUpdate as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('authChange', handleAuthEvent);
      window.removeEventListener('countsUpdate', handleCountsUpdate as EventListener);
    };
  }, []);

  // Check auth status on component mount and when pathname changes
  useEffect(() => {
    checkAuthStatus();
  }, [pathname]);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Poll for notifications and messages updates
  useEffect(() => {
    if (!user) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    // Set up polling interval (every 30 seconds)
    const pollInterval = setInterval(() => {
      fetchNotifications(token);
      fetchMessages(token);
    }, 30000); // 30 seconds

    return () => clearInterval(pollInterval);
  }, [user]);

  // Check authentication status
  const checkAuthStatus = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');
      
      if (token && userData) {
        try {
          // Validate token by making API call
          const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
          const response = await fetch(`${API_URL}/api/auth/user`, {
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
          });

          if (response.ok) {
            const userObj = JSON.parse(userData);
            setUser(userObj);
            
            // Fetch user's companies
            await fetchUserCompanies(token, userObj._id);
            
            // Fetch notifications and messages
            await fetchNotifications(token);
            await fetchMessages(token);
          } else {
            // Token is invalid, clear local storage
            clearAuthData();
          }
        } catch (error) {
          console.error('Error validating token:', error);
          clearAuthData();
        }
      } else {
        clearAuthData();
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      clearAuthData();
    } finally {
      setIsLoading(false);
      setAuthChecked(true);
    }
  };

  // Fetch user companies
  const fetchUserCompanies = async (token: string, userId: string) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(
        `${API_URL}/api/company/user/my-companies`,
        {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.companies && Array.isArray(data.companies)) {
          setUserCompanies(data.companies);
        } else if (Array.isArray(data)) {
          setUserCompanies(data);
        } else {
          setUserCompanies([]);
        }
      } else {
        setUserCompanies([]);
      }
    } catch (error) {
      console.warn('Could not fetch user companies:', error);
      setUserCompanies([]);
    }
  };

  // Fetch notifications
  const fetchNotifications = async (token: string) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_URL}/api/notifications/unread-count`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      if (response.ok) {
        const data = await response.json();
        setNotificationCount(data.count || 0);
      }
    } catch (error) {
      console.warn('Could not fetch notifications:', error);
    }
  };

  // Fetch messages
  const fetchMessages = async (token: string) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      // Get contact messages with replies for current user
      const response = await fetch(`${API_URL}/api/contact-us/user/messages?unreadOnly=true`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMessageCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.warn('Could not fetch messages:', error);
    }
  };

  // Clear authentication data
  const clearAuthData = () => {
    setUser(null);
    setUserCompanies([]);
    setNotificationCount(0);
    setMessageCount(0);
  };

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        await fetch(`${API_URL}/api/auth/logout`, {
          method: 'GET',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        }).catch(err => {
          // Ignore errors from logout API
          console.warn('Logout API call failed:', err);
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear local storage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Clear state
      clearAuthData();
      
      // Close dropdown
      setShowProfileDropdown(false);
      
      // Dispatch custom event to notify other components
      window.dispatchEvent(new Event('authChange'));
      
      // Redirect to home
      router.push('/');
      router.refresh();
    }
  };

  const getUserInitials = (name: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const getProfileImageUrl = (profileImage?: string): string => {
    if (!profileImage) return '';
    
    try {
      new URL(profileImage);
      return profileImage;
    } catch (error) {
      if (profileImage.startsWith('/')) {
        return `${window.location.origin}${profileImage}`;
      }
      
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      return `${API_BASE_URL}/${profileImage.replace(/^\//, '')}`;
    }
  };

  const handleCreateCompany = () => {
    router.push('/company/create');
    setShowProfileDropdown(false);
  };

  const toggleProfileDropdown = () => {
    if (user) {
      setShowProfileDropdown(!showProfileDropdown);
    } else {
      router.push('/login');
    }
  };

  const handleCompanyClick = (companyId: string) => {
    router.push(`/company/${companyId}`);
    setShowProfileDropdown(false);
  };

  const handleViewAllCompanies = () => {
    router.push('/company/user/my-companies');
    setShowProfileDropdown(false);
  };

  const handleProfileClick = () => {
    if (user) {
      router.push(`/profile/${user._id}`);
      setShowProfileDropdown(false);
    }
  };

  const handleAppliedJobsClick = () => {
    if (user) {
      router.push(`/profile/${user._id}/applied-jobs`);
    } else {
      router.push('/login');
    }
  };

  const handleMessagesClick = () => {
    if (user) {
      router.push('/messages');
    } else {
      router.push('/login');
    }
  };

  const handleNotificationsClick = () => {
    if (user) {
      router.push('/notifications');
    } else {
      router.push('/login');
    }
  };

  const handleCompanyDashboardClick = () => {
    if (user && userCompanies.length > 0) {
      router.push('/company/dashboard');
    } else if (user) {
      router.push('/company/create');
    } else {
      router.push('/login');
    }
  };

  if (isLoading && !authChecked) {
    return (
      <Navbar expand="lg" className={`py-2 navbar-glass ${isScrolled ? 'navbar-scrolled' : ''}`}>
        <Container fluid className="px-4">
          <Navbar.Brand as={Link} href="/" className="fw-bold fs-4 text-gradient">
            <Sparkles size={28} className="me-2" />
            CareerConnect
          </Navbar.Brand>
          <div className="ms-auto d-flex align-items-center">
            <Spinner animation="border" size="sm" className="me-2" />
            <span className="text-muted small">Loading...</span>
          </div>
        </Container>
      </Navbar>
    );
  }

  const isAuthenticated = !!user;

  return (
    <>
      <Navbar expand="lg" className={`py-2 navbar-glass ${isScrolled ? 'navbar-scrolled' : ''}`}>
        <Container fluid className="px-4">
          {/* Logo */}
          <Navbar.Brand as={Link} href="/" className="fw-bold fs-4 text-gradient me-4 d-flex align-items-center">
            <div className="logo-icon me-2">
              <Briefcase size={28} />
            </div>
            <span className="logo-text">CareerConnect</span>
          </Navbar.Brand>

          {/* Search Bar */}
          <div className="position-relative flex-grow-1 mx-4">
            <SearchBar />
          </div>

          {/* Toggle for mobile */}
          <Navbar.Toggle aria-controls="navbar-nav" className="order-lg-3 border-0 navbar-toggler" />

          <Navbar.Collapse id="navbar-nav" className="order-lg-2 justify-content-end">
            {/* Navigation Links */}
            <Nav className="mx-auto mx-lg-0 me-lg-4">
              {/* Home */}
              <OverlayTrigger placement="bottom" overlay={<Tooltip className="custom-tooltip">Home</Tooltip>}>
                <Nav.Link as={Link} href="/" className="fw-medium px-3 nav-icon-item">
                  <Home size={22} />
                </Nav.Link>
              </OverlayTrigger>
              
              {/* Jobs Tab */}
              <OverlayTrigger placement="bottom" overlay={<Tooltip className="custom-tooltip">Browse Jobs</Tooltip>}>
                <Nav.Link as={Link} href="/jobs" className="fw-medium px-3 nav-icon-item">
                  <Briefcase size={22} />
                </Nav.Link>
              </OverlayTrigger>
              
              {/* Applied Jobs Tab - Only show if authenticated */}
              {isAuthenticated && (
                <OverlayTrigger placement="bottom" overlay={<Tooltip className="custom-tooltip">My Applications</Tooltip>}>
                  <Nav.Link 
                    as="div"
                    className="fw-medium px-3 nav-icon-item"
                    onClick={handleAppliedJobsClick}
                    style={{ cursor: 'pointer' }}
                  >
                    <FileCheck size={22} />
                  </Nav.Link>
                </OverlayTrigger>
              )}
              
              {/* Messages Tab - Only show if authenticated */}
              {isAuthenticated && (
                <OverlayTrigger placement="bottom" overlay={<Tooltip className="custom-tooltip">Messages</Tooltip>}>
                  <Nav.Link 
                    as="div"
                    className="fw-medium px-3 nav-icon-item position-relative"
                    onClick={handleMessagesClick}
                    style={{ cursor: 'pointer' }}
                  >
                    <MessageSquare size={22} />
                    {messageCount > 0 && (
                      <Badge pill className="position-absolute top-0 end-0 badge-notification">
                        {messageCount}
                      </Badge>
                    )}
                  </Nav.Link>
                </OverlayTrigger>
              )}
              
              {/* Notifications Tab - Only show if authenticated */}
              {isAuthenticated && (
                <OverlayTrigger placement="bottom" overlay={<Tooltip className="custom-tooltip">Notifications</Tooltip>}>
                  <Nav.Link 
                    as="div"
                    className="fw-medium px-3 nav-icon-item position-relative"
                    onClick={handleNotificationsClick}
                    style={{ cursor: 'pointer' }}
                  >
                    <Bell size={22} />
                    {notificationCount > 0 && (
                      <Badge pill className="position-absolute top-0 end-0 badge-notification">
                        {notificationCount}
                      </Badge>
                    )}
                  </Nav.Link>
                </OverlayTrigger>
              )}
            </Nav>

            {/* Right Section */}
            <div className="d-flex align-items-center ms-lg-auto gap-3">
              {isAuthenticated ? (
                <>
                  {/* Company Tab */}
                  <OverlayTrigger placement="bottom" overlay={
                    <Tooltip className="custom-tooltip">
                      {userCompanies.length > 0 ? 'My Companies' : 'Create Company'}
                    </Tooltip>
                  }>
                    <div 
                      className="fw-medium nav-icon-item company-tab"
                      style={{ cursor: 'pointer' }}
                      onClick={handleCompanyDashboardClick}
                    >
                      <Building size={22} />
                      {userCompanies.length > 0 ? (
                        <span className="company-count-badge">{userCompanies.length}</span>
                      ) : (
                        <span className="plus-badge">+</span>
                      )}
                    </div>
                  </OverlayTrigger>

                  {/* User Profile Dropdown */}
                  <div ref={profileDropdownRef} className="position-relative">
                    <div
                      className="d-flex align-items-center gap-2 profile-dropdown-trigger"
                      style={{ cursor: 'pointer' }}
                      onClick={toggleProfileDropdown}
                    >
                      <div className="profile-avatar-container">
                        {user.profileImage ? (
                          <img
                            src={getProfileImageUrl(user.profileImage)}
                            alt={user.name}
                            className="profile-avatar"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const initialsDiv = target.parentElement?.querySelector('.profile-initials');
                              if (initialsDiv) {
                                (initialsDiv as HTMLElement).style.display = 'flex';
                              }
                            }}
                          />
                        ) : null}
                        
                        <div className="profile-initials">
                          {getUserInitials(user.name)}
                        </div>
                      </div>
                      <ChevronDown size={16} className="text-dark" />
                    </div>

                    {/* Profile Dropdown Menu */}
                    {showProfileDropdown && (
                      <div className="profile-dropdown-menu">
                        <div className="profile-dropdown-header">
                          <div className="d-flex align-items-center mb-3">
                            <div className="profile-avatar-large me-3">
                              {user.profileImage ? (
                                <img
                                  src={getProfileImageUrl(user.profileImage)}
                                  alt={user.name}
                                  className="profile-avatar"
                                />
                              ) : (
                                <div className="profile-initials-large">
                                  {getUserInitials(user.name)}
                                </div>
                              )}
                            </div>
                            <div>
                              <h6 className="fw-bold mb-1 text-dark">{user.name}</h6>
                              <p className="text-muted small mb-0">{user.email}</p>
                              <Badge bg="primary" className="mt-1">
                                {user.role || 'User'}
                              </Badge>
                            </div>
                          </div>
                          <Button
                            variant="outline-primary"
                            size="sm"
                            className="w-100 rounded-pill profile-view-btn"
                            onClick={handleProfileClick}
                          >
                            <User size={16} className="me-2" />
                            View Profile
                          </Button>
                        </div>

                        {/* Quick Links */}
                        <div className="profile-dropdown-section">
                          <h6 className="fw-semibold mb-2 text-dark">Quick Links</h6>
                          <div className="d-flex flex-column gap-1">
                            <div 
                              className="profile-menu-item"
                              onClick={handleAppliedJobsClick}
                            >
                              <FileCheck size={18} className="me-3 text-primary" />
                              <span className="text-dark">Applied Jobs</span>
                            </div>
                            
                            <div 
                              className="profile-menu-item"
                              onClick={() => {
                                router.push(`/profile/${user._id}/saved`);
                                setShowProfileDropdown(false);
                              }}
                            >
                              <Bookmark size={18} className="me-3 text-primary" />
                              <span className="text-dark">Saved Jobs</span>
                            </div>
                          </div>
                        </div>

                        {/* My Companies Section */}
                        <div className="profile-dropdown-section">
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <h6 className="fw-semibold mb-0 text-dark">My Companies</h6>
                            <span className="badge bg-primary-gradient">{userCompanies.length}</span>
                          </div>
                          
                          {userCompanies.length > 0 ? (
                            <div className="mb-3">
                              {userCompanies.slice(0, 3).map((company) => (
                                <div
                                  key={company._id}
                                  className="company-item"
                                  onClick={() => handleCompanyClick(company._id)}
                                >
                                  {company.logo ? (
                                    <img
                                      src={getProfileImageUrl(company.logo)}
                                      alt={company.name}
                                      className="company-logo"
                                    />
                                  ) : (
                                    <div className="company-logo-placeholder">
                                      {getUserInitials(company.name)}
                                    </div>
                                  )}
                                  <div className="company-info">
                                    <div className="fw-medium text-dark">{company.name}</div>
                                    {company.industry && (
                                      <div className="small text-muted">{company.industry}</div>
                                    )}
                                  </div>
                                  <ExternalLink size={14} className="text-muted ms-auto" />
                                </div>
                              ))}
                              
                              {userCompanies.length > 3 && (
                                <div className="text-center mt-2">
                                  <Button
                                    variant="link"
                                    size="sm"
                                    className="text-primary text-decoration-none p-0 view-all-companies"
                                    onClick={handleViewAllCompanies}
                                  >
                                    View all {userCompanies.length} companies
                                  </Button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-center py-3">
                              <Building size={32} className="text-muted mb-2" />
                              <p className="text-muted small mb-2">You haven't created any companies yet</p>
                              <Button
                                variant="primary"
                                size="sm"
                                className="rounded-pill create-company-btn"
                                onClick={handleCreateCompany}
                              >
                                <PlusCircle size={14} className="me-2" />
                                Create Company
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* Account Settings */}
                        <div className="profile-dropdown-section">
                          <h6 className="fw-semibold mb-2 text-dark">Account</h6>
                          <div className="d-flex flex-column gap-1">
                            {[
                              { path: `/profile/${user._id}/settings`, label: 'Settings & Privacy', icon: Settings },
                              { path: `/profile/${user._id}/invitations`, label: 'Invitations', icon: UserPlus },
                              { path: `/profile/${user._id}/documents`, label: 'My Documents', icon: FileText }
                            ].map((item, index) => (
                              <div 
                                key={index}
                                className="profile-menu-item"
                                onClick={() => {
                                  router.push(item.path);
                                  setShowProfileDropdown(false);
                                }}
                              >
                                <item.icon size={18} className="me-3 text-primary" />
                                <span className="text-dark">{item.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Logout Section */}
                        <div className="profile-dropdown-footer">
                          <Button
                            variant="outline-danger"
                            size="sm"
                            className="w-100 logout-btn"
                            onClick={handleLogout}
                          >
                            <LogOut size={16} className="me-2" />
                            Logout
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* Not Authenticated - Show Login/Signup */
                <div className="d-flex gap-2">
                  <Link href="/login">
                    <Button variant="outline-primary" className="px-4 rounded-pill signin-btn">
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/signup">
                    <Button variant="primary" className="px-4 rounded-pill signup-btn">
                      Sign Up
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      {/* Add custom event dispatcher to global window for auth synchronization */}
      <script dangerouslySetInnerHTML={{
        __html: `
          if (typeof window !== 'undefined') {
            // Dispatch auth change event when storage changes
            const originalSetItem = localStorage.setItem;
            const originalRemoveItem = localStorage.removeItem;
            
            localStorage.setItem = function(key, value) {
              originalSetItem.apply(this, arguments);
              if (key === 'token' || key === 'user') {
                window.dispatchEvent(new Event('authChange'));
              }
            };
            
            localStorage.removeItem = function(key) {
              originalRemoveItem.apply(this, arguments);
              if (key === 'token' || key === 'user') {
                window.dispatchEvent(new Event('authChange'));
              }
            };
          }
        `
      }} />

            <style jsx global>{`
        /* Global Styles */
        :root {
          --primary-color: #0A66C2;
          --primary-dark: #004182;
          --primary-light: #83B1DB;
          --gradient-primary: linear-gradient(135deg, #0A66C2 0%, #004182 100%);
          --gradient-secondary: linear-gradient(135deg, #FA8C16 0%, #FA541C 100%);
          --glass-bg: rgba(255, 255, 255, 0.95);
          --glass-border: #D4D2CE;
          --shadow-sm: rgba(0, 0, 0, 0.08);
          --shadow-md: 0 4px 20px rgba(0, 0, 0, 0.12);
          --shadow-lg: 0 10px 40px rgba(0, 0, 0, 0.15);
          --bg-main: #FFFFFF;
          --bg-card: #F3F2EF;
          --bg-hover: #E8E6E1;
          --text-heading: #000000;
          --text-body: #191919;
          --text-secondary: #666666;
          --text-success: #057642;
        }

        .navbar-glass {
          background: var(--glass-bg) !important;
          border-bottom: 1px solid var(--glass-border) !important;
          transition: all 0.3s ease;
          box-shadow: var(--shadow-sm);
        }

        .navbar-scrolled {
          box-shadow: var(--shadow-md);
        }

        .navbar-toggler {
          background: transparent !important;
          border: none !important;
          padding: 8px !important;
        }

        .navbar-toggler:focus {
          box-shadow: none !important;
        }

        .navbar-toggler-icon {
          background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 30 30'%3e%3cpath stroke='rgba(10, 102, 194, 1)' stroke-linecap='round' stroke-miterlimit='10' stroke-width='2' d='M4 7h22M4 15h22M4 23h22'/%3e%3c/svg%3e") !important;
        }

        .text-gradient {
          color: var(--primary-color);
        }

        .logo-icon {
          background: linear-gradient(135deg, #0A66C2 0%, #004182 100%);
          padding: 10px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .logo-text {
          font-weight: 700;
          letter-spacing: -0.5px;
          color: var(--primary-color);
        }

        .nav-icon-item {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border-radius: 12px;
          transition: all 0.3s ease;
          color: var(--text-secondary);
          position: relative;
        }

        .nav-icon-item:hover {
          background: #E8E6E1;
          color: var(--primary-color);
          transform: translateY(-2px);
        }

        .nav-icon-item.active {
          background: var(--gradient-primary);
          color: white;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
        }

        .badge-notification {
          background: var(--gradient-secondary) !important;
          color: white !important;
          width: 20px;
          height: 20px;
          font-size: 10px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          transform: translate(40%, -40%);
          border: 2px solid white;
          box-shadow: 0 2px 6px rgba(239, 68, 68, 0.3);
        }

        .company-tab {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: rgba(99, 102, 241, 0.08);
          color: var(--primary-color);
          transition: all 0.3s ease;
        }

        .company-tab:hover {
          background: rgba(99, 102, 241, 0.15);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
        }

        .company-count-badge, .plus-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          border-radius: 50%;
          font-size: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          border: 2px solid white;
        }

        .company-count-badge {
          background: var(--gradient-secondary);
          color: white;
          width: 18px;
          height: 18px;
        }

        .plus-badge {
          background: var(--gradient-primary);
          color: white;
          width: 16px;
          height: 16px;
        }

        /* Profile Dropdown */
        .profile-dropdown-trigger {
          transition: all 0.3s ease;
        }

        .profile-dropdown-trigger:hover {
          transform: translateY(-2px);
        }

        .profile-avatar-container {
          position: relative;
          width: 44px;
          height: 44px;
          border-radius: 12px;
          overflow: hidden;
          background: var(--gradient-primary);
          border: 3px solid white;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .profile-avatar {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .profile-initials {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 700;
          font-size: 14px;
        }

        .profile-dropdown-menu {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 12px;
          width: 320px;
          background: white;
          border-radius: 16px;
          box-shadow: var(--shadow-lg);
          border: 1px solid rgba(0, 0, 0, 0.05);
          overflow: hidden;
          z-index: 1050;
          animation: slideDown 0.3s ease;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .profile-dropdown-header {
          padding: 20px;
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%);
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        }

        .profile-avatar-large {
          width: 56px;
          height: 56px;
          border-radius: 14px;
          overflow: hidden;
          background: var(--gradient-primary);
          border: 4px solid white;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .profile-initials-large {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 700;
          font-size: 18px;
        }

        .profile-view-btn {
          border: 2px solid var(--primary-color) !important;
          color: var(--primary-color) !important;
          font-weight: 600 !important;
          transition: all 0.3s ease !important;
        }

        .profile-view-btn:hover {
          background: var(--gradient-primary) !important;
          color: white !important;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
        }

        .profile-dropdown-section {
          padding: 20px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        }

        .bg-primary-gradient {
          background: var(--gradient-primary) !important;
        }

        .company-item {
          display: flex;
          align-items: center;
          padding: 12px;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-bottom: 8px;
        }

        .company-item:hover {
          background: rgba(99, 102, 241, 0.08);
          transform: translateX(4px);
        }

        .company-logo {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          object-fit: cover;
          margin-right: 12px;
          border: 2px solid white;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .company-logo-placeholder {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: var(--gradient-primary);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 12px;
          margin-right: 12px;
        }

        .company-info {
          flex: 1;
        }

        .view-all-companies {
          font-weight: 600 !important;
          color: var(--primary-color) !important;
          transition: all 0.3s ease !important;
        }

        .view-all-companies:hover {
          color: var(--primary-dark) !important;
          transform: translateX(4px);
        }

        .create-company-btn {
          background: var(--gradient-primary) !important;
          border: none !important;
          font-weight: 600 !important;
          transition: all 0.3s ease !important;
        }

        .create-company-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(99, 102, 241, 0.4);
        }

        .profile-menu-item {
          display: flex;
          align-items: center;
          padding: 12px;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .profile-menu-item:hover {
          background: rgba(99, 102, 241, 0.08);
          padding-left: 16px !important;
          color: var(--primary-color);
        }

        .profile-dropdown-footer {
          padding: 16px 20px;
          background: rgba(0, 0, 0, 0.02);
        }

        .logout-btn {
          border: 2px solid #ef4444 !important;
          color: #ef4444 !important;
          font-weight: 600 !important;
          transition: all 0.3s ease !important;
        }

        .logout-btn:hover {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%) !important;
          color: white !important;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
        }

        .signin-btn {
          border: 2px solid var(--primary-color) !important;
          color: var(--primary-color) !important;
          font-weight: 600 !important;
          transition: all 0.3s ease !important;
        }

        .signin-btn:hover {
          background: var(--gradient-primary) !important;
          color: white !important;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
        }

        .signup-btn {
          background: var(--gradient-primary) !important;
          border: none !important;
          font-weight: 600 !important;
          transition: all 0.3s ease !important;
        }

        .signup-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(99, 102, 241, 0.4);
        }

        .custom-tooltip .tooltip-inner {
          background: rgba(0, 0, 0, 0.9) !important;
          color: white !important;
          font-size: 12px !important;
          padding: 6px 12px !important;
          border-radius: 8px !important;
          font-weight: 500 !important;
        }

        .custom-tooltip .tooltip-arrow {
          display: none !important;
        }

        /* Mobile */
        @media (max-width: 992px) {
          .navbar-glass {
            background: white !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
          }

          .navbar-collapse {
            background: white;
            padding: 20px;
            border-radius: 0 0 20px 20px;
            margin-top: 10px;
            box-shadow: var(--shadow-md);
          }

          .nav-icon-item, .company-tab {
            width: 40px;
            height: 40px;
            margin: 4px;
          }

          .profile-dropdown-menu {
            position: fixed !important;
            top: 70px !important;
            right: 20px !important;
            left: 20px !important;
            width: auto !important;
            margin: 0 !important;
          }
        }

        @media (max-width: 768px) {
          .navbar-brand {
            font-size: 1.2rem !important;
          }

          .logo-icon {
            padding: 8px;
          }

          .logo-icon svg {
            width: 20px;
            height: 20px;
          }

          .nav-icon-item {
            width: 36px;
            height: 36px;
          }

          .company-tab {
            width: 36px;
            height: 36px;
          }

          .profile-avatar-container {
            width: 36px;
            height: 36px;
          }
        }
      `}</style>
    </>
  );
}
