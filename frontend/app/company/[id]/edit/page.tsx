'use client';

import { useState, useEffect, use } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Container, 
  Row, 
  Col, 
  Card, 
  Form, 
  Button, 
  Alert, 
  Spinner,
  Image,
  InputGroup,
  FormControl,
  FloatingLabel
} from 'react-bootstrap';
import { 
  FaArrowLeft, 
  FaSave, 
  FaTrash, 
  FaUpload, 
  FaTimes,
  FaBuilding,
  FaGlobe,
  FaMapMarkerAlt,
  FaPhone,
  FaEnvelope,
  FaIndustry,
  FaUsers,
  FaCalendarAlt,
  FaLinkedin,
  FaTwitter,
  FaFacebook,
  FaInstagram
} from 'react-icons/fa';
import { toast, Toaster } from 'react-hot-toast';
import { useAuth } from '../../../../context/AuthContext';

const API_BASE_URL = 'http://localhost:5000/api';

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
  };
}

export default function EditCompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const { id } = unwrappedParams;
  
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    description: '',
    website: '',
    location: '',
    industry: '',
    size: '',
    foundedYear: '',
    phone: '',
    socialLinks: {
      linkedin: '',
      twitter: '',
      facebook: '',
      instagram: ''
    }
  });
  
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string>('');

  const industryOptions = [
    'Technology',
    'Healthcare',
    'Finance',
    'Education',
    'Retail',
    'Manufacturing',
    'Real Estate',
    'Hospitality',
    'Transportation',
    'Media & Entertainment',
    'Energy',
    'Telecommunications',
    'Agriculture',
    'Construction',
    'Consulting',
    'Marketing',
    'Legal',
    'Non-profit',
    'Other'
  ];
  
  const sizeOptions = [
    '1-10',
    '11-50',
    '51-200',
    '201-500',
    '501-1000',
    '1000+'
  ];

  useEffect(() => {
    // Check authentication immediately
    if (!authLoading) {
      checkAccessPermission();
    }
  }, [authLoading]);

  useEffect(() => {
    if (isAuthenticated && user && !accessDenied) {
      fetchCompanyDetails();
    }
  }, [isAuthenticated, user, accessDenied]);

  const checkAccessPermission = () => {
    // If not authenticated, redirect to 404
    if (!isAuthenticated) {
      setAccessDenied(true);
      router.push('/404');
      return false;
    }
    
    // If authenticated but no user object, still redirect
    if (!user) {
      setAccessDenied(true);
      router.push('/404');
      return false;
    }
    
    return true;
  };

  const fetchCompanyDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Authentication required');
        router.push('/404');
        return;
      }
      
      const response = await fetch(`${API_BASE_URL}/company/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          router.push('/404');
          return;
        }
        if (response.status === 403) {
          router.push('/404');
          return;
        }
        throw new Error('Failed to fetch company details');
      }
      
      const data = await response.json();
      const fetchedCompany = data.company;
      
      // Check if user is owner - FIXED: Added null check for user
      if (!user) {
        router.push('/404');
        return;
      }
      
      if (user._id !== fetchedCompany.owner._id) {
        // User is not the owner, redirect to 404
        router.push('/404');
        return;
      }
      
      setCompany(fetchedCompany);
      
      // Set form data
      setFormData({
        name: fetchedCompany.name || '',
        email: fetchedCompany.email || '',
        description: fetchedCompany.description || '',
        website: fetchedCompany.website || '',
        location: fetchedCompany.location || '',
        industry: fetchedCompany.industry || '',
        size: fetchedCompany.size || '',
        foundedYear: fetchedCompany.foundedYear?.toString() || '',
        phone: fetchedCompany.phone || '',
        socialLinks: {
          linkedin: fetchedCompany.socialLinks?.linkedin || '',
          twitter: fetchedCompany.socialLinks?.twitter || '',
          facebook: fetchedCompany.socialLinks?.facebook || '',
          instagram: fetchedCompany.socialLinks?.instagram || ''
        }
      });
      
      // Set image previews
      if (fetchedCompany.logo) {
        setLogoPreview(getImageUrl(fetchedCompany.logo));
      }
      
      if (fetchedCompany.coverImage) {
        setCoverPreview(getImageUrl(fetchedCompany.coverImage));
      }
      
    } catch (error: any) {
      console.error('Error fetching company:', error);
      // Don't show error, just redirect to 404
      router.push('/404');
    } finally {
      setLoading(false);
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name.startsWith('socialLinks.')) {
      const socialField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        socialLinks: {
          ...prev.socialLinks,
          [socialField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview('');
  };

  const removeCover = () => {
    setCoverFile(null);
    setCoverPreview('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!company) return;
    
    try {
      setSaving(true);
      
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Authentication required');
        router.push('/404');
        return;
      }
      
      // Create form data for file upload
      const formDataToSend = new FormData();
      
      // Add form fields
      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'socialLinks') {
          formDataToSend.append(key, JSON.stringify(value));
        } else {
          formDataToSend.append(key, value as string);
        }
      });
      
      // Add files if selected
      if (logoFile) {
        formDataToSend.append('logo', logoFile);
      }
      
      if (coverFile) {
        formDataToSend.append('coverImage', coverFile);
      }
      
      const response = await fetch(`${API_BASE_URL}/company/${id}/update`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Failed to update company');
      }
      
      const data = await response.json();
      
      toast.success('Company updated successfully!');
      
      // Redirect to company page after successful update
      setTimeout(() => {
        router.push(`/company/${id}`);
        router.refresh();
      }, 1500);
      
    } catch (error: any) {
      console.error('Error updating company:', error);
      toast.error(error.message || 'Failed to update company');
    } finally {
      setSaving(false);
    }
  };

  const deleteLogo = async () => {
    if (!company || !company.logo) {
      toast.error('No logo to delete');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/company/${id}/logo`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        setLogoPreview('');
        setCompany(prev => prev ? { ...prev, logo: '' } : null);
        toast.success('Logo deleted successfully');
      } else {
        throw new Error('Failed to delete logo');
      }
    } catch (error: any) {
      console.error('Error deleting logo:', error);
      toast.error(error.message || 'Failed to delete logo');
    }
  };

  const deleteCover = async () => {
    if (!company || !company.coverImage) {
      toast.error('No cover image to delete');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/company/${id}/cover`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        setCoverPreview('');
        setCompany(prev => prev ? { ...prev, coverImage: '' } : null);
        toast.success('Cover image deleted successfully');
      } else {
        throw new Error('Failed to delete cover image');
      }
    } catch (error: any) {
      console.error('Error deleting cover image:', error);
      toast.error(error.message || 'Failed to delete cover image');
    }
  };

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  // If access denied, don't show anything (already redirected to 404)
  if (accessDenied) {
    return null;
  }

  // Show loading while fetching company details
  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  // If no company data (should have redirected to 404 already)
  if (!company) {
    return null;
  }

  return (
    <>
      <Toaster position="top-right" />
      
      <Container className="py-4">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <Button 
              variant="outline-primary" 
              className="mb-3 d-flex align-items-center"
              onClick={() => router.push(`/company/${id}`)}
            >
              <FaArrowLeft className="me-2" />
              Back to Company
            </Button>
            <h1 className="display-6 fw-bold">Edit Company</h1>
            <p className="text-muted">Update your company information</p>
          </div>
        </div>

        <Form onSubmit={handleSubmit}>
          <Row>
            {/* Left Column - Main Information */}
            <Col lg={8}>
              <Card className="border-0 shadow-sm mb-4">
                <Card.Body className="p-4">
                  <Card.Title className="h5 fw-bold mb-4">
                    <FaBuilding className="me-2" />
                    Basic Information
                  </Card.Title>
                  
                  <Row className="g-3">
                    <Col md={6}>
                      <FloatingLabel controlId="name" label="Company Name" className="mb-3">
                        <Form.Control
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          required
                          placeholder="Company Name"
                        />
                      </FloatingLabel>
                    </Col>
                    
                    <Col md={6}>
                      <FloatingLabel controlId="email" label="Email Address" className="mb-3">
                        <Form.Control
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          required
                          placeholder="Email Address"
                        />
                      </FloatingLabel>
                    </Col>
                    
                    <Col md={6}>
                      <FloatingLabel controlId="industry" label="Industry" className="mb-3">
                        <Form.Select
                          name="industry"
                          value={formData.industry}
                          onChange={handleInputChange}
                          required
                        >
                          <option value="">Select Industry</option>
                          {industryOptions.map((industry) => (
                            <option key={industry} value={industry}>
                              {industry}
                            </option>
                          ))}
                        </Form.Select>
                      </FloatingLabel>
                    </Col>
                    
                    <Col md={6}>
                      <FloatingLabel controlId="size" label="Company Size" className="mb-3">
                        <Form.Select
                          name="size"
                          value={formData.size}
                          onChange={handleInputChange}
                          required
                        >
                          <option value="">Select Size</option>
                          {sizeOptions.map((size) => (
                            <option key={size} value={size}>
                              {size}
                            </option>
                          ))}
                        </Form.Select>
                      </FloatingLabel>
                    </Col>
                    
                    <Col md={6}>
                      <FloatingLabel controlId="location" label="Location" className="mb-3">
                        <Form.Control
                          type="text"
                          name="location"
                          value={formData.location}
                          onChange={handleInputChange}
                          required
                          placeholder="Location"
                        />
                      </FloatingLabel>
                    </Col>
                    
                    <Col md={6}>
                      <FloatingLabel controlId="foundedYear" label="Founded Year" className="mb-3">
                        <Form.Control
                          type="number"
                          name="foundedYear"
                          value={formData.foundedYear}
                          onChange={handleInputChange}
                          placeholder="Founded Year"
                          min="1800"
                          max={new Date().getFullYear()}
                        />
                      </FloatingLabel>
                    </Col>
                    
                    <Col md={6}>
                      <FloatingLabel controlId="website" label="Website" className="mb-3">
                        <Form.Control
                          type="url"
                          name="website"
                          value={formData.website}
                          onChange={handleInputChange}
                          placeholder="Website"
                        />
                      </FloatingLabel>
                    </Col>
                    
                    <Col md={6}>
                      <FloatingLabel controlId="phone" label="Phone Number" className="mb-3">
                        <Form.Control
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          placeholder="Phone Number"
                        />
                      </FloatingLabel>
                    </Col>
                    
                    <Col xs={12}>
                      <FloatingLabel controlId="description" label="Company Description" className="mb-3">
                        <Form.Control
                          as="textarea"
                          name="description"
                          value={formData.description}
                          onChange={handleInputChange}
                          required
                          placeholder="Company Description"
                          style={{ height: '150px' }}
                        />
                      </FloatingLabel>
                      <Form.Text className="text-muted">
                        Describe your company in detail. Minimum 50 characters.
                      </Form.Text>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              {/* Social Media */}
              <Card className="border-0 shadow-sm mb-4">
                <Card.Body className="p-4">
                  <Card.Title className="h5 fw-bold mb-4">
                    Social Media Links
                  </Card.Title>
                  
                  <Row className="g-3">
                    <Col md={6}>
                      <InputGroup className="mb-3">
                        <InputGroup.Text>
                          <FaLinkedin className="text-primary" />
                        </InputGroup.Text>
                        <FormControl
                          placeholder="LinkedIn URL"
                          name="socialLinks.linkedin"
                          value={formData.socialLinks.linkedin}
                          onChange={handleInputChange}
                        />
                      </InputGroup>
                    </Col>
                    
                    <Col md={6}>
                      <InputGroup className="mb-3">
                        <InputGroup.Text>
                          <FaTwitter className="text-info" />
                        </InputGroup.Text>
                        <FormControl
                          placeholder="Twitter URL"
                          name="socialLinks.twitter"
                          value={formData.socialLinks.twitter}
                          onChange={handleInputChange}
                        />
                      </InputGroup>
                    </Col>
                    
                    <Col md={6}>
                      <InputGroup className="mb-3">
                        <InputGroup.Text>
                          <FaFacebook className="text-primary" />
                        </InputGroup.Text>
                        <FormControl
                          placeholder="Facebook URL"
                          name="socialLinks.facebook"
                          value={formData.socialLinks.facebook}
                          onChange={handleInputChange}
                        />
                      </InputGroup>
                    </Col>
                    
                    <Col md={6}>
                      <InputGroup className="mb-3">
                        <InputGroup.Text>
                          <FaInstagram className="text-danger" />
                        </InputGroup.Text>
                        <FormControl
                          placeholder="Instagram URL"
                          name="socialLinks.instagram"
                          value={formData.socialLinks.instagram}
                          onChange={handleInputChange}
                        />
                      </InputGroup>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>

            {/* Right Column - Images & Actions */}
            <Col lg={4}>
              {/* Logo Upload */}
              <Card className="border-0 shadow-sm mb-4">
                <Card.Body className="p-4">
                  <Card.Title className="h5 fw-bold mb-4">
                    Company Logo
                  </Card.Title>
                  
                  <div className="text-center mb-3">
                    <div 
                      className="rounded-circle border mx-auto d-flex align-items-center justify-content-center"
                      style={{ 
                        width: '150px', 
                        height: '150px',
                        backgroundColor: '#f8f9fa',
                        overflow: 'hidden'
                      }}
                    >
                      {logoPreview ? (
                        <Image
                          src={logoPreview}
                          alt="Logo preview"
                          className="w-100 h-100 object-fit-cover"
                          roundedCircle
                        />
                      ) : (
                        <FaBuilding size={48} className="text-primary" />
                      )}
                    </div>
                    
                    {logoPreview && (
                      <div className="mt-2">
                        <Button
                          variant="outline-danger"
                          size="sm"
                          className="me-2"
                          onClick={removeLogo}
                        >
                          <FaTimes className="me-1" />
                          Remove New
                        </Button>
                        
                        {company.logo && (
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={deleteLogo}
                          >
                            <FaTrash className="me-1" />
                            Delete Current
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <Form.Group controlId="logo" className="mb-3">
                    <Form.Label>Upload New Logo</Form.Label>
                    <Form.Control
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                    />
                    <Form.Text className="text-muted">
                      Recommended: Square image, min 300x300 pixels
                    </Form.Text>
                  </Form.Group>
                </Card.Body>
              </Card>

              {/* Cover Image Upload */}
              <Card className="border-0 shadow-sm mb-4">
                <Card.Body className="p-4">
                  <Card.Title className="h5 fw-bold mb-4">
                    Cover Image
                  </Card.Title>
                  
                  <div className="mb-3">
                    <div 
                      className="border rounded d-flex align-items-center justify-content-center"
                      style={{ 
                        width: '100%', 
                        height: '150px',
                        backgroundColor: '#f8f9fa',
                        overflow: 'hidden'
                      }}
                    >
                      {coverPreview ? (
                        <Image
                          src={coverPreview}
                          alt="Cover preview"
                          className="w-100 h-100 object-fit-cover"
                        />
                      ) : (
                        <FaBuilding size={48} className="text-primary" />
                      )}
                    </div>
                    
                    {coverPreview && (
                      <div className="mt-2">
                        <Button
                          variant="outline-danger"
                          size="sm"
                          className="me-2"
                          onClick={removeCover}
                        >
                          <FaTimes className="me-1" />
                          Remove New
                        </Button>
                        
                        {company.coverImage && (
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={deleteCover}
                          >
                            <FaTrash className="me-1" />
                            Delete Current
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <Form.Group controlId="coverImage" className="mb-3">
                    <Form.Label>Upload New Cover Image</Form.Label>
                    <Form.Control
                      type="file"
                      accept="image/*"
                      onChange={handleCoverChange}
                    />
                    <Form.Text className="text-muted">
                      Recommended: 1200x300 pixels, landscape orientation
                    </Form.Text>
                  </Form.Group>
                </Card.Body>
              </Card>

              {/* Save Actions */}
              <Card className="border-0 shadow-sm mb-4">
                <Card.Body className="p-4">
                  <div className="d-grid gap-2">
                    <Button
                      variant="primary"
                      type="submit"
                      size="lg"
                      disabled={saving}
                      className="d-flex align-items-center justify-content-center"
                    >
                      {saving ? (
                        <>
                          <Spinner animation="border" size="sm" className="me-2" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <FaSave className="me-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                    
                    <Button
                      variant="outline-secondary"
                      onClick={() => router.push(`/company/${id}`)}
                    >
                      Cancel
                    </Button>
                  </div>
                  
                  <div className="mt-4">
                    <h6 className="fw-bold mb-2">Tips for a great company profile:</h6>
                    <ul className="small text-muted mb-0">
                      <li>Use a professional logo and cover image</li>
                      <li>Write a detailed company description</li>
                      <li>Keep contact information up-to-date</li>
                      <li>Add social media links for better engagement</li>
                      <li>Update company size and industry accurately</li>
                    </ul>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Form>
      </Container>
    </>
  );
}