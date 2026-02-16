'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Row,
  Col,
  Card,
  Form,
  Button,
  Modal,
  Alert,
  Badge,
  Spinner,
  Table,
  InputGroup,
  FormControl
} from 'react-bootstrap';
import {
  Plus,
  Trash2,
  Edit,
  X,
  ArrowLeft,
  Search,
  Check,
  Mail,
  Copy,
  Shield
} from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface EmailConfig {
  email: string;
  isAdmin: boolean;
}

export default function EmailManagementPage() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();

  const [emails, setEmails] = useState<EmailConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [accessChecked, setAccessChecked] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // Check authentication
  useEffect(() => {
    if (!isAuthenticated && !loading && authLoading) {
      router.push('/login');
      return;
    }
    setAuthLoading(false);
  }, [isAuthenticated, loading, router, authLoading]);

  // Check admin access
  useEffect(() => {
    const checkAccess = async () => {
      if (accessChecked) return;

      if (!authLoading) {
        try {
          const token = localStorage.getItem('token');
          const response = await axios.get(`${API_BASE_URL}/api/contact-us/check-admin`, {
            headers: { Authorization: `Bearer ${token}` }
          });

          if (!response.data.isAdmin) {
            toast.error('Access denied. Admin privileges required.');
            router.push('/');
            return;
          }

          setAccessChecked(true);
          await fetchEmails();
        } catch (error: any) {
          toast.error(error.response?.data?.error || 'Failed to verify admin access');
          router.push('/');
        }
      }
    };

    checkAccess();
  }, [authLoading, router, accessChecked]);

  const fetchEmails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/api/admin/check`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Transform the data to show all admin emails
      const adminEmails = response.data.data.adminEmails || [];
      const emailList = adminEmails.map((e: string) => ({
        email: e,
        isAdmin: true
      }));

      setEmails(emailList);
    } catch (error: any) {
      console.error('Error fetching emails:', error);
      toast.error(error.response?.data?.error || 'Failed to load emails');
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmail = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    if (!/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(newEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (emails.some(e => e.email.toLowerCase() === newEmail.toLowerCase())) {
      toast.error('This email is already added');
      return;
    }

    try {
      setSubmitting(true);
      // Note: This would require a backend endpoint to add emails to the system
      // For now, we'll just simulate adding it frontend
      toast.success('Please add this email to the ADMIN_EMAILS environment variable in your backend and redeploy');
      setNewEmail('');
      setShowModal(false);
      
      // Add to local list for visual feedback
      setEmails([...emails, { email: newEmail, isAdmin: true }]);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to add email');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEmail = async (emailToDelete: string) => {
    if (window.confirm(`Are you sure you want to remove ${emailToDelete} as an admin?`)) {
      try {
        // Note: This would require a backend endpoint to remove emails
        toast.success('Please remove this email from the ADMIN_EMAILS environment variable in your backend and redeploy');
        
        // Remove from local list
        setEmails(emails.filter(e => e.email !== emailToDelete));
      } catch (error: any) {
        toast.error(error.response?.data?.error || 'Failed to delete email');
      }
    }
  };

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    toast.success('Email copied to clipboard!');
  };

  const filteredEmails = emails.filter(e =>
    e.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading || authLoading || !accessChecked) {
    return (
      <>
        <div style={{ marginTop: '80px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 80px)', background: '#F3F2EF' }}>
          <Spinner animation="border" role="status" style={{ color: '#0A66C2' }}>
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <p className="mt-3" style={{ color: '#0A66C2' }}>Loading email management...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />

      <Container fluid className="py-5" style={{ marginTop: '80px', backgroundColor: '#FFFFFF', minHeight: '100vh' }}>
        <Row className="mb-4">
          <Col>
            <div className="d-flex align-items-center gap-3 mb-4">
              <Button
                variant="link"
                onClick={() => router.back()}
                className="p-0"
                style={{ color: '#0A66C2', textDecoration: 'none' }}
              >
                <ArrowLeft size={24} />
              </Button>
              <div>
                <h1 style={{ marginBottom: '8px', color: '#000000' }}>Admin Email Management</h1>
                <p style={{ color: '#666666', marginBottom: 0 }}>Manage super admin email addresses</p>
              </div>
            </div>
          </Col>
          <Col className="text-end">
            <Button
              onClick={() => setShowModal(true)}
              style={{
                backgroundColor: '#0A66C2',
                borderColor: '#0A66C2',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginLeft: 'auto'
              }}
            >
              <Plus size={18} />
              Add Admin Email
            </Button>
          </Col>
        </Row>

        <Card style={{ backgroundColor: '#F3F2EF', border: '1px solid #D4D2CE', boxShadow: 'rgba(0, 0, 0, 0.08)' }} className="shadow-sm mb-4">
          <Card.Body>
            <InputGroup className="mb-4">
              <InputGroup.Text style={{ backgroundColor: '#FFFFFF', borderColor: '#D4D2CE' }}>
                <Search size={18} style={{ color: '#666666' }} />
              </InputGroup.Text>
              <FormControl
                placeholder="Search admin emails..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ borderColor: '#D4D2CE' }}
              />
            </InputGroup>

            {filteredEmails.length === 0 ? (
              <Alert variant="info" style={{ backgroundColor: '#E3F2FD', borderColor: '#0A66C2', color: '#004182' }} className="mb-0">
                {searchTerm ? 'No admin emails match your search.' : 'No admin emails configured yet.'}
              </Alert>
            ) : (
              <div className="table-responsive">
                <Table hover className="mb-0">
                  <thead style={{ backgroundColor: '#F3F2EF' }}>
                    <tr>
                      <th style={{ color: '#000000', borderColor: '#D4D2CE', borderBottom: '2px solid #D4D2CE' }}>Email Address</th>
                      <th style={{ color: '#000000', borderColor: '#D4D2CE', borderBottom: '2px solid #D4D2CE', width: '150px' }}>Role</th>
                      <th style={{ color: '#000000', borderColor: '#D4D2CE', borderBottom: '2px solid #D4D2CE', width: '150px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmails.map((emailConfig, index) => (
                      <tr key={index} style={{ borderColor: '#D4D2CE' }}>
                        <td className="align-middle" style={{ color: '#191919' }}>
                          <div className="d-flex align-items-center gap-2">
                            <Mail size={16} style={{ color: '#666666' }} />
                            <code style={{ color: '#0A66C2' }}>{emailConfig.email}</code>
                          </div>
                        </td>
                        <td className="align-middle">
                          <Badge style={{ backgroundColor: '#057642', color: '#FFFFFF' }} className="text-white">
                            <Shield size={14} className="me-2" style={{ display: 'inline' }} />
                            Super Admin
                          </Badge>
                        </td>
                        <td className="align-middle">
                          <div className="d-flex gap-2">
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => handleCopyEmail(emailConfig.email)}
                              title="Copy email"
                              style={{
                                borderColor: '#0A66C2',
                                color: '#0A66C2',
                                backgroundColor: 'transparent'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#E3F2FD';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }}
                            >
                              <Copy size={16} />
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleDeleteEmail(emailConfig.email)}
                              title="Delete"
                              style={{
                                borderColor: '#DC3545',
                                color: '#DC3545',
                                backgroundColor: 'transparent'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#FFE3E3';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }}
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </Card.Body>
        </Card>

        <Alert style={{ backgroundColor: '#FFF3CD', borderColor: '#FFE69C', color: '#664D03', marginTop: '20px' }}>
          <strong>Note:</strong> Admin emails are configured via the <code>ADMIN_EMAILS</code> environment variable in your backend. 
          To add or remove admin emails, update the environment variable and redeploy your application.
        </Alert>
      </Container>

      {/* Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton style={{ borderColor: '#D4D2CE' }}>
          <Modal.Title style={{ color: '#000000' }}>Add Admin Email</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleAddEmail}>
            <Form.Group className="mb-3">
              <Form.Label style={{ color: '#000000' }}>Email Address</Form.Label>
              <Form.Control
                type="email"
                placeholder="admin@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                style={{
                  borderColor: '#D4D2CE',
                  color: '#191919'
                }}
              />
              <Form.Text style={{ color: '#666666' }}>
                This email will be granted super admin privileges.
              </Form.Text>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer style={{ borderColor: '#D4D2CE' }}>
          <Button
            variant="secondary"
            onClick={() => setShowModal(false)}
            style={{
              backgroundColor: '#FFFFFF',
              borderColor: '#D4D2CE',
              color: '#0A66C2'
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAddEmail}
            disabled={submitting}
            style={{
              backgroundColor: '#0A66C2',
              borderColor: '#0A66C2',
              color: '#FFFFFF'
            }}
          >
            {submitting ? (
              <>
                <Spinner size="sm" className="me-2" />
                Adding...
              </>
            ) : (
              <>
                <Check size={16} className="me-2" style={{ display: 'inline' }} />
                Add Email
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
