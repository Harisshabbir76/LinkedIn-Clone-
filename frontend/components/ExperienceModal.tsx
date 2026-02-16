// components/ExperienceModal.jsx
'use client';

import { useState, useMemo } from 'react';
import { Modal, Button, Form, Row, Col, ListGroup, InputGroup } from 'react-bootstrap';
import { motion } from 'framer-motion';

const POPULAR_COMPANIES = [
  "Google", "Microsoft", "Amazon", "Apple", "Meta", "Tesla", "Netflix",
  "Adobe", "IBM", "Intel", "NVIDIA", "Oracle", "Salesforce", "Uber",
  "Airbnb", "Spotify", "Slack", "Zoom", "Shopify", "Stripe"
];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const YEARS = Array.from({ length: 50 }, (_, i) => new Date().getFullYear() - i);

export default function ExperienceModal({
  show,
  onHide,
  editingExperience,
  onSubmit,
  initialData = null
}) {
  const [formData, setFormData] = useState({
    title: '',
    company: '',
    location: '',
    startMonth: '',
    startYear: '',
    endMonth: '',
    endYear: '',
    currentlyWorking: false,
    description: '',
    customCompany: false
  });
  const [companySearch, setCompanySearch] = useState('');
  const [showCompanyList, setShowCompanyList] = useState(false);
  const [errors, setErrors] = useState({});

  // Initialize form data when modal opens or editing changes
  useState(() => {
    if (initialData) {
      const startDate = new Date(initialData.startDate);
      const endDate = initialData.endDate ? new Date(initialData.endDate) : null;
      
      setFormData({
        title: initialData.title || '',
        company: initialData.company || '',
        location: initialData.location || '',
        startMonth: MONTHS[startDate.getMonth()] || '',
        startYear: startDate.getFullYear().toString() || '',
        endMonth: endDate ? MONTHS[endDate.getMonth()] : '',
        endYear: endDate ? endDate.getFullYear().toString() : '',
        currentlyWorking: initialData.currentlyWorking || false,
        description: initialData.description || '',
        customCompany: !POPULAR_COMPANIES.includes(initialData.company)
      });
    } else {
      setFormData({
        title: '',
        company: '',
        location: '',
        startMonth: '',
        startYear: '',
        endMonth: '',
        endYear: '',
        currentlyWorking: false,
        description: '',
        customCompany: false
      });
    }
    setCompanySearch('');
    setShowCompanyList(false);
    setErrors({});
  }, [show, initialData]);

  const filteredCompanies = useMemo(() => {
    if (!companySearch) return [];
    return POPULAR_COMPANIES.filter(company =>
      company.toLowerCase().includes(companySearch.toLowerCase())
    );
  }, [companySearch]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) newErrors.title = 'Position title is required';
    if (!formData.company.trim()) newErrors.company = 'Company is required';
    if (!formData.startMonth) newErrors.startMonth = 'Start month is required';
    if (!formData.startYear) newErrors.startYear = 'Start year is required';
    
    if (!formData.currentlyWorking && (!formData.endMonth || !formData.endYear)) {
      newErrors.endDate = 'End date is required when not currently working';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    // Create date strings from month/year
    const startDate = new Date(formData.startYear, MONTHS.indexOf(formData.startMonth));
    const endDate = formData.currentlyWorking || !formData.endYear 
      ? null 
      : new Date(formData.endYear, MONTHS.indexOf(formData.endMonth));

    const experienceData = {
      title: formData.title,
      company: formData.company,
      location: formData.location,
      startDate: startDate.toISOString(),
      endDate: endDate ? endDate.toISOString() : null,
      currentlyWorking: formData.currentlyWorking,
      description: formData.description
    };

    onSubmit(experienceData);
  };

  const handleCompanySelect = (company) => {
    setFormData(prev => ({ ...prev, company }));
    setCompanySearch('');
    setShowCompanyList(false);
    if (errors.company) {
      setErrors(prev => ({ ...prev, company: '' }));
    }
  };

  const handleCompanySearchChange = (value) => {
    setCompanySearch(value);
    setShowCompanyList(value.length > 0);
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      size="lg"
      centered
      backdrop="static"
    >
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="fw-bold">
          <motion.div
            animate={{ rotate: [0, 5, 0, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 5 }}
            className="d-inline-block me-2"
          >
            <i className="bi bi-briefcase text-primary"></i>
          </motion.div>
          {editingExperience ? 'Edit Experience' : 'Add New Experience'}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="pt-0">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Form>
            {/* Position Title */}
            <Form.Group className="mb-4">
              <Form.Label className="fw-semibold">
                <i className="bi bi-card-heading me-2 text-primary"></i>
                Position Title *
              </Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g., Senior Software Engineer"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className={`py-2 border-2 ${errors.title ? 'border-danger' : ''}`}
                style={{ borderRadius: '10px' }}
              />
              {errors.title && (
                <Form.Text className="text-danger small">
                  <i className="bi bi-exclamation-circle me-1"></i>
                  {errors.title}
                </Form.Text>
              )}
            </Form.Group>

            {/* Company Selection */}
            <Form.Group className="mb-4">
              <Form.Label className="fw-semibold">
                <i className="bi bi-building me-2 text-primary"></i>
                Company *
              </Form.Label>
              
              <div className="mb-3">
                <Form.Check
                  type="switch"
                  id="custom-company-switch"
                  label="My company is not in the list"
                  checked={formData.customCompany}
                  onChange={(e) => {
                    const isCustom = e.target.checked;
                    setFormData(prev => ({ 
                      ...prev, 
                      customCompany: isCustom,
                      company: '' // Clear company when switching modes
                    }));
                    setCompanySearch('');
                    setShowCompanyList(false);
                  }}
                  className="mb-3"
                />
              </div>

              {formData.customCompany ? (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.3 }}
                >
                  <Form.Control
                    type="text"
                    placeholder="Enter company name"
                    value={formData.company}
                    onChange={(e) => handleInputChange('company', e.target.value)}
                    className={`py-2 border-2 ${errors.company ? 'border-danger' : ''}`}
                    style={{ borderRadius: '10px' }}
                  />
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.3 }}
                >
                  <InputGroup className="mb-2">
                    <InputGroup.Text className="bg-light border-end-0">
                      <i className="bi bi-search text-muted"></i>
                    </InputGroup.Text>
                    <Form.Control
                      type="text"
                      placeholder="Type to search companies..."
                      value={companySearch}
                      onChange={(e) => handleCompanySearchChange(e.target.value)}
                      className="border-start-0"
                      style={{ borderRadius: '0 10px 10px 0' }}
                    />
                  </InputGroup>

                  {showCompanyList && filteredCompanies.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <ListGroup 
                        className="border rounded-3 mt-2"
                        style={{ maxHeight: '200px', overflowY: 'auto', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                      >
                        <ListGroup.Item className="bg-light border-bottom">
                          <small className="text-muted">
                            <i className="bi bi-info-circle me-1"></i>
                            Select from popular companies
                          </small>
                        </ListGroup.Item>
                        {filteredCompanies.map((company, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                          >
                            <ListGroup.Item
                              action
                              onClick={() => handleCompanySelect(company)}
                              className={`py-3 border-0 ${index % 2 === 0 ? 'bg-white' : 'bg-light'}`}
                              style={{ cursor: 'pointer' }}
                            >
                              <div className="d-flex align-items-center">
                                <div className="rounded-circle bg-primary bg-opacity-10 p-2 me-3">
                                  <i className="bi bi-building text-primary"></i>
                                </div>
                                <span className="fw-medium">{company}</span>
                              </div>
                            </ListGroup.Item>
                          </motion.div>
                        ))}
                      </ListGroup>
                    </motion.div>
                  )}

                  {showCompanyList && filteredCompanies.length === 0 && companySearch.length > 0 && (
                    <div className="mt-2 p-3 border rounded-3 bg-light">
                      <p className="text-muted mb-0 text-center">
                        <i className="bi bi-search me-2"></i>
                        No companies found. Try a different search or use "My company is not in the list"
                      </p>
                    </div>
                  )}

                  {formData.company && !showCompanyList && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mt-3 p-3 bg-primary bg-opacity-10 rounded-3"
                    >
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <span className="fw-medium text-primary">Selected Company:</span>
                          <span className="ms-2 fw-semibold">{formData.company}</span>
                        </div>
                        <Button
                          variant="link"
                          size="sm"
                          className="text-danger p-0"
                          onClick={() => {
                            handleCompanySelect('');
                            setCompanySearch('');
                          }}
                        >
                          <i className="bi bi-x-circle"></i>
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}
              
              {errors.company && (
                <Form.Text className="text-danger small mt-2 d-block">
                  <i className="bi bi-exclamation-circle me-1"></i>
                  {errors.company}
                </Form.Text>
              )}
            </Form.Group>

            {/* Location */}
            <Form.Group className="mb-4">
              <Form.Label className="fw-semibold">
                <i className="bi bi-geo-alt me-2 text-primary"></i>
                Location
              </Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g., San Francisco, CA or Remote"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                className="py-2 border-2"
                style={{ borderRadius: '10px' }}
              />
            </Form.Group>

            {/* Employment Period */}
            <div className="mb-4">
              <h6 className="fw-semibold mb-3">
                <i className="bi bi-calendar-range me-2 text-primary"></i>
                Employment Period
              </h6>
              
              <Row className="g-3">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="small fw-medium">Start Month *</Form.Label>
                    <Form.Select
                      value={formData.startMonth}
                      onChange={(e) => handleInputChange('startMonth', e.target.value)}
                      className={`border-2 ${errors.startMonth ? 'border-danger' : ''}`}
                    >
                      <option value="">Select Month</option>
                      {MONTHS.map((month, index) => (
                        <option key={index} value={month}>{month}</option>
                      ))}
                    </Form.Select>
                    {errors.startMonth && (
                      <Form.Text className="text-danger small">
                        <i className="bi bi-exclamation-circle me-1"></i>
                        {errors.startMonth}
                      </Form.Text>
                    )}
                  </Form.Group>
                </Col>
                
                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="small fw-medium">Start Year *</Form.Label>
                    <Form.Select
                      value={formData.startYear}
                      onChange={(e) => handleInputChange('startYear', e.target.value)}
                      className={`border-2 ${errors.startYear ? 'border-danger' : ''}`}
                    >
                      <option value="">Select Year</option>
                      {YEARS.map((year, index) => (
                        <option key={index} value={year}>{year}</option>
                      ))}
                    </Form.Select>
                    {errors.startYear && (
                      <Form.Text className="text-danger small">
                        <i className="bi bi-exclamation-circle me-1"></i>
                        {errors.startYear}
                      </Form.Text>
                    )}
                  </Form.Group>
                </Col>
              </Row>

              <Form.Check
                type="checkbox"
                id="currently-working"
                label={
                  <span className="fw-medium">
                    <i className="bi bi-check-circle me-2 text-success"></i>
                    I currently work here
                  </span>
                }
                checked={formData.currentlyWorking}
                onChange={(e) => handleInputChange('currentlyWorking', e.target.checked)}
                className="mt-3 mb-3"
              />

              {!formData.currentlyWorking && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.3 }}
                >
                  <Row className="g-3">
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="small fw-medium">End Month *</Form.Label>
                        <Form.Select
                          value={formData.endMonth}
                          onChange={(e) => handleInputChange('endMonth', e.target.value)}
                          className={`border-2 ${errors.endDate ? 'border-danger' : ''}`}
                          required={!formData.currentlyWorking}
                        >
                          <option value="">Select Month</option>
                          {MONTHS.map((month, index) => (
                            <option key={index} value={month}>{month}</option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="small fw-medium">End Year *</Form.Label>
                        <Form.Select
                          value={formData.endYear}
                          onChange={(e) => handleInputChange('endYear', e.target.value)}
                          className={`border-2 ${errors.endDate ? 'border-danger' : ''}`}
                          required={!formData.currentlyWorking}
                        >
                          <option value="">Select Year</option>
                          {YEARS.map((year, index) => (
                            <option key={index} value={year}>{year}</option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  </Row>
                  {errors.endDate && (
                    <Form.Text className="text-danger small mt-2 d-block">
                      <i className="bi bi-exclamation-circle me-1"></i>
                      {errors.endDate}
                    </Form.Text>
                  )}
                </motion.div>
              )}
            </div>

            {/* Description */}
            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">
                <i className="bi bi-card-text me-2 text-primary"></i>
                Description
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                placeholder="Describe your responsibilities, achievements, and technologies used..."
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="border-2"
                style={{ borderRadius: '10px' }}
              />
              <Form.Text className="text-muted small">
                Share your key contributions and accomplishments
              </Form.Text>
            </Form.Group>
          </Form>
        </motion.div>
      </Modal.Body>

      <Modal.Footer className="border-0 pt-0">
        <Button
          variant="outline-secondary"
          onClick={onHide}
          className="rounded-pill px-4"
        >
          <i className="bi bi-x me-2"></i>
          Cancel
        </Button>
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button
            variant="primary"
            onClick={handleSubmit}
            className="rounded-pill px-4"
          >
            <i className="bi bi-check-circle me-2"></i>
            {editingExperience ? 'Update Experience' : 'Add Experience'}
          </Button>
        </motion.div>
      </Modal.Footer>
    </Modal>
  );
}