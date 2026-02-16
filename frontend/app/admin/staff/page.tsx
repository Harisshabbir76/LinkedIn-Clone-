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
  Shield,
  Mail
} from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface StaffMember {
  _id: string;
  email: string;
  name: string;
  departments: string[];
  createdAt: string;
}

export default function StaffManagementPage() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ email: '', name: '', departments: [] as string[] });
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [accessChecked, setAccessChecked] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  const departments = [
    'General Inquiry',
    'Technical Support',
    'Billing',
    'Privacy Concerns',
    'Bug Report',
    'Feature Request'
  ];

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
          await fetchStaff();
        } catch (error: any) {
          toast.error(error.response?.data?.error || 'Failed to verify admin access');
          router.push('/');
        }
      }
    };

    checkAccess();
  }, [authLoading, router, accessChecked]);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/api/admin/staff`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setStaff(response.data.staff || []);
    } catch (error: any) {
      console.error('Error fetching staff:', error);
      toast.error(error.response?.data?.error || 'Failed to load staff');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (staffMember?: StaffMember) => {
    if (staffMember) {
      setEditingId(staffMember._id);
      setFormData({
        email: staffMember.email,
        name: staffMember.name,
        departments: staffMember.departments
      });
    } else {
      setEditingId(null);
      setFormData({ email: '', name: '', departments: [] });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData({ email: '', name: '', departments: [] });
  };

  const handleDepartmentToggle = (dept: string) => {
    setFormData(prev => ({
      ...prev,
      departments: prev.departments.includes(dept)
        ? prev.departments.filter(d => d !== dept)
        : [...prev.departments, dept]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email.trim() || !formData.name.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    if (formData.departments.length === 0) {
      toast.error('Please select at least one department');
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      // Normalize email before sending to backend
      const payload = { ...formData } as any;
      if (!editingId && payload.email) payload.email = payload.email.trim().toLowerCase();

      if (editingId) {
        // Update existing staff
        await axios.put(`${API_BASE_URL}/api/admin/staff/${editingId}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Staff member updated successfully');
      } else {
        // Add new staff
        const response = await axios.post(`${API_BASE_URL}/api/admin/staff`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });

        // Backend returns 201 for new create, 200 for reactivation
        if (response.status === 200 && response.data && response.data.message) {
          toast.success(response.data.message);
        } else {
          toast.success('Staff member added successfully');
        }
      }

      handleCloseModal();
      await fetchStaff();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save staff member');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this staff member?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`${API_BASE_URL}/api/admin/staff/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Staff member deleted successfully');
        await fetchStaff();
      } catch (error: any) {
        toast.error(error.response?.data?.error || 'Failed to delete staff member');
      }
    }
  };

  const filteredStaff = staff.filter(s =>
    s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading || authLoading || !accessChecked) {
    return (
      <>
        <div style={{ marginTop: '80px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 80px)', background: '#F3F2EF' }}>
          <div className="spinner">
            <div className="bounce1"></div>
            <div className="bounce2"></div>
            <div className="bounce3"></div>
          </div>
          <p className="mt-3 text-primary">Loading staff management...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />

      <Container fluid className="py-5" style={{ marginTop: '80px' }}>
        <Row className="mb-4">
          <Col>
            <div className="d-flex align-items-center gap-3 mb-4">
              <Button
                variant="link"
                onClick={() => router.back()}
                className="text-primary p-0"
              >
                <ArrowLeft size={24} />
              </Button>
              <div>
                <h1 className="mb-2">Staff Management</h1>
                <p className="text-muted">Add and manage staff members with department permissions</p>
              </div>
            </div>
          </Col>
          <Col className="text-end">
            <Button
              variant="primary"
              onClick={() => handleOpenModal()}
              className="d-flex align-items-center gap-2"
            >
              <Plus size={18} />
              Add Staff Member
            </Button>
          </Col>
        </Row>

        <Card className="shadow-sm mb-4">
          <Card.Body>
            <InputGroup className="mb-4">
              <InputGroup.Text className="bg-white border-end-0">
                <Search size={18} />
              </InputGroup.Text>
              <FormControl
                placeholder="Search by email or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border-start-0"
              />
            </InputGroup>

            {filteredStaff.length === 0 ? (
              <Alert variant="info" className="mb-0">
                {searchTerm ? 'No staff members match your search.' : 'No staff members yet. Add one to get started.'}
              </Alert>
            ) : (
              <div className="table-responsive">
                <Table hover className="mb-0">
                  <thead className="bg-light">
                    <tr>
                      <th style={{ width: '30%' }}>Email</th>
                      <th style={{ width: '20%' }}>Name</th>
                      <th style={{ width: '40%' }}>Departments</th>
                      <th style={{ width: '10%' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStaff.map((member) => (
                      <tr key={member._id}>
                        <td className="align-middle">
                          <div className="d-flex align-items-center gap-2">
                            <Mail size={16} className="text-muted" />
                            <code>{member.email}</code>
                          </div>
                        </td>
                        <td className="align-middle">{member.name}</td>
                        <td className="align-middle">
                          <div className="d-flex flex-wrap gap-2">
                            {member.departments.map((dept) => (
                              <Badge key={dept} bg="info" className="text-white">
                                {dept}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="align-middle">
                          <div className="d-flex gap-2">
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => handleOpenModal(member)}
                              title="Edit"
                            >
                              <Edit size={16} />
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleDelete(member._id)}
                              title="Delete"
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
      </Container>

      {/* Modal */}
      <Modal show={showModal} onHide={handleCloseModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {editingId ? 'Edit Staff Member' : 'Add New Staff Member'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Email Address</Form.Label>
              <Form.Control
                type="email"
                placeholder="staff@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={!!editingId}
              />
              {editingId && <small className="text-muted">Email cannot be changed</small>}
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Full Name</Form.Label>
              <Form.Control
                type="text"
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label className="mb-3">
                <strong>Assign Departments</strong>
              </Form.Label>
              <div className="d-flex flex-column gap-2">
                {departments.map((dept) => (
                  <Form.Check
                    key={dept}
                    type="checkbox"
                    id={`dept-${dept}`}
                    label={dept}
                    checked={formData.departments.includes(dept)}
                    onChange={() => handleDepartmentToggle(dept)}
                  />
                ))}
              </div>
              {formData.departments.length === 0 && (
                <small className="text-danger d-block mt-2">Select at least one department</small>
              )}
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Spinner size="sm" className="me-2" />
                Saving...
              </>
            ) : (
              <>
                <Check size={16} className="me-2" />
                {editingId ? 'Update Staff' : 'Add Staff'}
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      <style jsx>{`
        .blue-white-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: calc(100vh - 80px);
          background: linear-gradient(135deg, #e3f2fd 0%, #f5f5f5 100%);
        }

        .spinner {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 80px;
          gap: 10px;
        }

        .bounce1, .bounce2, .bounce3 {
          height: 15px;
          width: 15px;
          background-color: #0d6efd;
          border-radius: 100%;
          display: inline-block;
          animation: sk-bounce 1.4s infinite ease-in-out both;
        }

        .bounce2 {
          animation-delay: -0.2s;
        }

        .bounce3 {
          animation-delay: -0.4s;
        }

        @keyframes sk-bounce {
          0%, 80%, 100% {
            transform: scale(0);
            opacity: 0.5;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}
