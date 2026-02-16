'use client';

import { useState, useEffect, use } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Container, 
  Row, 
  Col, 
  Card, 
  Badge, 
  Button,
  Tab,
  Nav,
  ListGroup,
  ProgressBar,
  Alert,
  Spinner,
  Dropdown,
  Modal,
  Form
} from 'react-bootstrap';
import { 
  FaLinkedin, 
  FaTwitter, 
  FaFacebook, 
  FaInstagram, 
  FaGlobe, 
  FaMapMarkerAlt, 
  FaPhone, 
  FaEnvelope,
  FaUsers,
  FaCalendarAlt,
  FaBuilding,
  FaIndustry,
  FaBriefcase,
  FaExternalLinkAlt,
  FaShareAlt,
  FaBookmark,
  FaRegBookmark,
  FaStar,
  FaEye,
  FaPlus,
  FaCheck,
  FaCrown,
  FaUserShield,
  FaChartLine,
  FaSearch,
  FaChartBar,
  FaUserCheck,
  FaFileAlt,
  FaArrowUp,
  FaUserFriends,
  FaEdit,
  FaEllipsisV,
  FaTrash,
  FaFlag,
  FaExclamationTriangle,
  FaLock
} from 'react-icons/fa';
import { toast, Toaster } from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';

// Import components
import LogoAndCover from '../../../components/company/LogoAndCover';
import OverviewTab from '../../../components/company/OverviewTab';
import JobsTab from '../../../components/company/JobsTab';
import PeopleTab from '../../../components/company/PeopleTab';
import InsightsTab from '../../../components/company/InsightsTab';

const API_BASE_URL = 'http://localhost:5000/api';

interface TeamMember {
  user: {
    _id: string;
    name: string;
    email: string;
    profileImage?: string;
    role: string;
  };
  role: 'admin' | 'recruiter' | 'manager';
  addedAt: string;
}

interface Job {
  _id: string;
  title: string;
  location: string;
  employmentType: string;
  salary?: {
    min: number;
    max: number;
    currency: string;
  };
  createdAt: string;
  status: string;
}

interface Company {
  _id: string;
  name: string;
  email: string;
  description: string;
  website: string;
  location: string;
  industry: string;
  size: string;
  foundedYear: number;
  logo: string;
  coverImage: string;
  phone: string;
  socialLinks: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
    instagram?: string;
  };
  owner: {
    _id: string;
    name: string;
    email: string;
    profileImage?: string;
  };
  teamMembers: TeamMember[];
  jobs: Job[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  visibility: 'public' | 'private' | 'unlisted';
  verificationStatus: 'pending' | 'verified' | 'rejected';
}

interface SimilarCompany {
  _id: string;
  name: string;
  industry: string;
  location: string;
  logo: string;
  followers: number;
  size: string;
  description: string;
  similarity: number;
  matchType: 'exact' | 'industry' | 'location' | 'other';
}

interface CompanyStats {
  followers: number;
  pageViews: number;
  uniqueViews: number;
  engagement: number;
  jobs: number;
  totalJobs: number;
  teamMembers: number;
  totalApplications: number;
  recentApplications: number;
  trends: {
    dailyViews: Array<{
      date: string;
      totalViews: number;
      uniqueViews: number;
    }>;
  };
}

interface SearchStats {
  sameIndustrySameCity: number;
  sameIndustryDifferentCity: number;
  sameCityDifferentIndustry: number;
  otherCompanies: number;
  totalFound: number;
}

export default function CompanyProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const { id } = unwrappedParams;
  
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isFollowing, setIsFollowing] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [stats, setStats] = useState<CompanyStats>({
    followers: 0,
    pageViews: 0,
    uniqueViews: 0,
    engagement: 0,
    jobs: 0,
    totalJobs: 0,
    teamMembers: 0,
    totalApplications: 0,
    recentApplications: 0,
    trends: { dailyViews: [] }
  });
  const [logoError, setLogoError] = useState(false);
  const [coverError, setCoverError] = useState(false);
  const [similarCompanies, setSimilarCompanies] = useState<SimilarCompany[]>([]);
  const [similarCompaniesLoading, setSimilarCompaniesLoading] = useState(false);
  const [searchStats, setSearchStats] = useState<SearchStats | null>(null);
  
  // New states for enhanced features
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [isReporting, setIsReporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  // Message modal state and form
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageSubmitting, setMessageSubmitting] = useState(false);
  const [messageForm, setMessageForm] = useState({ name: '', email: '', subject: '', message: '' });

  useEffect(() => {
    if (!authLoading) {
      fetchCompanyDetails();
      fetchCompanyStats();
      if (isAuthenticated) {
        checkUserActions();
      }
    }
  }, [id, isAuthenticated, authLoading]);

  useEffect(() => {
    if (company) {
      fetchSimilarCompanies();
    }
  }, [company]);

  const checkAccessPermission = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return true; // Public access if no token
      
      const response = await fetch(`${API_BASE_URL}/company/${id}/check-access`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        if (response.status === 403) {
          setAccessDenied(true);
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error('Error checking access:', error);
      return true;
    }
  };

  const getImageUrl = (imagePath: string | undefined | null): string => {
    if (!imagePath || imagePath.trim() === '') {
      return '';
    }
    
    if (imagePath.startsWith('http://') || 
        imagePath.startsWith('https://') || 
        imagePath.startsWith('data:')) {
      return imagePath;
    }
    
    const normalizedPath = imagePath.replace(/\\/g, '/');
    
    if (normalizedPath.startsWith('uploads/')) {
      return `${API_BASE_URL.replace('/api', '')}/${normalizedPath}`;
    }
    
    if (!normalizedPath.includes('/')) {
      return `${API_BASE_URL.replace('/api', '')}/uploads/${normalizedPath}`;
    }
    
    return `${API_BASE_URL.replace('/api', '')}/${normalizedPath}`;
  };

  const getProfileImageUrl = (profileImage?: string): string => {
    if (!profileImage) return '';
    return getImageUrl(profileImage);
  };

  const fetchCompanyDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      setLogoError(false);
      setCoverError(false);
      setAccessDenied(false);
      
      // Check access permission first
      const hasAccess = await checkAccessPermission();
      if (!hasAccess) {
        setLoading(false);
        return;
      }
      
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${API_BASE_URL}/company/${id}`, {
        headers
      });
      
      if (!response.ok) {
        if (response.status === 403) {
          setAccessDenied(true);
          throw new Error('You do not have permission to view this company profile');
        }
        if (response.status === 404) {
          throw new Error('Company not found');
        }
        throw new Error('Failed to fetch company details');
      }
      
      const data = await response.json();
      console.log('Company data received:', data.company);
      setCompany(data.company);
    } catch (error: any) {
      console.error('Error fetching company:', error);
      setError(error.message || 'Failed to load company details');
      toast.error(error.message || 'Failed to load company details');
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanyStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${API_BASE_URL}/company/${id}/stats`, {
        headers
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Company stats (accurate):', data);
        setStats({
          followers: data.followers || 0,
          pageViews: data.pageViews || 0,
          uniqueViews: data.uniqueViews || 0,
          engagement: data.engagement || 0,
          jobs: data.jobs || 0,
          totalJobs: data.totalJobs || 0,
          teamMembers: data.teamMembers || 0,
          totalApplications: data.totalApplications || 0,
          recentApplications: data.recentApplications || 0,
          trends: data.trends || { dailyViews: [] }
        });
      }
    } catch (error) {
      console.error('Error fetching accurate stats:', error);
    }
  };

  const fetchSimilarCompanies = async () => {
    try {
      if (!company) return;
      
      setSimilarCompaniesLoading(true);
      
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(
        `${API_BASE_URL}/company/similar?industry=${encodeURIComponent(company.industry)}&location=${encodeURIComponent(company.location)}&exclude=${company._id}&limit=6`,
        { headers }
      );
      
      if (response.ok) {
        const data = await response.json();
        console.log('Similar companies (accurate):', data);
        
        if (data.companies && data.companies.length > 0) {
          setSimilarCompanies(data.companies);
          setSearchStats(data.searchStats);
        } else {
          setSimilarCompanies([]);
          setSearchStats(null);
        }
      } else {
        setSimilarCompanies([]);
        setSearchStats(null);
      }
    } catch (error) {
      console.error('Error fetching similar companies:', error);
      setSimilarCompanies([]);
      setSearchStats(null);
    } finally {
      setSimilarCompaniesLoading(false);
    }
  };

  const checkUserActions = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const [followResponse, bookmarkResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/company/${id}/follow/check`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/company/${id}/bookmark/check`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);
      
      if (followResponse.ok) {
        const data = await followResponse.json();
        setIsFollowing(data.isFollowing);
      }
      
      if (bookmarkResponse.ok) {
        const data = await bookmarkResponse.json();
        setIsBookmarked(data.isBookmarked);
      }
    } catch (error) {
      console.error('Error checking user actions:', error);
    }
  };

  const handleEditClick = () => {
    if (!isAuthenticated) {
      toast.error('Please login to edit company profile');
      router.push(`/login?redirect=/company/${id}/edit`);
      return;
    }
    
    if (!user || user._id !== company?.owner._id) {
      toast.error('You are not authorized to edit this company');
      return;
    }
    
    router.push(`/company/${id}/edit`);
  };

  const handleFollow = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to follow companies');
      router.push(`/login?redirect=/company/${id}`);
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/company/${id}/follow`, {
        method: isFollowing ? 'DELETE' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setIsFollowing(!isFollowing);
        setStats(prev => ({
          ...prev,
          followers: data.followers || (isFollowing ? prev.followers - 1 : prev.followers + 1)
        }));
        toast.success(isFollowing ? 'Unfollowed company' : 'Following company');
      }
    } catch (error) {
      console.error('Error following company:', error);
      toast.error('Failed to update follow status');
    }
  };

  const handleBookmark = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to bookmark companies');
      router.push(`/login?redirect=/company/${id}`);
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/company/${id}/bookmark`, {
        method: isBookmarked ? 'DELETE' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        setIsBookmarked(!isBookmarked);
        toast.success(isBookmarked ? 'Removed from bookmarks' : 'Added to bookmarks');
      }
    } catch (error) {
      console.error('Error bookmarking company:', error);
      toast.error('Failed to update bookmark');
    }
  };

  const handleSendMessage = async () => {
    // For authenticated users, name and email are auto-filled; just validate subject and message
    const nameToUse = isAuthenticated && user ? user.name || '' : messageForm.name.trim();
    const emailToUse = isAuthenticated && user ? user.email || '' : messageForm.email.trim();

    if (!messageForm.subject.trim() || !messageForm.message.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    if (!isAuthenticated && (!nameToUse || !emailToUse)) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setMessageSubmitting(true);
      const token = localStorage.getItem('token');
      const body = {
        name: nameToUse,
        email: emailToUse,
        subject: messageForm.subject.trim(),
        message: messageForm.message.trim(),
        companyId: id
      };

      const res = await fetch(`${API_BASE_URL}/contact-us`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        toast.success(`Message sent to ${company?.name || 'company'}`);
        setShowMessageModal(false);
        setMessageForm({ name: isAuthenticated && user ? user.name || '' : '', email: isAuthenticated && user ? user.email || '' : '', subject: '', message: '' });
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setMessageSubmitting(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: company?.name,
        text: `Check out ${company?.name} on our platform`,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  const handleReport = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to report this company');
      router.push(`/login?redirect=/company/${id}`);
      return;
    }
    
    if (!reportReason.trim()) {
      toast.error('Please select a reason for reporting');
      return;
    }
    
    setIsReporting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/company/${id}/report`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reason: reportReason,
          details: reportDetails
        })
      });
      
      if (response.ok) {
        toast.success('Report submitted successfully');
        setShowReportModal(false);
        setReportReason('');
        setReportDetails('');
      } else {
        throw new Error('Failed to submit report');
      }
    } catch (error) {
      console.error('Error reporting company:', error);
      toast.error('Failed to submit report');
    } finally {
      setIsReporting(false);
    }
  };

  const handleDeleteCompany = async () => {
    if (!isAuthenticated || !company) {
      toast.error('Authentication required');
      return;
    }
    
    if (user?._id !== company.owner._id) {
      toast.error('You are not authorized to delete this company');
      return;
    }
    
    setIsDeleting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/company/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        toast.success('Company deleted successfully');
        router.push('/companies');
      } else {
        throw new Error('Failed to delete company');
      }
    } catch (error) {
      console.error('Error deleting company:', error);
      toast.error('Failed to delete company');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const getSizeLabel = (size: string) => {
    const labels: Record<string, string> = {
      '1-10': '1-10 employees',
      '11-50': '11-50 employees',
      '51-200': '51-200 employees',
      '201-500': '201-500 employees',
      '501-1000': '501-1,000 employees',
      '1000+': '1,000+ employees'
    };
    return labels[size] || size;
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'owner':
        return <Badge bg="warning" className="mb-2"><FaCrown className="me-1" /> Owner</Badge>;
      case 'admin':
        return <Badge bg="danger" className="mb-2"><FaUserShield className="me-1" /> Admin</Badge>;
      case 'manager':
        return <Badge bg="info" className="mb-2">Manager</Badge>;
      case 'recruiter':
        return <Badge bg="success" className="mb-2">Recruiter</Badge>;
      default:
        return <Badge bg="secondary" className="mb-2">{role}</Badge>;
    }
  };

  const getVerificationBadge = () => {
    if (!company) return null;
    
    switch (company.verificationStatus) {
      case 'verified':
        return (
          <Badge bg="success" className="ms-2">
            <FaCheck className="me-1" />
            Verified
          </Badge>
        );
      case 'pending':
        return (
          <Badge bg="warning" className="ms-2">
            Pending Verification
          </Badge>
        );
      case 'rejected':
        return (
          <Badge bg="danger" className="ms-2">
            Verification Failed
          </Badge>
        );
      default:
        return null;
    }
  };

  const getUniqueTeamMembers = () => {
    if (!company) return [];
    
    const ownerId = company.owner._id;
    const seen = new Set();
    
    return company.teamMembers
      .filter(member => member.user._id !== ownerId)
      .filter(member => {
        const duplicate = seen.has(member.user._id);
        seen.add(member.user._id);
        return !duplicate;
      });
  };

  const getActiveJobsCount = () => {
    if (!company?.jobs) return 0;
    return company.jobs.filter(job => job.status === 'active').length;
  };

  const getMatchTypeBadge = (matchType: string) => {
    switch (matchType) {
      case 'exact':
        return <Badge bg="success">Exact Match</Badge>;
      case 'industry':
        return <Badge bg="primary">Same Industry</Badge>;
      case 'location':
        return <Badge bg="info">Same Location</Badge>;
      case 'other':
        return <Badge bg="secondary">Other</Badge>;
      default:
        return null;
    }
  };

  const getEngagementColor = (engagement: number) => {
    if (engagement >= 70) return 'success';
    if (engagement >= 40) return 'warning';
    return 'danger';
  };

  const calculateProfileCompleteness = (company: Company) => {
    let score = 0;
    const fields = [
      company.logo,
      company.coverImage,
      company.description,
      company.website,
      company.phone,
      company.socialLinks?.linkedin,
      company.foundedYear
    ];
    
    fields.forEach(field => {
      if (field) score += 100 / fields.length;
    });
    
    return Math.round(score);
  };

  const renderSimilarCompanies = () => {
    if (similarCompaniesLoading) {
      return (
        <div className="text-center py-4">
          <Spinner animation="border" size="sm" variant="primary" />
          <div className="mt-2 text-muted small">Finding similar companies...</div>
        </div>
      );
    }
    
    if (similarCompanies.length > 0) {
      return (
        <>
          {searchStats && (
            <div className="mb-3">
              <div className="d-flex flex-wrap gap-2 mb-2">
                <Badge bg="success" pill>
                  {searchStats.sameIndustrySameCity} exact matches
                </Badge>
                <Badge bg="primary" pill>
                  {searchStats.sameIndustryDifferentCity} same industry
                </Badge>
                <Badge bg="info" pill>
                  {searchStats.sameCityDifferentIndustry} same location
                </Badge>
                <Badge bg="secondary" pill>
                  {searchStats.otherCompanies} others
                </Badge>
              </div>
              <small className="text-muted">
                Found {searchStats.totalFound} similar companies
              </small>
            </div>
          )}
          
          <ListGroup variant="flush">
            {similarCompanies.map(similarCompany => (
              <ListGroup.Item 
                key={similarCompany._id} 
                className="border-0 py-3 cursor-pointer hover-bg-light"
                onClick={() => router.push(`/company/${similarCompany._id}`)}
              >
                <div className="d-flex align-items-start">
                  <div 
                    className="rounded-circle me-3 d-flex align-items-center justify-content-center"
                    style={{ 
                      width: '48px', 
                      height: '48px',
                      backgroundColor: '#f8f9fa',
                      overflow: 'hidden',
                      flexShrink: 0
                    }}
                  >
                    {similarCompany.logo ? (
                      <img
                        src={getImageUrl(similarCompany.logo)}
                        alt={similarCompany.name}
                        className="rounded-circle object-fit-cover"
                        style={{ width: '100%', height: '100%' }}
                      />
                    ) : (
                      <FaBuilding className="text-primary" />
                    )}
                  </div>
                  <div className="flex-grow-1">
                    <div className="d-flex justify-content-between align-items-start mb-1">
                      <h6 className="fw-bold mb-0">{similarCompany.name}</h6>
                      <div className="d-flex align-items-center">
                        <Badge bg="light" text="dark" className="me-2">
                          {similarCompany.similarity}% match
                        </Badge>
                        {getMatchTypeBadge(similarCompany.matchType)}
                      </div>
                    </div>
                    <div className="d-flex flex-wrap gap-2 mb-2">
                      <Badge bg="light" text="dark" className="small">
                        <FaIndustry className="me-1" size={10} />
                        {similarCompany.industry}
                      </Badge>
                      <Badge bg="light" text="dark" className="small">
                        <FaMapMarkerAlt className="me-1" size={10} />
                        {similarCompany.location}
                      </Badge>
                      {similarCompany.size && (
                        <Badge bg="light" text="dark" className="small">
                          <FaUsers className="me-1" size={10} />
                          {getSizeLabel(similarCompany.size)}
                        </Badge>
                      )}
                    </div>
                    <div className="d-flex justify-content-between align-items-center">
                      <small className="text-muted">
                        <FaUsers className="me-1" size={10} />
                        {formatNumber(similarCompany.followers)} followers
                      </small>
                      <Button 
                        variant="outline-primary" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/company/${similarCompany._id}`);
                        }}
                      >
                        View
                      </Button>
                    </div>
                  </div>
                </div>
              </ListGroup.Item>
            ))}
          </ListGroup>
          
          <div className="mt-3">
            <Button 
              variant="outline-primary" 
              className="w-100 rounded-pill"
              onClick={() => router.push(`/companies?industry=${encodeURIComponent(company?.industry || '')}&location=${encodeURIComponent(company?.location || '')}`)}
            >
              <FaSearch className="me-2" />
              Discover More Companies
            </Button>
          </div>
        </>
      );
    } else {
      return (
        <div className="text-center py-4">
          <FaSearch size={32} className="text-muted mb-3" />
          <h6 className="fw-bold mb-2">No similar companies found</h6>
          <p className="text-muted small mb-3">
            We couldn't find companies similar to {company?.name} in our database.
          </p>
          <Button 
            variant="outline-primary" 
            size="sm"
            className="me-2"
            onClick={() => router.push('/companies')}
          >
            Browse All Companies
          </Button>
          <Button 
            variant="outline-secondary" 
            size="sm"
            onClick={() => company && fetchSimilarCompanies()}
          >
            Try Again
          </Button>
        </div>
      );
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  if (accessDenied) {
    return (
      <Container className="py-5">
        <Alert variant="danger">
          <Alert.Heading>
            <FaLock className="me-2" />
            Access Denied
          </Alert.Heading>
          <p>
            This company profile is private and requires special permission to view.
            Please contact the company owner for access.
          </p>
          <div className="d-flex gap-2">
            <Button variant="outline-danger" onClick={() => router.push('/companies')}>
              Browse Public Companies
            </Button>
            {!isAuthenticated && (
              <Button variant="primary" onClick={() => router.push('/login')}>
                Login to Continue
              </Button>
            )}
          </div>
        </Alert>
      </Container>
    );
  }

  if (error || !company) {
    return (
      <Container className="py-5">
        <Alert variant="danger">
          <Alert.Heading>Error loading company</Alert.Heading>
          <p>{error || 'Company not found'}</p>
          <Button variant="outline-danger" onClick={() => router.push('/companies')}>
            Browse Companies
          </Button>
        </Alert>
      </Container>
    );
  }

  const teamMembers = getUniqueTeamMembers();
  const activeJobsCount = getActiveJobsCount();
  const isOwner = isAuthenticated && user?._id === company.owner._id;
  const isTeamMember = isAuthenticated && company.teamMembers.some(m => m.user._id === user?._id);
  const canEdit = isOwner || (isTeamMember && company.teamMembers.find(m => m.user._id === user?._id)?.role === 'admin');
  const canViewDetailedInsights = isOwner || (isTeamMember && company.teamMembers.find(m => m.user._id === user?._id)?.role === 'admin');
  const showInsightsTab = canViewDetailedInsights;

  return (
    <>
      <Toaster position="top-right" />
      
      {/* Report Modal */}
      <Modal show={showReportModal} onHide={() => setShowReportModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            <FaExclamationTriangle className="me-2 text-warning" />
            Report Company
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Reason for reporting</Form.Label>
              <Form.Select 
                value={reportReason} 
                onChange={(e) => setReportReason(e.target.value)}
                required
              >
                <option value="">Select a reason</option>
                <option value="spam">Spam or misleading content</option>
                <option value="fake">Fake company or scam</option>
                <option value="harassment">Harassment or inappropriate content</option>
                <option value="privacy">Privacy violation</option>
                <option value="other">Other</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Additional details (optional)</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder="Please provide more details about your report..."
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowReportModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="warning" 
            onClick={handleReport}
            disabled={isReporting || !reportReason.trim()}
          >
            {isReporting ? <Spinner size="sm" /> : 'Submit Report'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title className="text-danger">
            <FaTrash className="me-2" />
            Delete Company
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="danger">
            <Alert.Heading>Warning: This action cannot be undone!</Alert.Heading>
            <p>
              You are about to permanently delete <strong>{company.name}</strong>. 
              This will remove:
            </p>
            <ul>
              <li>All company information</li>
              <li>All job postings</li>
              <li>All team member associations</li>
              <li>All follower/bookmark data</li>
            </ul>
            <p className="mb-0">Are you absolutely sure you want to proceed?</p>
          </Alert>
          <Form>
            <Form.Group>
              <Form.Label>
                Type <strong>DELETE</strong> to confirm:
              </Form.Label>
              <Form.Control
                type="text"
                placeholder="Type DELETE here"
                onChange={(e) => {
                  if (e.target.value === 'DELETE') {
                    // Enable delete button
                  }
                }}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="danger" 
            onClick={handleDeleteCompany}
            disabled={isDeleting}
          >
            {isDeleting ? <Spinner size="sm" /> : 'Delete Permanently'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* LinkedIn-style Header */}
      <div className="bg-white border-bottom">
        <Container>
          {/* Logo and Cover Component */}
          <LogoAndCover
            company={company}
            logoError={logoError}
            coverError={coverError}
            getImageUrl={getImageUrl}
            setLogoError={setLogoError}
            setCoverError={setCoverError}
            canEdit={canEdit}
            onEditClick={handleEditClick}
          />
          
          {/* Company Header Info */}
          <div className="pt-5 pb-3" style={{ paddingTop: '80px' }}>
            <Row>
              <Col lg={8}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="d-flex justify-content-between align-items-start flex-wrap">
                    <div className="flex-grow-1">
                      <div className="d-flex align-items-center mb-2">
                        <h1 className="display-6 fw-bold mb-0 me-3">{company.name}</h1>
                        {getVerificationBadge()}
                        {company.visibility === 'private' && (
                          <Badge bg="secondary" className="ms-2">
                            <FaLock className="me-1" size={12} />
                            Private
                          </Badge>
                        )}
                      </div>
                      <p className="lead mb-3">{company.description}</p>
                      
                      <div className="d-flex flex-wrap gap-4 mb-4">
                        <Badge bg="light" text="dark" className="px-3 py-2 d-flex align-items-center">
                          <FaIndustry className="me-2" />
                          {company.industry}
                        </Badge>
                        <Badge bg="light" text="dark" className="px-3 py-2 d-flex align-items-center">
                          <FaMapMarkerAlt className="me-2" />
                          {company.location}
                        </Badge>
                        <Badge bg="light" text="dark" className="px-3 py-2 d-flex align-items-center">
                          <FaUsers className="me-2" />
                          {getSizeLabel(company.size)}
                        </Badge>
                        {company.foundedYear && (
                          <Badge bg="light" text="dark" className="px-3 py-2 d-flex align-items-center">
                            <FaCalendarAlt className="me-2" />
                            Founded {company.foundedYear}
                          </Badge>
                        )}
                        {isOwner && (
                          <Badge bg="success" className="px-3 py-2">
                            <FaCrown className="me-2" />
                            You own this company
                          </Badge>
                        )}
                        {isTeamMember && !isOwner && (
                          <Badge bg="info" className="px-3 py-2">
                            <FaUserShield className="me-2" />
                            Team Member
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="d-flex flex-wrap gap-2 mb-4 ">
                    <Button 
                      variant={isFollowing ? "outline-primary" : "primary"}
                      className="rounded-pill px-4 d-flex align-items-center"
                      onClick={handleFollow}
                    >
                      {isFollowing ? (
                        <>
                          <FaCheck className="me-2" />
                          Following ({formatNumber(stats.followers)})
                        </>
                      ) : (
                        <>
                          <FaPlus className="me-2" />
                          Follow ({formatNumber(stats.followers)})
                        </>
                      )}
                    </Button>
                    
                    <Button 
                      variant="outline-primary"
                      className="rounded-pill px-4"
                      onClick={() => setShowMessageModal(true)}
                    >
                      <FaEnvelope className="me-2" />
                      Message
                    </Button>
                    
                    <Button 
                      variant="outline-secondary"
                      className="rounded-pill px-4"
                      onClick={() => toast.success('Service request sent!')}
                    >
                      Request services
                    </Button>
                    
                    <Button 
                      variant={isBookmarked ? "warning" : "outline-warning"}
                      className="rounded-pill px-4"
                      onClick={handleBookmark}
                      title={isBookmarked ? "Remove bookmark" : "Bookmark"}
                    >
                      {isBookmarked ? <FaBookmark /> : <FaRegBookmark />}
                    </Button>
                    
                    <Button 
                      variant="outline-secondary"
                      className="rounded-pill px-4"
                      onClick={handleShare}
                    >
                      <FaShareAlt />
                    </Button>
                    
                    {canEdit && (
                      <Button
                        variant="success"
                        className="rounded-pill px-4"
                        onClick={() => router.push(`/company/${id}/post-job`)}
                      >
                        <FaBriefcase className="me-2" />
                        Post a Job
                      </Button>
                    )}
                    
                    {canEdit && (
                      <Button
                        variant="outline-primary"
                        className="rounded-pill px-4 d-flex align-items-center"
                        onClick={handleEditClick}
                      >
                        <FaEdit className="me-2" />
                        Edit Profile
                      </Button>
                    )}
                    <div className="mt-2 mt-sm-0">
                      <Dropdown>
                        <Dropdown.Toggle 
                          variant="outline-secondary" 
                          size="sm"
                          className="rounded-circle p-2"
                        >
                          <FaEllipsisV />
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                          {canEdit && (
                            <>
                              <Dropdown.Item onClick={handleEditClick}>
                                <FaEdit className="me-2" />
                                Edit Company
                              </Dropdown.Item>
                              <Dropdown.Divider />
                            </>
                          )}
                          <Dropdown.Item onClick={handleShare}>
                            <FaShareAlt className="me-2" />
                            Share
                          </Dropdown.Item>
                          <Dropdown.Item onClick={() => setShowReportModal(true)}>
                            <FaFlag className="me-2 text-warning" />
                            Report Company
                          </Dropdown.Item>
                          {isOwner && (
                            <>
                              <Dropdown.Divider />
                              <Dropdown.Item 
                                className="text-danger" 
                                onClick={() => setShowDeleteModal(true)}
                              >
                                <FaTrash className="me-2" />
                                Delete Company
                              </Dropdown.Item>
                            </>
                          )}
                        </Dropdown.Menu>
                      </Dropdown>
                    </div>
                  </div>
                </motion.div>
              </Col>
              
              <Col lg={4}>
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-light rounded-3 p-4"
                >
                  <h6 className="fw-bold mb-3">
                    <FaChartLine className="me-2" />
                    Company Insights
                  </h6>
                  
                  {canViewDetailedInsights ? (
                    // Show detailed insights for owners/admins
                    <>
                      <div className="d-flex justify-content-between mb-3">
                        <div className="text-center">
                          <div className="h4 fw-bold text-primary">{formatNumber(stats.followers)}</div>
                          <div className="text-muted small">Followers</div>
                        </div>
                        <div className="text-center">
                          <div className="h4 fw-bold text-success">{formatNumber(stats.pageViews)}</div>
                          <div className="text-muted small">Page views</div>
                        </div>
                        <div className="text-center">
                          <div className="h4 fw-bold text-info">{stats.engagement}%</div>
                          <div className="text-muted small">Engagement</div>
                        </div>
                      </div>
                      
                      <div className="d-flex justify-content-between text-center">
                        <div>
                          <div className="h5 fw-bold">{activeJobsCount}</div>
                          <div className="text-muted small">Active Jobs</div>
                        </div>
                        <div>
                          <div className="h5 fw-bold">{teamMembers.length + 1}</div>
                          <div className="text-muted small">Team Members</div>
                        </div>
                        <div>
                          <div className="h5 fw-bold">{formatNumber(stats.recentApplications)}</div>
                          <div className="text-muted small">Recent Apps</div>
                        </div>
                      </div>
                    </>
                  ) : (
                    // Show basic insights for non-owners
                    <>
                      <div className="d-flex justify-content-between mb-3">
                        <div className="text-center">
                          <div className="h4 fw-bold text-primary">{formatNumber(stats.followers)}</div>
                          <div className="text-muted small">Followers</div>
                        </div>
                        <div className="text-center">
                          <div className="h4 fw-bold text-success">{activeJobsCount}</div>
                          <div className="text-muted small">Active Jobs</div>
                        </div>
                        <div className="text-center">
                          <div className="h4 fw-bold text-info">{teamMembers.length + 1}</div>
                          <div className="text-muted small">Team Members</div>
                        </div>
                      </div>
                      
                      {!isAuthenticated && (
                        <div className="text-center mt-3">
                          <Button 
                            variant="outline-primary" 
                            size="sm" 
                            className="rounded-pill"
                            onClick={() => router.push(`/login?redirect=/company/${id}`)}
                          >
                            Login for detailed insights
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </motion.div>
              </Col>
            </Row>
          </div>
        </Container>
      </div>

      {/* Main Content */}
      <Container className="py-4">
        <Row>
          {/* Left Column - Main Content */}
          <Col lg={8}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Tab.Container activeKey={activeTab} onSelect={(k) => setActiveTab(k || 'overview')}>
                {/* Navigation Tabs */}
                <Nav variant="tabs" className="mb-4 border-0">
                  <Nav.Item>
                    <Nav.Link eventKey="overview" className={`rounded-top ${activeTab === 'overview' ? 'active border-primary' : ''}`}>
                      Overview
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="jobs" className={`rounded-top ${activeTab === 'jobs' ? 'active border-primary' : ''}`}>
                      Jobs ({activeJobsCount})
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="people" className={`rounded-top ${activeTab === 'people' ? 'active border-primary' : ''}`}>
                      People ({teamMembers.length + 1})
                    </Nav.Link>
                  </Nav.Item>
                  {/* Only show Insights tab for owners/admins */}
                  {showInsightsTab && (
                    <Nav.Item>
                      <Nav.Link eventKey="insights" className={`rounded-top ${activeTab === 'insights' ? 'active border-primary' : ''}`}>
                        Insights
                        {stats.engagement > 0 && canViewDetailedInsights && (
                          <Badge bg={getEngagementColor(stats.engagement)} className="ms-2">
                            {stats.engagement}%
                          </Badge>
                        )}
                      </Nav.Link>
                    </Nav.Item>
                  )}
                </Nav>

                <Tab.Content>
                  {/* Overview Tab */}
                  <Tab.Pane eventKey="overview">
                    <OverviewTab
                      company={company}
                      canEdit={canEdit}
                      onEditClick={handleEditClick}
                      getSizeLabel={getSizeLabel}
                    />
                  </Tab.Pane>

                  {/* Jobs Tab */}

                  <Tab.Pane eventKey="jobs">
                    <JobsTab
                      company={company}
                      activeJobsCount={activeJobsCount}
                      canEdit={canEdit}
                      onPostJobClick={() => router.push(`/company/${id}/post-job`)}
                      router={router}
                      isOwner={isOwner}
                      isAuthenticated={isAuthenticated}
                    />
                  </Tab.Pane>

                  {/* People Tab */}
                  <Tab.Pane eventKey="people">
                    <PeopleTab
                      company={company}
                      teamMembers={teamMembers}
                      getProfileImageUrl={getProfileImageUrl}
                      getRoleBadge={getRoleBadge}
                    />
                  </Tab.Pane>

                  {/* Insights Tab - Only show if user is owner/admin */}
                  {showInsightsTab && (
                    <Tab.Pane eventKey="insights">
                      <InsightsTab
                        company={company}
                        stats={stats}
                        isAuthenticated={isAuthenticated}
                        user={user}
                        formatNumber={formatNumber}
                        getEngagementColor={getEngagementColor}
                        calculateProfileCompleteness={calculateProfileCompleteness}
                        router={router}
                        id={id}
                      />
                    </Tab.Pane>
                  )}
                </Tab.Content>
              </Tab.Container>
            </motion.div>
          </Col>

          {/* Right Column - Sidebar */}
          <Col lg={4}>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="sticky-top"
              style={{ top: '20px' }}
            >
              {/* Similar Companies */}
              <Card className="border-0 shadow-sm mb-4">
                <Card.Body className="p-4">
                  <Card.Title className="h5 fw-bold mb-4 d-flex align-items-center">
                    <FaSearch className="me-2" />
                    Similar Companies
                  </Card.Title>
                  
                  {renderSimilarCompanies()}
                </Card.Body>
              </Card>

              {/* Company Details */}
              <Card className="border-0 shadow-sm mb-4">
                <Card.Body className="p-4">
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <Card.Title className="h5 fw-bold mb-0">
                      Company Details
                    </Card.Title>
                    {canEdit && (
                      <Button 
                        variant="outline-primary" 
                        size="sm"
                        onClick={handleEditClick}
                      >
                        <FaEdit className="me-2" />
                        Edit
                      </Button>
                    )}
                  </div>
                  
                  <div className="mb-4">
                    <div className="d-flex justify-content-between mb-2">
                      <small className="text-muted">Profile Completeness</small>
                      <small className="fw-bold">{calculateProfileCompleteness(company)}%</small>
                    </div>
                    <ProgressBar 
                      now={calculateProfileCompleteness(company)} 
                      variant="success"
                      style={{ height: '6px' }}
                    />
                  </div>
                  
                  <ListGroup variant="flush">
                    <ListGroup.Item className="border-0 py-2 d-flex justify-content-between">
                      <small className="text-muted">Industry</small>
                      <small className="fw-bold">{company.industry}</small>
                    </ListGroup.Item>
                    
                    <ListGroup.Item className="border-0 py-2 d-flex justify-content-between">
                      <small className="text-muted">Location</small>
                      <small className="fw-bold">{company.location}</small>
                    </ListGroup.Item>
                    
                    <ListGroup.Item className="border-0 py-2 d-flex justify-content-between">
                      <small className="text-muted">Company Size</small>
                      <small className="fw-bold">{getSizeLabel(company.size)}</small>
                    </ListGroup.Item>
                    
                    {company.foundedYear && (
                      <ListGroup.Item className="border-0 py-2 d-flex justify-content-between">
                        <small className="text-muted">Founded</small>
                        <small className="fw-bold">{company.foundedYear}</small>
                      </ListGroup.Item>
                    )}
                    
                    <ListGroup.Item className="border-0 py-2 d-flex justify-content-between">
                      <small className="text-muted">Active Since</small>
                      <small className="fw-bold">
                        {new Date(company.createdAt).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'short' 
                        })}
                      </small>
                    </ListGroup.Item>
                    
                    <ListGroup.Item className="border-0 py-2 d-flex justify-content-between">
                      <small className="text-muted">Verification</small>
                      <small className="fw-bold">
                        {company.verificationStatus === 'verified' ? (
                          <Badge bg="success" className="small">
                            Verified
                          </Badge>
                        ) : company.verificationStatus === 'pending' ? (
                          <Badge bg="warning" className="small">
                            Pending
                          </Badge>
                        ) : (
                          <Badge bg="secondary" className="small">
                            Not Verified
                          </Badge>
                        )}
                      </small>
                    </ListGroup.Item>
                  </ListGroup>
                </Card.Body>
              </Card>

              {/* Quick Stats */}
              <Card className="border-0 shadow-sm">
                <Card.Body className="p-4">
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <Card.Title className="h5 fw-bold mb-0">
                      Quick Stats
                    </Card.Title>
                    {canEdit && (
                      <Button 
                        variant="outline-primary"
                        size="sm"
                        className="rounded-pill px-3"
                        onClick={handleEditClick}
                        title="Edit company"
                      >
                        <FaEdit size={12} />
                      </Button>
                    )}
                  </div>
                  
                  <div className="row text-center">
                    <div className="col-4 mb-3">
                      <div className="h4 fw-bold text-primary">{activeJobsCount}</div>
                      <div className="text-muted small">Active Jobs</div>
                    </div>
                    <div className="col-4 mb-3">
                      <div className="h4 fw-bold text-success">{teamMembers.length + 1}</div>
                      <div className="text-muted small">Team Size</div>
                    </div>
                    <div className="col-4 mb-3">
                      <div className="h4 fw-bold text-info">{formatNumber(stats.followers)}</div>
                      <div className="text-muted small">Followers</div>
                    </div>
                  </div>
                  
                  <div className="mt-3">
                    <small className="text-muted d-block mb-2">
                      Last updated: {new Date(company.updatedAt).toLocaleDateString()}
                    </small>
                    {canViewDetailedInsights ? (
                      <small className="text-muted">
                        This page has been viewed {formatNumber(stats.pageViews)} times
                      </small>
                    ) : (
                      <small className="text-muted">
                        {formatNumber(stats.followers)} followers
                      </small>
                    )}
                  </div>
                </Card.Body>
              </Card>
            </motion.div>
          </Col>
        </Row>
      </Container>

      {/* Message Modal */}
      <Modal show={showMessageModal} onHide={() => setShowMessageModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Message {company?.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            {!isAuthenticated && (
              <>
                <Form.Group className="mb-2">
                  <Form.Label>Your name</Form.Label>
                  <Form.Control
                    type="text"
                    value={messageForm.name}
                    onChange={(e) => setMessageForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter your name"
                  />
                </Form.Group>
                <Form.Group className="mb-2">
                  <Form.Label>Your email</Form.Label>
                  <Form.Control
                    type="email"
                    value={messageForm.email}
                    onChange={(e) => setMessageForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter your email"
                  />
                </Form.Group>
              </>
            )}
            {isAuthenticated && (
              <div className="alert alert-info mb-3">
                <small>Sending as <strong>{user?.name}</strong> ({user?.email})</small>
              </div>
            )}
            <Form.Group className="mb-2">
              <Form.Label>Subject</Form.Label>
              <Form.Control
                type="text"
                value={messageForm.subject}
                onChange={(e) => setMessageForm(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="What is this about?"
              />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Message</Form.Label>
              <Form.Control
                as="textarea"
                rows={5}
                value={messageForm.message}
                onChange={(e) => setMessageForm(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Type your message here..."
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowMessageModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleSendMessage} disabled={messageSubmitting}>
            {messageSubmitting ? 'Sending...' : 'Send Message'}
          </Button>
        </Modal.Footer>
      </Modal>

      <style jsx>{`
        .hover-bg-light:hover {
          background-color: #f8f9fa !important;
        }
        .cursor-pointer {
          cursor: pointer;
        }
        .sticky-top {
          position: sticky;
        }
        .object-fit-cover {
          object-fit: cover;
        }
        .border-5 {
          border-width: 5px !important;
        }
      `}</style>
    </>
  );
}