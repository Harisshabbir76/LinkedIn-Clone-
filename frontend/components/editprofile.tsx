// components/EditProfile.jsx
'use client';

import { useState, useEffect } from 'react';
import { Card, Button, Form, Row, Col, Image, Badge, Alert, Spinner } from 'react-bootstrap';
import { motion } from 'framer-motion';

const EditProfile = ({ user, onSave, onCancel, onImageUpload }) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    location: '',
    linkedin: '',
    portfolio: '',
    bio: '',
    skills: [],
    education: [],
    experience: []
  });

  const [newSkill, setNewSkill] = useState('');
  const [skillProficiency, setSkillProficiency] = useState('Intermediate');
  const [educationEntry, setEducationEntry] = useState({
    institution: '',
    degree: '',
    fieldOfStudy: '',
    startYear: new Date().getFullYear(),
    endYear: '',
    description: ''
  });
  const [experienceEntry, setExperienceEntry] = useState({
    title: '',
    company: '',
    location: '',
    startDate: '',
    endDate: '',
    currentlyWorking: false,
    description: ''
  });
  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        location: user.location || '',
        linkedin: user.linkedin || '',
        portfolio: user.portfolio || '',
        bio: user.bio || '',
        skills: user.skills || [],
        education: user.education || [],
        experience: user.experience || []
      });
      setImagePreview(user.profileImage || null);
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUpload = async () => {
    if (!profileImage) return;

    setLoading(true);
    setMessage({ type: 'info', text: 'Uploading image...' });
    
    const result = await onImageUpload(profileImage);
    
    setMessage({ 
      type: result.success ? 'success' : 'error', 
      text: result.message 
    });
    setLoading(false);
  };

  const addSkill = () => {
    if (newSkill.trim()) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, { name: newSkill.trim(), proficiency: skillProficiency }]
      }));
      setNewSkill('');
    }
  };

  const removeSkill = (index) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== index)
    }));
  };

  const addEducation = () => {
    if (educationEntry.institution && educationEntry.degree) {
      setFormData(prev => ({
        ...prev,
        education: [...prev.education, { ...educationEntry }]
      }));
      setEducationEntry({
        institution: '',
        degree: '',
        fieldOfStudy: '',
        startYear: new Date().getFullYear(),
        endYear: '',
        description: ''
      });
    }
  };

  const removeEducation = (index) => {
    setFormData(prev => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index)
    }));
  };

  const addExperience = () => {
    if (experienceEntry.title && experienceEntry.company) {
      setFormData(prev => ({
        ...prev,
        experience: [...prev.experience, { ...experienceEntry }]
      }));
      setExperienceEntry({
        title: '',
        company: '',
        location: '',
        startDate: '',
        endDate: '',
        currentlyWorking: false,
        description: ''
      });
    }
  };

  const removeExperience = (index) => {
    setFormData(prev => ({
      ...prev,
      experience: prev.experience.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: 'info', text: 'Saving changes...' });

    const result = await onSave(formData);
    
    setMessage({ 
      type: result.success ? 'success' : 'error', 
      text: result.message 
    });
    setLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {message.text && (
        <Alert 
          variant={message.type === 'error' ? 'danger' : message.type === 'success' ? 'success' : 'info'} 
          className="mb-4"
        >
          {message.text}
        </Alert>
      )}

      <Card className="border-0 shadow-sm rounded-4">
        <Card.Body className="p-4 p-md-5">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <Card.Title className="h3 fw-bold text-dark">
              <i className="bi bi-pencil-square me-2 text-primary"></i>
              Edit Profile
            </Card.Title>
            <div className="d-flex gap-2">
              <Button
                variant="outline-secondary"
                onClick={onCancel}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </div>

          <Form onSubmit={handleSubmit}>
            {/* Profile Image Section */}
            <div className="mb-5">
              <h5 className="fw-bold mb-3">Profile Picture</h5>
              <Row className="align-items-center">
                <Col xs={12} md={3} className="mb-3 mb-md-0">
                  <div className="position-relative">
                    <Image
                      src={imagePreview || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name)}&background=007bff&color=fff&size=150`}
                      roundedCircle
                      width={150}
                      height={150}
                      className="border border-3 border-primary object-fit-cover"
                      style={{ objectFit: 'cover' }}
                    />
                    {profileImage && (
                      <div className="position-absolute top-0 end-0">
                        <Badge bg="success">New</Badge>
                      </div>
                    )}
                  </div>
                </Col>
                <Col xs={12} md={9}>
                  <Form.Group>
                    <Form.Label>Upload new profile picture</Form.Label>
                    <div className="d-flex gap-2">
                      <Form.Control
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="flex-grow-1"
                      />
                      <Button
                        variant="outline-primary"
                        onClick={handleImageUpload}
                        disabled={!profileImage || loading}
                      >
                        Upload
                      </Button>
                    </div>
                    <Form.Text className="text-muted">
                      JPG, PNG or GIF, max 5MB
                    </Form.Text>
                  </Form.Group>
                </Col>
              </Row>
            </div>

            {/* Basic Information */}
            <div className="mb-5">
              <h5 className="fw-bold mb-3">Basic Information</h5>
              <Row>
                <Col md={6} className="mb-3">
                  <Form.Group>
                    <Form.Label>Full Name</Form.Label>
                    <Form.Control
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={6} className="mb-3">
                  <Form.Group>
                    <Form.Label>Phone Number</Form.Label>
                    <Form.Control
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                    />
                  </Form.Group>
                </Col>
                <Col md={6} className="mb-3">
                  <Form.Group>
                    <Form.Label>Location</Form.Label>
                    <Form.Control
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      placeholder="City, Country"
                    />
                  </Form.Group>
                </Col>
                <Col md={6} className="mb-3">
                  <Form.Group>
                    <Form.Label>LinkedIn Profile</Form.Label>
                    <Form.Control
                      type="url"
                      name="linkedin"
                      value={formData.linkedin}
                      onChange={handleInputChange}
                      placeholder="https://linkedin.com/in/username"
                    />
                  </Form.Group>
                </Col>
                <Col xs={12} className="mb-3">
                  <Form.Group>
                    <Form.Label>Portfolio/Website</Form.Label>
                    <Form.Control
                      type="url"
                      name="portfolio"
                      value={formData.portfolio}
                      onChange={handleInputChange}
                      placeholder="https://yourportfolio.com"
                    />
                  </Form.Group>
                </Col>
                <Col xs={12}>
                  <Form.Group>
                    <Form.Label>Bio</Form.Label>
                    <Form.Control
                      as="textarea"
                      name="bio"
                      value={formData.bio}
                      onChange={handleInputChange}
                      rows={4}
                      placeholder="Tell us about yourself..."
                    />
                  </Form.Group>
                </Col>
              </Row>
            </div>

            {/* Skills Section */}
            <div className="mb-5">
              <h5 className="fw-bold mb-3">Skills</h5>
              <div className="d-flex flex-wrap gap-2 mb-3">
                {formData.skills.map((skill, index) => (
                  <Badge
                    key={index}
                    bg="primary"
                    className="px-3 py-2 rounded-pill d-flex align-items-center"
                  >
                    {typeof skill === 'string' ? skill : skill.name}
                    {skill.proficiency && (
                      <Badge bg="light" text="dark" className="ms-2">
                        {skill.proficiency}
                      </Badge>
                    )}
                    <Button
                      variant="link"
                      className="text-white ms-2 p-0"
                      style={{ fontSize: '0.8rem' }}
                      onClick={() => removeSkill(index)}
                    >
                      <i className="bi bi-x"></i>
                    </Button>
                  </Badge>
                ))}
              </div>
              <Row className="align-items-end">
                <Col md={6} className="mb-2">
                  <Form.Group>
                    <Form.Label>Add New Skill</Form.Label>
                    <Form.Control
                      type="text"
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      placeholder="Enter skill name"
                    />
                  </Form.Group>
                </Col>
                <Col md={4} className="mb-2">
                  <Form.Group>
                    <Form.Label>Proficiency</Form.Label>
                    <Form.Select
                      value={skillProficiency}
                      onChange={(e) => setSkillProficiency(e.target.value)}
                    >
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                      <option value="Expert">Expert</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={2} className="mb-2">
                  <Button
                    variant="outline-primary"
                    onClick={addSkill}
                    disabled={!newSkill.trim()}
                    className="w-100"
                  >
                    Add
                  </Button>
                </Col>
              </Row>
            </div>

            {/* Education Section */}
            <div className="mb-5">
              <h5 className="fw-bold mb-3">Education</h5>
              {formData.education.map((edu, index) => (
                <Card key={index} className="mb-3">
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <h6 className="mb-0">{edu.degree}</h6>
                      <Button
                        variant="link"
                        className="text-danger p-0"
                        onClick={() => removeEducation(index)}
                      >
                        <i className="bi bi-trash"></i>
                      </Button>
                    </div>
                    <p className="text-muted mb-2">{edu.institution}</p>
                    <small className="text-muted">
                      {edu.startYear} - {edu.endYear || 'Present'}
                      {edu.fieldOfStudy && ` • ${edu.fieldOfStudy}`}
                    </small>
                    {edu.description && (
                      <p className="mt-2 mb-0">{edu.description}</p>
                    )}
                  </Card.Body>
                </Card>
              ))}
              <Row className="g-2">
                <Col md={4}>
                  <Form.Control
                    type="text"
                    placeholder="Institution"
                    value={educationEntry.institution}
                    onChange={(e) => setEducationEntry(prev => ({ ...prev, institution: e.target.value }))}
                  />
                </Col>
                <Col md={4}>
                  <Form.Control
                    type="text"
                    placeholder="Degree"
                    value={educationEntry.degree}
                    onChange={(e) => setEducationEntry(prev => ({ ...prev, degree: e.target.value }))}
                  />
                </Col>
                <Col md={2}>
                  <Form.Control
                    type="number"
                    placeholder="Start Year"
                    value={educationEntry.startYear}
                    onChange={(e) => setEducationEntry(prev => ({ ...prev, startYear: e.target.value }))}
                  />
                </Col>
                <Col md={2}>
                  <Form.Control
                    type="number"
                    placeholder="End Year"
                    value={educationEntry.endYear}
                    onChange={(e) => setEducationEntry(prev => ({ ...prev, endYear: e.target.value }))}
                  />
                </Col>
                <Col xs={12}>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    placeholder="Description (optional)"
                    value={educationEntry.description}
                    onChange={(e) => setEducationEntry(prev => ({ ...prev, description: e.target.value }))}
                    className="mt-2"
                  />
                </Col>
                <Col xs={12} className="mt-2">
                  <Button
                    variant="outline-primary"
                    onClick={addEducation}
                    disabled={!educationEntry.institution || !educationEntry.degree}
                  >
                    <i className="bi bi-plus-circle me-2"></i>
                    Add Education
                  </Button>
                </Col>
              </Row>
            </div>

            {/* Experience Section */}
            <div className="mb-5">
              <h5 className="fw-bold mb-3">Experience</h5>
              {formData.experience.map((exp, index) => (
                <Card key={index} className="mb-3">
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <div>
                        <h6 className="mb-0">{exp.title}</h6>
                        <p className="text-muted mb-0">{exp.company}</p>
                      </div>
                      <Button
                        variant="link"
                        className="text-danger p-0"
                        onClick={() => removeExperience(index)}
                      >
                        <i className="bi bi-trash"></i>
                      </Button>
                    </div>
                    <p className="text-muted mb-2">{exp.location}</p>
                    <small className="text-muted">
                      {new Date(exp.startDate).toLocaleDateString()} - 
                      {exp.currentlyWorking ? ' Present' : ` ${new Date(exp.endDate).toLocaleDateString()}`}
                    </small>
                    {exp.description && (
                      <p className="mt-2 mb-0">{exp.description}</p>
                    )}
                  </Card.Body>
                </Card>
              ))}
              <Row className="g-2">
                <Col md={6}>
                  <Form.Control
                    type="text"
                    placeholder="Job Title"
                    value={experienceEntry.title}
                    onChange={(e) => setExperienceEntry(prev => ({ ...prev, title: e.target.value }))}
                  />
                </Col>
                <Col md={6}>
                  <Form.Control
                    type="text"
                    placeholder="Company"
                    value={experienceEntry.company}
                    onChange={(e) => setExperienceEntry(prev => ({ ...prev, company: e.target.value }))}
                  />
                </Col>
                <Col md={6} className="mt-2">
                  <Form.Control
                    type="text"
                    placeholder="Location"
                    value={experienceEntry.location}
                    onChange={(e) => setExperienceEntry(prev => ({ ...prev, location: e.target.value }))}
                  />
                </Col>
                <Col md={6} className="mt-2">
                  <Form.Control
                    type="date"
                    placeholder="Start Date"
                    value={experienceEntry.startDate}
                    onChange={(e) => setExperienceEntry(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                </Col>
                <Col md={6} className="mt-2">
                  <Form.Control
                    type="date"
                    placeholder="End Date"
                    value={experienceEntry.endDate}
                    onChange={(e) => setExperienceEntry(prev => ({ ...prev, endDate: e.target.value }))}
                    disabled={experienceEntry.currentlyWorking}
                  />
                </Col>
                <Col md={6} className="mt-2 d-flex align-items-center">
                  <Form.Check
                    type="checkbox"
                    label="I currently work here"
                    checked={experienceEntry.currentlyWorking}
                    onChange={(e) => setExperienceEntry(prev => ({ ...prev, currentlyWorking: e.target.checked }))}
                  />
                </Col>
                <Col xs={12} className="mt-2">
                  <Form.Control
                    as="textarea"
                    rows={3}
                    placeholder="Description"
                    value={experienceEntry.description}
                    onChange={(e) => setExperienceEntry(prev => ({ ...prev, description: e.target.value }))}
                  />
                </Col>
                <Col xs={12} className="mt-2">
                  <Button
                    variant="outline-primary"
                    onClick={addExperience}
                    disabled={!experienceEntry.title || !experienceEntry.company}
                  >
                    <i className="bi bi-plus-circle me-2"></i>
                    Add Experience
                  </Button>
                </Col>
              </Row>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </motion.div>
  );
};

export default EditProfile;