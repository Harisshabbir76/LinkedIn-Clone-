'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Container, Row, Col, Card, Button, Form, Badge, Image, Alert, Spinner, Modal } from 'react-bootstrap';
import { motion, AnimatePresence } from 'framer-motion';
import 'bootstrap/dist/css/bootstrap.min.css';
import ExperienceModal from '@/components/ExperienceModal';
import EducationModal from '@/components/EducationModal';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Utility function to get profile image URL
const getProfileImageUrl = (user) => {
  if (!user) {
    return `/default-avatar.svg`;
  }
  
  if (user.profileImagePreview) {
    return user.profileImagePreview;
  }
  
  if (user.profileImage) {
    // Check if it's already a full URL
    if (user.profileImage.startsWith('http')) {
      return user.profileImage;
    }
    
    // Remove leading slash if present
    const imagePath = user.profileImage.startsWith('/') 
      ? user.profileImage.substring(1) 
      : user.profileImage;
    
    // Construct full URL
    return `${API_BASE_URL.replace('/api', '')}/${imagePath}`;
  }
  
  return `/default-avatar.svg`;
};

export default function ProfilePage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id;
  
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [newSkill, setNewSkill] = useState('');
  const [expandedExperience, setExpandedExperience] = useState(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Modal states
  const [showExperienceModal, setShowExperienceModal] = useState(false);
  const [showEducationModal, setShowEducationModal] = useState(false);
  const [editingExperience, setEditingExperience] = useState(null);
  const [editingEducation, setEditingEducation] = useState(null);
  
  // Profile image states
  const [showProfileOptions, setShowProfileOptions] = useState(false);
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  
  // Check if current user is viewing their own profile
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  
  const fileInputRef = useRef(null);

  const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  useEffect(() => {
    const checkAuthenticationAndFetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        
        // Check if user is viewing their own profile
        if (token && storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser);
            setIsOwnProfile(parsedUser._id === userId);
          } catch (error) {
            console.error('Error parsing stored user:', error);
          }
        }
        
        // Fetch profile data
        await fetchUserProfile(userId);
      } catch (err) {
        console.error('Error initializing profile:', err);
        setError(`Failed to load profile: ${err.message}`);
        setLoading(false);
      }
    };

    if (userId) {
      checkAuthenticationAndFetchProfile();
    }
  }, [userId, router]);

  const fetchUserProfile = async (id) => {
    try {
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json',
      };
      
      // Add authorization header only if user is authenticated
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Try these endpoints in order:
      let response;
      
      // 1. Try the profile route first
      try {
        response = await fetch(`${API_BASE_URL}/profile/${id}`, {
          method: 'GET',
          headers: headers,
        });
        
        if (!response.ok && response.status !== 404) {
          console.log('Profile endpoint failed with status:', response.status);
        }
      } catch (err) {
        console.log('Profile endpoint failed, trying alternative...', err);
      }
      
      // 2. Try the auth route if profile fails or returns 404
      if (!response || !response.ok || response.status === 404) {
        console.log('Trying auth/user-public endpoint...');
        response = await fetch(`${API_BASE_URL}/auth/user-public/${id}`, {
          method: 'GET',
          headers: headers,
        });
      }

      // 3. Try the user-specific endpoint as last resort
      if (!response || !response.ok || response.status === 404) {
        console.log('Trying auth/user endpoint...');
        response = await fetch(`${API_BASE_URL}/auth/user/${id}`, {
          method: 'GET',
          headers: headers,
        });
      }

      if (response.status === 404) {
        console.log('User not found with ID:', id);
        router.push('/404');
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `Failed to fetch profile: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Profile data fetched successfully:', data);
      setUser(data);
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError(err.message || 'Failed to load profile. Please try again.');
      
      // If it's a 401/403 and we're trying to view our own profile, redirect to login
      if (err.message.includes('401') || err.message.includes('403')) {
        if (isOwnProfile) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          router.push('/login');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    if (!isOwnProfile || !isEditing) return;
    
    setUser(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addSkill = () => {
    if (!isOwnProfile || !isEditing) return;
    
    if (newSkill.trim() && user) {
      const updatedSkills = [...(user.skills || []), { name: newSkill.trim(), proficiency: 'Intermediate' }];
      setUser(prev => ({ ...prev, skills: updatedSkills }));
      setNewSkill('');
    }
  };

  const removeSkill = (index) => {
    if (!isOwnProfile || !isEditing) return;
    
    if (user) {
      const updatedSkills = user.skills.filter((_, i) => i !== index);
      setUser(prev => ({ ...prev, skills: updatedSkills }));
    }
  };

  const toggleExperience = (index) => {
    setExpandedExperience(expandedExperience === index ? null : index);
  };

  // Experience Modal Functions
  const openExperienceModal = (experience = null) => {
    if (!isOwnProfile || !isEditing) return;
    
    setEditingExperience(experience);
    setShowExperienceModal(true);
  };

  const handleExperienceSubmit = (experienceData) => {
    if (!isOwnProfile || !isEditing) return;
    
    if (editingExperience) {
      // Update existing experience
      const updatedExperience = user.experience.map(exp => {
        if (exp._id === editingExperience._id) {
          // Remove _id from the new data
          const { _id, ...newData } = experienceData;
          return { ...newData, _id: exp._id };
        }
        return exp;
      });
      setUser(prev => ({ ...prev, experience: updatedExperience }));
    } else {
      // Add new experience - don't include _id
      const { _id, ...cleanData } = experienceData;
      setUser(prev => ({
        ...prev,
        experience: [...(prev.experience || []), cleanData]
      }));
    }
    setShowExperienceModal(false);
    setEditingExperience(null);
  };

  const removeExperience = (index) => {
    if (!isOwnProfile || !isEditing) return;
    
    if (user) {
      const updatedExperience = user.experience.filter((_, i) => i !== index);
      setUser(prev => ({ ...prev, experience: updatedExperience }));
    }
  };

  // Education Modal Functions
  const openEducationModal = (education = null) => {
    if (!isOwnProfile || !isEditing) return;
    
    setEditingEducation(education);
    setShowEducationModal(true);
  };

  const handleEducationSubmit = (educationData) => {
    if (!isOwnProfile || !isEditing) return;
    
    if (editingEducation) {
      // Update existing education
      const updatedEducation = user.education.map(edu => {
        if (edu._id === editingEducation._id) {
          // Remove _id from the new data
          const { _id, ...newData } = educationData;
          return { ...newData, _id: edu._id };
        }
        return edu;
      });
      setUser(prev => ({ ...prev, education: updatedEducation }));
    } else {
      // Add new education - don't include _id
      const { _id, ...cleanData } = educationData;
      setUser(prev => ({
        ...prev,
        education: [...(prev.education || []), cleanData]
      }));
    }
    setShowEducationModal(false);
    setEditingEducation(null);
  };

  const removeEducation = (index) => {
    if (!isOwnProfile || !isEditing) return;
    
    if (user) {
      const updatedEducation = user.education.filter((_, i) => i !== index);
      setUser(prev => ({ ...prev, education: updatedEducation }));
    }
  };

  const handleSave = async () => {
    if (!isOwnProfile) return;
    
    try {
      setSaveLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        router.push('/login');
        return;
      }

      // Prepare data - remove _id fields from education and experience
      const userData = {
        name: user.name,
        phone: user.phone,
        location: user.location,
        linkedin: user.linkedin,
        portfolio: user.portfolio,
        bio: user.bio,
        skills: user.skills || [],
        education: (user.education || []).map(edu => {
          const { _id, ...eduData } = edu;
          return eduData;
        }),
        experience: (user.experience || []).map(exp => {
          const { _id, ...expData } = exp;
          return expData;
        })
      };

      const response = await fetch(`${API_BASE_URL}/auth/user/update`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      setUser(result);
      setIsEditing(false);
      setShowProfileOptions(false);
      
      // Update localStorage user data
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...storedUser, ...result }));
      
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      
    } catch (err) {
      console.error('Error updating profile:', err);
      setMessage({ type: 'error', text: `Failed to update profile: ${err.message}` });
    } finally {
      setSaveLoading(false);
    }
  };

  const handleImageUpload = async (file) => {
    if (!isOwnProfile) return;
    
    try {
      setSaveLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        router.push('/login');
        return;
      }
      
      const formData = new FormData();
      formData.append('profileImage', file);

      const response = await fetch(`${API_BASE_URL}/profile/image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
        return;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to upload image: ${response.statusText}`);
      }

      const result = await response.json();
      
      setUser(result.user);
      setProfileImageFile(null);
      
      // Update localStorage user data
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...storedUser, ...result.user }));
      
      setMessage({ type: 'success', text: 'Profile image updated successfully!' });
      
      setTimeout(() => {
        setMessage({ type: '', text: '' });
      }, 3000);
      
    } catch (err) {
      console.error('Error uploading image:', err);
      setMessage({ type: 'error', text: `Failed to upload image: ${err.message}` });
    } finally {
      setSaveLoading(false);
      setShowProfileOptions(false);
    }
  };

  const handleRemoveProfileImage = async () => {
    if (!isOwnProfile) return;
    
    try {
      setSaveLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        router.push('/login');
        return;
      }
      
      const response = await fetch(`${API_BASE_URL}/profile/image`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to remove image: ${response.statusText}`);
      }

      const result = await response.json();
      
      setUser(result.user);
      setShowRemoveConfirm(false);
      setShowProfileOptions(false);
      
      // Update localStorage user data
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...storedUser, ...result.user }));
      
      setMessage({ type: 'success', text: 'Profile image removed successfully!' });
      
      setTimeout(() => {
        setMessage({ type: '', text: '' });
      }, 3000);
      
    } catch (err) {
      console.error('Error removing image:', err);
      setMessage({ type: 'error', text: `Failed to remove image: ${err.message}` });
    } finally {
      setSaveLoading(false);
    }
  };

  const handleFileChange = (e) => {
    if (!isOwnProfile || !isEditing) return;
    
    const file = e.target.files[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'File size must be less than 5MB' });
        return;
      }
      
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        setMessage({ type: 'error', text: 'Only JPEG, PNG, GIF, and WebP images are allowed' });
        return;
      }
      
      setProfileImageFile(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setUser(prev => ({ ...prev, profileImagePreview: e.target.result }));
      };
      reader.onerror = () => {
        setMessage({ type: 'error', text: 'Failed to read image file' });
      };
      reader.readAsDataURL(file);
      
      setShowProfileOptions(true);
    }
  };

  const triggerFileInput = () => {
    if (!isOwnProfile || !isEditing) return;
    
    fileInputRef.current.click();
  };

  const cancelImageChange = () => {
    setProfileImageFile(null);
    setUser(prev => {
      const { profileImagePreview, ...rest } = prev;
      return rest;
    });
    setShowProfileOptions(false);
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Present';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Present';
      return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
    } catch (error) {
      return 'Present';
    }
  };

  // Format education date for display
  const formatEducationDate = (startMonth, startYear, endMonth, endYear) => {
    const start = startMonth && startYear ? `${MONTHS[startMonth - 1]} ${startYear}` : '';
    const end = endMonth && endYear ? `${MONTHS[endMonth - 1]} ${endYear}` : 'Present';
    return start ? `${start} - ${end}` : end;
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        damping: 20,
        stiffness: 100
      }
    }
  };

  const cardVariants = {
    hidden: { scale: 0.95, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        type: "spring",
        damping: 15,
        stiffness: 100
      }
    }
  };

  const skillVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: (i) => ({
      scale: 1,
      opacity: 1,
      transition: {
        delay: i * 0.05,
        type: "spring",
        damping: 12
      }
    }),
    hover: {
      scale: 1.05,
      y: -3,
      transition: {
        type: "spring",
        stiffness: 400
      }
    }
  };

  const profileImageVariants = {
    hidden: { scale: 0.9, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 20
      }
    },
    hover: {
      scale: 1.05,
      transition: {
        type: "spring",
        stiffness: 400
      }
    }
  };

  // Show loading while checking authentication and fetching data
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <Spinner animation="border" variant="primary" />
        <span className="ms-3">Loading profile...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Container className="py-5">
        <Alert variant="danger">
          <Alert.Heading>Error Loading Profile</Alert.Heading>
          <p>{error}</p>
          <div className="d-flex gap-2">
            <Button variant="outline-danger" size="sm" onClick={() => fetchUserProfile(userId)}>
              Try Again
            </Button>
            <Button variant="outline-primary" size="sm" onClick={() => router.push('/')}>
              Go to Home
            </Button>
          </div>
        </Alert>
      </Container>
    );
  }

  if (!user) {
    return (
      <Container className="py-5">
        <Alert variant="warning">
          <Alert.Heading>Profile Not Found</Alert.Heading>
          <p>The requested profile could not be found.</p>
          <Button variant="outline-primary" onClick={() => router.push('/')}>
            Go to Home
          </Button>
        </Alert>
      </Container>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="min-vh-100 bg-light py-4 py-md-5"
      style={{
        background: 'linear-gradient(135deg, #f0f2f5 0%, #e5e7eb 100%)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
      }}
    >
      <Container className="px-3 px-md-4">
        {/* Message Alert */}
        <AnimatePresence>
          {message.text && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-4"
            >
              <Alert variant={message.type === 'error' ? 'danger' : 'success'}>
                {message.text}
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <motion.header
          variants={itemVariants}
          className="bg-white rounded-4 p-4 p-md-5 mb-4 shadow-sm"
        >
          <Row className="align-items-center">
            <Col xs={12} md={8} className="mb-3 mb-md-0">
              <div className="d-flex align-items-center">
                <motion.div
                  variants={profileImageVariants}
                  whileHover="hover"
                  className="position-relative me-4"
                >
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                    onClick={() => isOwnProfile && isEditing && setShowProfileOptions(!showProfileOptions)}
                    style={{ cursor: (isOwnProfile && isEditing) ? 'pointer' : 'default' }}
                  >
                    <Image
                      src={getProfileImageUrl(user)}
                      roundedCircle
                      width={100}
                      height={100}
                      className="object-fit-cover border border-3 border-white shadow-sm"
                      style={{ objectFit: 'cover' }}
                      onError={(e) => {
                        e.target.src = '/default-avatar.svg';
                        e.target.onerror = null;
                      }}
                      alt={`${user.name || 'User'} profile`}
                    />
                    {isOwnProfile && isEditing && (
                      <motion.div
                        className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center rounded-circle"
                        style={{ 
                          backgroundColor: 'rgba(0, 0, 0, 0.5)',
                          opacity: showProfileOptions ? 1 : 0,
                          transition: 'opacity 0.3s'
                        }}
                      >
                        <span className="text-white fw-semibold">Edit</span>
                      </motion.div>
                    )}
                  </motion.div>
                  <motion.div
                    className="position-absolute bottom-0 end-0 rounded-circle border border-2 border-white"
                    style={{ width: '24px', height: '24px', backgroundColor: '#10b981' }}
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </motion.div>
                <div>
                  <motion.h1 
                    className="h2 fw-bold mb-2"
                    style={{ color: '#1f2937' }}
                    animate={{ scale: [1, 1.02, 1] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    {user.name || 'User'}
                  </motion.h1>
                  <div className="d-flex align-items-center mb-1">
                    <i className="bi bi-briefcase me-2 text-muted small"></i>
                    <span className="text-muted small">{user.role || 'Looking for job'}</span>
                  </div>
                  <div className="d-flex align-items-center">
                    <i className="bi bi-geo-alt me-2 text-muted small"></i>
                    <span className="text-muted small">{user.location || 'Location not set'}</span>
                  </div>
                  {!isOwnProfile && (
                    <div className="mt-2">
                      <Badge bg="info" className="px-2 py-1">
                        <i className="bi bi-eye me-1"></i>
                        Viewing Profile
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            </Col>
            <Col xs={12} md={4} className="text-md-end">
              {isOwnProfile ? (
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    variant={isEditing ? "outline-primary" : "primary"}
                    className="rounded-pill px-4 py-2 fw-semibold"
                    style={{ backgroundColor: isEditing ? 'transparent' : '#1e3a8a', borderColor: '#1e3a8a' }}
                    onClick={() => {
                      setIsEditing(!isEditing);
                      if (!isEditing) {
                        setShowProfileOptions(false);
                        setProfileImageFile(null);
                      }
                    }}
                    disabled={saveLoading}
                  >
                    <i className={`bi ${isEditing ? 'bi-x' : 'bi-pencil'} me-2`}></i>
                    {isEditing ? 'Cancel Editing' : 'Edit Profile'}
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    variant="outline-primary"
                    className="rounded-pill px-4 py-2 fw-semibold"
                    onClick={() => router.push('/profile')}
                  >
                    <i className="bi bi-person me-2"></i>
                    View My Profile
                  </Button>
                </motion.div>
              )}
            </Col>
          </Row>

          {/* Profile Image Options (shown only when editing own profile and profile is clicked) */}
          <AnimatePresence>
            {isOwnProfile && isEditing && showProfileOptions && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-4"
              >
                <Card className="border-0 shadow-sm rounded-4">
                  <Card.Body className="p-4">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <Card.Title className="h5 fw-bold mb-0" style={{ color: '#1f2937' }}>
                        <i className="bi bi-image me-2" style={{ color: '#3b82f6' }}></i>
                        Profile Picture Options
                      </Card.Title>
                      <Button
                        variant="link"
                        className="text-muted p-0"
                        onClick={() => setShowProfileOptions(false)}
                      >
                        <i className="bi bi-x-lg"></i>
                      </Button>
                    </div>

                    <div className="d-flex flex-column gap-3">
                      {/* Remove Profile Picture Button */}
                      {user.profileImage && !profileImageFile && (
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Button
                            variant="outline-danger"
                            className="w-100 py-2 d-flex align-items-center justify-content-center gap-2"
                            onClick={() => setShowRemoveConfirm(true)}
                            disabled={saveLoading}
                          >
                            <i className="bi bi-trash"></i>
                            Remove Profile Picture
                          </Button>
                        </motion.div>
                      )}

                      {/* Change Profile Picture Button */}
                      {!profileImageFile && (
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Button
                            variant="outline-primary"
                            className="w-100 py-2 d-flex align-items-center justify-content-center gap-2"
                            onClick={triggerFileInput}
                            disabled={saveLoading}
                          >
                            <i className="bi bi-camera"></i>
                            Change Profile Picture
                          </Button>
                        </motion.div>
                      )}

                      {/* File Input (hidden) */}
                      <Form.Control
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="d-none"
                        ref={fileInputRef}
                      />

                      {/* Preview and Save/Cancel buttons for new image */}
                      {profileImageFile && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-3"
                        >
                          <div className="text-center mb-3">
                            <p className="fw-semibold mb-2">New Profile Picture Preview</p>
                            <Image
                              src={user.profileImagePreview}
                              roundedCircle
                              width={120}
                              height={120}
                              className="border border-3 border-primary shadow"
                              style={{ objectFit: 'cover' }}
                              onError={(e) => {
                                e.target.src = '/default-avatar.svg';
                              }}
                            />
                            <p className="text-muted small mt-2">
                              {profileImageFile.name} ({(profileImageFile.size / 1024).toFixed(1)} KB)
                            </p>
                          </div>
                          
                          <div className="d-flex gap-2">
                            <Button
                              variant="primary"
                              className="flex-grow-1"
                              onClick={() => handleImageUpload(profileImageFile)}
                              disabled={saveLoading}
                            >
                              {saveLoading ? (
                                <>
                                  <Spinner animation="border" size="sm" className="me-2" />
                                  Uploading...
                                </>
                              ) : (
                                <>
                                  <i className="bi bi-check-circle me-2"></i>
                                  Save New Picture
                                </>
                              )}
                            </Button>
                            <Button
                              variant="outline-secondary"
                              onClick={cancelImageChange}
                              disabled={saveLoading}
                            >
                              <i className="bi bi-x-circle me-2"></i>
                              Cancel
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </Card.Body>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.header>

        <Row className="g-4">
          {/* Left Column - Personal Info & Resume */}
          <Col lg={8}>
            <Row className="g-4">
              {/* Personal Info Card */}
              <Col xs={12}>
                <motion.div
                  variants={cardVariants}
                  whileHover={{ scale: 1.01 }}
                  transition={{ type: "spring", stiffness: 200 }}
                >
                  <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
                    <Card.Body className="p-4 p-md-5">
                      <div className="d-flex justify-content-between align-items-center mb-4">
                        <Card.Title className="h4 fw-bold mb-0" style={{ color: '#1f2937' }}>
                          <i className="bi bi-person-circle me-2" style={{ color: '#3b82f6' }}></i>
                          Personal Information
                        </Card.Title>
                        <motion.div
                          animate={{ rotate: (isOwnProfile && isEditing) ? [0, 360] : 0 }}
                          transition={{ duration: 0.5 }}
                        >
                          <i className={`bi ${(isOwnProfile && isEditing) ? 'bi-pencil' : 'bi-eye'} text-muted`}></i>
                        </motion.div>
                      </div>

                      <Row>
                        {[
                          { 
                            label: 'Full Name', 
                            icon: 'person', 
                            value: user.name, 
                            field: 'name',
                            verified: true 
                          },
                          { 
                            label: 'Phone Number', 
                            icon: 'telephone', 
                            value: user.phone, 
                            field: 'phone' 
                          },
                          { 
                            label: 'Location', 
                            icon: 'geo-alt', 
                            value: user.location, 
                            field: 'location' 
                          },
                          { 
                            label: 'LinkedIn Profile', 
                            icon: 'linkedin', 
                            value: user.linkedin, 
                            field: 'linkedin' 
                          },
                          { 
                            label: 'Portfolio', 
                            icon: 'link-45deg', 
                            value: user.portfolio, 
                            field: 'portfolio' 
                          },
                          { 
                            label: 'Email Address', 
                            icon: 'envelope', 
                            value: user.email, 
                            field: 'email',
                            readOnly: true,
                            verified: true
                          },
                        ].map((item, index) => (
                          <Col key={index} xs={12} md={6} className="mb-4">
                            <motion.div
                              variants={itemVariants}
                              custom={index}
                            >
                              <Form.Group>
                                <Form.Label className="small fw-semibold text-muted mb-2">
                                  {item.label}
                                </Form.Label>
                                <div className="position-relative">
                                  <div className="position-absolute start-0 top-0 bottom-0 d-flex align-items-center ps-3">
                                    <i className={`bi bi-${item.icon} text-secondary`}></i>
                                  </div>
                                  {isOwnProfile && isEditing && !item.readOnly ? (
                                    <Form.Control
                                      type="text"
                                      value={item.value || ''}
                                      onChange={(e) => handleInputChange(item.field, e.target.value)}
                                      className="ps-5 py-2 border-2"
                                      style={{ 
                                        borderRadius: '10px',
                                        borderColor: item.verified ? '#10b981' : '#e5e7eb'
                                      }}
                                      placeholder={`Enter ${item.label.toLowerCase()}`}
                                    />
                                  ) : (
                                    <div className="ps-5 py-2 text-dark fw-medium">
                                      {item.value || 'Not set'}
                                    </div>
                                  )}
                                  {item.verified && (
                                    <div className="position-absolute end-0 top-0 bottom-0 d-flex align-items-center pe-3">
                                      <motion.div
                                        animate={{ scale: [1, 1.2, 1] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                      >
                                        <i className="bi bi-check-circle text-success"></i>
                                      </motion.div>
                                    </div>
                                  )}
                                </div>
                              </Form.Group>
                            </motion.div>
                          </Col>
                        ))}
                        
                        {/* Bio Field */}
                        <Col xs={12} className="mb-4">
                          <motion.div variants={itemVariants}>
                            <Form.Group>
                              <Form.Label className="small fw-semibold text-muted mb-2">
                                Bio
                              </Form.Label>
                              {isOwnProfile && isEditing ? (
                                <Form.Control
                                  as="textarea"
                                  rows={4}
                                  value={user.bio || ''}
                                  onChange={(e) => handleInputChange('bio', e.target.value)}
                                  className="border-2"
                                  style={{ borderRadius: '10px' }}
                                  placeholder="Tell us about yourself, your experience, and what you're looking for..."
                                />
                              ) : (
                                <div className="border rounded-3 p-3 bg-light">
                                  <p className="mb-0 text-dark">
                                    {user.bio || 'No bio added yet.'}
                                  </p>
                                </div>
                              )}
                            </Form.Group>
                          </motion.div>
                        </Col>
                      </Row>
                    </Card.Body>
                  </Card>
                </motion.div>
              </Col>
            </Row>
          </Col>

          {/* Right Column - Skills, Experience, Education */}
          <Col lg={4}>
            <div className="d-flex flex-column gap-4">
              {/* Skills Card */}
              <motion.div
                variants={cardVariants}
                whileHover={{ scale: 1.01 }}
                transition={{ type: "spring", stiffness: 200 }}
              >
                <Card className="border-0 shadow-sm rounded-4 overflow-hidden h-100">
                  <Card.Body className="p-4 p-md-5">
                    <Card.Title className="h4 fw-bold mb-4" style={{ color: '#1f2937' }}>
                      <i className="bi bi-code-slash me-2" style={{ color: '#3b82f6' }}></i>
                      Skills
                    </Card.Title>

                    {/* Skills Tags */}
                    <div className="d-flex flex-wrap gap-2 mb-4">
                      <AnimatePresence>
                        {user.skills && user.skills.length > 0 ? (
                          user.skills.map((skill, index) => (
                            <motion.div
                              key={index}
                              custom={index}
                              variants={skillVariants}
                              initial="hidden"
                              animate="visible"
                              exit={{ scale: 0, opacity: 0 }}
                              whileHover="hover"
                              layout
                            >
                              <Badge
                                className="px-3 py-2 rounded-pill d-flex align-items-center gap-2"
                                style={{ 
                                  backgroundColor: index % 2 === 0 ? '#374151' : '#2dd4bf',
                                  fontSize: '0.9rem'
                                }}
                              >
                                {typeof skill === 'string' ? skill : skill.name}
                                {isOwnProfile && isEditing && (
                                  <motion.button
                                    type="button"
                                    className="btn-close btn-close-white ms-1"
                                    style={{ fontSize: '0.7rem' }}
                                    onClick={() => removeSkill(index)}
                                    whileHover={{ scale: 1.3 }}
                                    whileTap={{ scale: 0.8 }}
                                  />
                                )}
                              </Badge>
                            </motion.div>
                          ))
                        ) : (
                          <p className="text-muted small">No skills added yet</p>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Add Skill Form */}
                    {isOwnProfile && isEditing && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4"
                      >
                        <div className="d-flex gap-2">
                          <Form.Control
                            type="text"
                            placeholder="Add a new skill..."
                            value={newSkill}
                            onChange={(e) => setNewSkill(e.target.value)}
                            className="rounded-pill"
                            onKeyPress={(e) => e.key === 'Enter' && addSkill()}
                          />
                          <Button
                            variant="outline-primary"
                            className="rounded-pill"
                            onClick={addSkill}
                            disabled={!newSkill.trim() || saveLoading}
                          >
                            <i className="bi bi-plus"></i>
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </Card.Body>
                </Card>
              </motion.div>

              {/* Experience Card */}
              <motion.div
                variants={cardVariants}
                whileHover={{ scale: 1.01 }}
                transition={{ type: "spring", stiffness: 200 }}
              >
                <Card className="border-0 shadow-sm rounded-4 overflow-hidden h-100">
                  <Card.Body className="p-4 p-md-5">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                      <Card.Title className="h4 fw-bold mb-0" style={{ color: '#1f2937' }}>
                        <i className="bi bi-briefcase me-2" style={{ color: '#3b82f6' }}></i>
                        Experience
                      </Card.Title>
                      {isOwnProfile && isEditing && (
                        <motion.div
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <Button
                            variant="outline-primary"
                            size="sm"
                            className="rounded-pill px-3"
                            onClick={() => openExperienceModal()}
                          >
                            <i className="bi bi-plus-circle me-1"></i>
                            Add Experience
                          </Button>
                        </motion.div>
                      )}
                    </div>

                    <div className="d-flex flex-column gap-3">
                      {user.experience && user.experience.length > 0 ? (
                        user.experience.map((exp, index) => (
                          <motion.div
                            key={index}
                            className={`rounded-3 p-3 ${expandedExperience === index ? 'bg-light' : ''}`}
                            whileHover={{ x: 5 }}
                          >
                            <div 
                              className="d-flex justify-content-between align-items-center cursor-pointer"
                              onClick={() => toggleExperience(index)}
                            >
                              <div>
                                <h6 className="fw-bold mb-1" style={{ color: '#374151' }}>
                                  {exp.title}
                                </h6>
                                <p className="small text-muted mb-0">
                                  {exp.company} • {exp.location}
                                </p>
                                <p className="small text-muted mb-0">
                                  {formatDate(exp.startDate)} - {exp.currentlyWorking ? 'Present' : formatDate(exp.endDate)}
                                </p>
                              </div>
                              <div className="d-flex align-items-center gap-2">
                                {isOwnProfile && isEditing && (
                                  <>
                                    <motion.button
                                      type="button"
                                      className="btn btn-link text-primary p-0"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openExperienceModal(exp);
                                      }}
                                      whileHover={{ scale: 1.2 }}
                                      whileTap={{ scale: 0.9 }}
                                    >
                                      <i className="bi bi-pencil"></i>
                                    </motion.button>
                                    <motion.button
                                      type="button"
                                      className="btn btn-link text-danger p-0"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        removeExperience(index);
                                      }}
                                      whileHover={{ scale: 1.2 }}
                                      whileTap={{ scale: 0.9 }}
                                    >
                                      <i className="bi bi-trash"></i>
                                    </motion.button>
                                  </>
                                )}
                                <motion.div
                                  animate={{ rotate: expandedExperience === index ? 180 : 0 }}
                                  transition={{ type: "spring", stiffness: 300 }}
                                >
                                  <i className="bi bi-chevron-down text-secondary"></i>
                                </motion.div>
                              </div>
                            </div>
                            
                            <AnimatePresence>
                              {expandedExperience === index && exp.description && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.3 }}
                                  className="mt-3 pt-3 border-top"
                                >
                                  <p className="small text-muted mb-0">
                                    {exp.description}
                                  </p>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        ))
                      ) : (
                        <div className="text-center py-4">
                          <i className="bi bi-briefcase text-muted display-6 mb-3"></i>
                          <p className="text-muted mb-0">No experience added yet</p>
                          {isOwnProfile && isEditing && (
                            <Button
                              variant="outline-primary"
                              className="mt-2"
                              onClick={() => openExperienceModal()}
                            >
                              <i className="bi bi-plus me-2"></i>
                              Add Your First Experience
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </Card.Body>
                </Card>
              </motion.div>

              {/* Education Card */}
              <motion.div
                variants={cardVariants}
                whileHover={{ scale: 1.01 }}
                transition={{ type: "spring", stiffness: 200 }}
              >
                <Card className="border-0 shadow-sm rounded-4 overflow-hidden h-100">
                  <Card.Body className="p-4 p-md-5">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                      <Card.Title className="h4 fw-bold mb-0" style={{ color: '#1f2937' }}>
                        <i className="bi bi-mortarboard me-2" style={{ color: '#3b82f6' }}></i>
                        Education
                      </Card.Title>
                      {isOwnProfile && isEditing && (
                        <motion.div
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <Button
                            variant="outline-primary"
                            size="sm"
                            className="rounded-pill px-3"
                            onClick={() => openEducationModal()}
                          >
                            <i className="bi bi-plus-circle me-1"></i>
                            Add Education
                          </Button>
                        </motion.div>
                      )}
                    </div>

                    <div className="d-flex flex-column gap-3">
                      {user.education && user.education.length > 0 ? (
                        user.education.map((edu, index) => (
                          <motion.div
                            key={index}
                            className="pb-3 border-bottom"
                            style={{ borderColor: 'rgba(0,0,0,0.1)' }}
                          >
                            <div className="d-flex justify-content-between align-items-start">
                              <div>
                                <h6 className="fw-bold mb-1" style={{ color: '#374151' }}>
                                  {edu.degree}
                                  {edu.fieldOfStudy && (
                                    <span className="text-muted fw-normal"> in {edu.fieldOfStudy}</span>
                                  )}
                                </h6>
                                <p className="small text-muted mb-1">{edu.institution}</p>
                                <div className="d-flex align-items-center">
                                  <i className="bi bi-calendar text-primary me-2 small"></i>
                                  <span className="small text-muted">
                                    {formatEducationDate(edu.startMonth, edu.startYear, edu.endMonth, edu.endYear)}
                                  </span>
                                </div>
                              </div>
                              {isOwnProfile && isEditing && (
                                <div className="d-flex gap-1">
                                  <motion.button
                                    type="button"
                                    className="btn btn-link text-primary p-0"
                                    onClick={() => openEducationModal(edu)}
                                    whileHover={{ scale: 1.2 }}
                                    whileTap={{ scale: 0.9 }}
                                  >
                                    <i className="bi bi-pencil"></i>
                                  </motion.button>
                                  <motion.button
                                    type="button"
                                    className="btn btn-link text-danger p-0"
                                    onClick={() => removeEducation(index)}
                                    whileHover={{ scale: 1.2 }}
                                    whileTap={{ scale: 0.9 }}
                                  >
                                    <i className="bi bi-trash"></i>
                                  </motion.button>
                                </div>
                              )}
                            </div>
                            {edu.description && (
                              <p className="small text-muted mt-2 mb-0">{edu.description}</p>
                            )}
                          </motion.div>
                        ))
                      ) : (
                        <div className="text-center py-4">
                          <i className="bi bi-mortarboard text-muted display-6 mb-3"></i>
                          <p className="text-muted mb-0">No education added yet</p>
                          {isOwnProfile && isEditing && (
                            <Button
                              variant="outline-primary"
                              className="mt-2"
                              onClick={() => openEducationModal()}
                            >
                              <i className="bi bi-plus me-2"></i>
                              Add Your First Education
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </Card.Body>
                </Card>
              </motion.div>
            </div>
          </Col>
        </Row>

        {/* Save Button Footer */}
        {isOwnProfile && isEditing && (
          <motion.footer
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 text-center"
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                variant="primary"
                size="lg"
                className="rounded-pill px-5 py-3 fw-semibold shadow"
                style={{ backgroundColor: '#1e3a8a' }}
                onClick={handleSave}
                disabled={saveLoading}
              >
                {saveLoading ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <i className="bi bi-save me-2"></i>
                    Save All Changes
                  </>
                )}
              </Button>
            </motion.div>
          </motion.footer>
        )}

        {/* Footer Note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-center mt-4 pt-4"
        >
          <small className="text-muted opacity-75">
            © {new Date().getFullYear()} JobConnect. Your profile is updated in real-time.
          </small>
        </motion.div>
      </Container>

      {/* Experience Modal */}
      <ExperienceModal
        show={showExperienceModal}
        onHide={() => setShowExperienceModal(false)}
        editingExperience={editingExperience}
        onSubmit={handleExperienceSubmit}
        initialData={editingExperience}
      />

      {/* Education Modal */}
      <EducationModal
        show={showEducationModal}
        onHide={() => setShowEducationModal(false)}
        editingEducation={editingEducation}
        onSubmit={handleEducationSubmit}
        initialData={editingEducation}
      />

      {/* Remove Profile Image Confirmation Modal */}
      <Modal
        show={showRemoveConfirm}
        onHide={() => setShowRemoveConfirm(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Remove Profile Picture</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to remove your profile picture? This action cannot be undone.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowRemoveConfirm(false)}
            disabled={saveLoading}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleRemoveProfileImage}
            disabled={saveLoading}
          >
            {saveLoading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Removing...
              </>
            ) : (
              'Remove Picture'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </motion.div>
  );
}