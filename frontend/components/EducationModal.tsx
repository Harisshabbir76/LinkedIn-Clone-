// components/EducationModal.jsx
'use client';

import { useState, useMemo } from 'react';
import { Modal, Button, Form, Row, Col, ListGroup, InputGroup } from 'react-bootstrap';
import { motion } from 'framer-motion';

const POPULAR_UNIVERSITIES = [
  "Harvard University", "Stanford University", "MIT", "Cambridge University",
  "Oxford University", "Princeton University", "Yale University", "Columbia University",
  "University of California, Berkeley", "University of Chicago", "Cornell University",
  "University of Pennsylvania", "Johns Hopkins University", "University of Michigan",
  "University of Toronto", "University of British Columbia", "McGill University",
  "University of Waterloo", "University of Texas at Austin", "Georgia Institute of Technology"
];

const DEGREE_FIELDS = [
  "Computer Science", "Engineering", "Business Administration", "Medicine",
  "Law", "Psychology", "Biology", "Chemistry", "Physics", "Mathematics",
  "Economics", "Finance", "Marketing", "Architecture", "Design",
  "Education", "Nursing", "Pharmacy", "Communications", "Environmental Science"
];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const YEARS = Array.from({ length: 50 }, (_, i) => new Date().getFullYear() - i);

export default function EducationModal({
  show,
  onHide,
  editingEducation,
  onSubmit,
  initialData = null
}) {
  const [formData, setFormData] = useState({
    institution: '',
    degree: '',
    fieldOfStudy: '',
    startMonth: '',
    startYear: '',
    endMonth: '',
    endYear: '',
    currentlyStudying: false,
    description: '',
    customInstitution: false
  });
  const [institutionSearch, setInstitutionSearch] = useState('');
  const [fieldSearch, setFieldSearch] = useState('');
  const [showInstitutionList, setShowInstitutionList] = useState(false);
  const [showFieldList, setShowFieldList] = useState(false);
  const [errors, setErrors] = useState({});

  // Initialize form data
  useState(() => {
    if (initialData) {
      setFormData({
        institution: initialData.institution || '',
        degree: initialData.degree || '',
        fieldOfStudy: initialData.fieldOfStudy || '',
        startMonth: MONTHS[initialData.startMonth - 1] || '',
        startYear: initialData.startYear?.toString() || '',
        endMonth: initialData.endMonth ? MONTHS[initialData.endMonth - 1] : '',
        endYear: initialData.endYear?.toString() || '',
        currentlyStudying: !initialData.endYear,
        description: initialData.description || '',
        customInstitution: !POPULAR_UNIVERSITIES.includes(initialData.institution)
      });
    } else {
      setFormData({
        institution: '',
        degree: '',
        fieldOfStudy: '',
        startMonth: '',
        startYear: '',
        endMonth: '',
        endYear: '',
        currentlyStudying: false,
        description: '',
        customInstitution: false
      });
    }
    setInstitutionSearch('');
    setFieldSearch('');
    setShowInstitutionList(false);
    setShowFieldList(false);
    setErrors({});
  }, [show, initialData]);

  const filteredInstitutions = useMemo(() => {
    if (!institutionSearch) return [];
    return POPULAR_UNIVERSITIES.filter(institution =>
      institution.toLowerCase().includes(institutionSearch.toLowerCase())
    );
  }, [institutionSearch]);

  const filteredFields = useMemo(() => {
    if (!fieldSearch) return [];
    return DEGREE_FIELDS.filter(field =>
      field.toLowerCase().includes(fieldSearch.toLowerCase())
    );
  }, [fieldSearch]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.institution.trim()) newErrors.institution = 'Institution is required';
    if (!formData.degree.trim()) newErrors.degree = 'Degree is required';
    if (!formData.startMonth) newErrors.startMonth = 'Start month is required';
    if (!formData.startYear) newErrors.startYear = 'Start year is required';
    
    if (!formData.currentlyStudying && (!formData.endMonth || !formData.endYear)) {
      newErrors.endDate = 'End date is required when not currently studying';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    const startMonth = MONTHS.indexOf(formData.startMonth) + 1;
    const endMonth = formData.currentlyStudying ? null : MONTHS.indexOf(formData.endMonth) + 1;

    const educationData = {
      institution: formData.institution,
      degree: formData.degree,
      fieldOfStudy: formData.fieldOfStudy,
      startMonth: startMonth,
      startYear: parseInt(formData.startYear),
      endMonth: endMonth,
      endYear: formData.currentlyStudying ? null : parseInt(formData.endYear),
      description: formData.description
    };

    onSubmit(educationData);
  };

  const handleInstitutionSelect = (institution) => {
    setFormData(prev => ({ ...prev, institution }));
    setInstitutionSearch('');
    setShowInstitutionList(false);
    if (errors.institution) {
      setErrors(prev => ({ ...prev, institution: '' }));
    }
  };

  const handleFieldSelect = (field) => {
    setFormData(prev => ({ ...prev, fieldOfStudy: field }));
    setFieldSearch('');
    setShowFieldList(false);
  };

  const handleInstitutionSearchChange = (value) => {
    setInstitutionSearch(value);
    setShowInstitutionList(value.length > 0);
  };

  const handleFieldSearchChange = (value) => {
    setFieldSearch(value);
    setShowFieldList(value.length > 0);
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
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="d-inline-block me-2"
          >
            <i className="bi bi-mortarboard text-primary"></i>
          </motion.div>
          {editingEducation ? 'Edit Education' : 'Add New Education'}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="pt-0">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Form>
            {/* Institution Selection */}
            <Form.Group className="mb-4">
              <Form.Label className="fw-semibold">
                <i className="bi bi-building me-2 text-primary"></i>
                Institution *
              </Form.Label>
              
              <div className="mb-3">
                <Form.Check
                  type="switch"
                  id="custom-institution-switch"
                  label="My institution is not in the list"
                  checked={formData.customInstitution}
                  onChange={(e) => {
                    const isCustom = e.target.checked;
                    setFormData(prev => ({ 
                      ...prev, 
                      customInstitution: isCustom,
                      institution: ''
                    }));
                    setInstitutionSearch('');
                    setShowInstitutionList(false);
                  }}
                  className="mb-3"
                />
              </div>

              {formData.customInstitution ? (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.3 }}
                >
                  <Form.Control
                    type="text"
                    placeholder="Enter institution name"
                    value={formData.institution}
                    onChange={(e) => handleInputChange('institution', e.target.value)}
                    className={`py-2 border-2 ${errors.institution ? 'border-danger' : ''}`}
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
                      placeholder="Type to search universities..."
                      value={institutionSearch}
                      onChange={(e) => handleInstitutionSearchChange(e.target.value)}
                      className="border-start-0"
                      style={{ borderRadius: '0 10px 10px 0' }}
                    />
                  </InputGroup>

                  {showInstitutionList && filteredInstitutions.length > 0 && (
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
                            Select from popular universities
                          </small>
                        </ListGroup.Item>
                        {filteredInstitutions.map((institution, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                          >
                            <ListGroup.Item
                              action
                              onClick={() => handleInstitutionSelect(institution)}
                              className={`py-3 border-0 ${index % 2 === 0 ? 'bg-white' : 'bg-light'}`}
                              style={{ cursor: 'pointer' }}
                            >
                              <div className="d-flex align-items-center">
                                <div className="rounded-circle bg-primary bg-opacity-10 p-2 me-3">
                                  <i className="bi bi-mortarboard text-primary"></i>
                                </div>
                                <div>
                                  <div className="fw-medium">{institution}</div>
                                  <small className="text-muted">
                                    <i className="bi bi-star-fill text-warning me-1"></i>
                                    Top Ranked University
                                  </small>
                                </div>
                              </div>
                            </ListGroup.Item>
                          </motion.div>
                        ))}
                      </ListGroup>
                    </motion.div>
                  )}

                  {showInstitutionList && filteredInstitutions.length === 0 && institutionSearch.length > 0 && (
                    <div className="mt-2 p-3 border rounded-3 bg-light">
                      <p className="text-muted mb-0 text-center">
                        <i className="bi bi-search me-2"></i>
                        No institutions found. Try a different search or use "My institution is not in the list"
                      </p>
                    </div>
                  )}

                  {formData.institution && !showInstitutionList && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mt-3 p-3 bg-primary bg-opacity-10 rounded-3"
                    >
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <span className="fw-medium text-primary">Selected Institution:</span>
                          <span className="ms-2 fw-semibold">{formData.institution}</span>
                        </div>
                        <Button
                          variant="link"
                          size="sm"
                          className="text-danger p-0"
                          onClick={() => {
                            handleInstitutionSelect('');
                            setInstitutionSearch('');
                          }}
                        >
                          <i className="bi bi-x-circle"></i>
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}
              
              {errors.institution && (
                <Form.Text className="text-danger small mt-2 d-block">
                  <i className="bi bi-exclamation-circle me-1"></i>
                  {errors.institution}
                </Form.Text>
              )}
            </Form.Group>

            {/* Degree */}
            <Form.Group className="mb-4">
              <Form.Label className="fw-semibold">
                <i className="bi bi-award me-2 text-primary"></i>
                Degree *
              </Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g., Bachelor of Science"
                value={formData.degree}
                onChange={(e) => handleInputChange('degree', e.target.value)}
                className={`py-2 border-2 ${errors.degree ? 'border-danger' : ''}`}
                style={{ borderRadius: '10px' }}
              />
              {errors.degree && (
                <Form.Text className="text-danger small">
                  <i className="bi bi-exclamation-circle me-1"></i>
                  {errors.degree}
                </Form.Text>
              )}
            </Form.Group>

            {/* Field of Study */}
            <Form.Group className="mb-4">
              <Form.Label className="fw-semibold">
                <i className="bi bi-book me-2 text-primary"></i>
                Field of Study
              </Form.Label>
              
              <InputGroup className="mb-2">
                <InputGroup.Text className="bg-light border-end-0">
                  <i className="bi bi-search text-muted"></i>
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Type to search fields of study..."
                  value={fieldSearch}
                  onChange={(e) => handleFieldSearchChange(e.target.value)}
                  className="border-start-0"
                  style={{ borderRadius: '0 10px 10px 0' }}
                />
              </InputGroup>

              {showFieldList && filteredFields.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ListGroup 
                    className="border rounded-3 mb-3"
                    style={{ maxHeight: '150px', overflowY: 'auto', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                  >
                    <ListGroup.Item className="bg-light border-bottom">
                      <small className="text-muted">
                        <i className="bi bi-info-circle me-1"></i>
                        Select from popular fields
                      </small>
                    </ListGroup.Item>
                    {filteredFields.map((field, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <ListGroup.Item
                          action
                          onClick={() => handleFieldSelect(field)}
                          className={`py-2 border-0 ${index % 2 === 0 ? 'bg-white' : 'bg-light'}`}
                          style={{ cursor: 'pointer' }}
                        >
                          <div className="d-flex align-items-center">
                            <div className="rounded-circle bg-success bg-opacity-10 p-2 me-3">
                              <i className="bi bi-bookmark text-success"></i>
                            </div>
                            <span className="fw-medium">{field}</span>
                          </div>
                        </ListGroup.Item>
                      </motion.div>
                    ))}
                  </ListGroup>
                </motion.div>
              )}

              {showFieldList && filteredFields.length === 0 && fieldSearch.length > 0 && (
                <div className="mt-2 p-3 border rounded-3 bg-light mb-3">
                  <p className="text-muted mb-0 text-center">
                    <i className="bi bi-search me-2"></i>
                    No fields found. Try a different search
                  </p>
                </div>
              )}

              {formData.fieldOfStudy && !showFieldList && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-3 bg-success bg-opacity-10 rounded-3"
                >
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <span className="fw-medium text-success">Selected Field:</span>
                      <span className="ms-2 fw-semibold">{formData.fieldOfStudy}</span>
                    </div>
                    <Button
                      variant="link"
                      size="sm"
                      className="text-danger p-0"
                      onClick={() => handleFieldSelect('')}
                    >
                      <i className="bi bi-x-circle"></i>
                    </Button>
                  </div>
                </motion.div>
              )}
            </Form.Group>

            {/* Study Period */}
            <div className="mb-4">
              <h6 className="fw-semibold mb-3">
                <i className="bi bi-calendar-range me-2 text-primary"></i>
                Study Period
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
                id="currently-studying"
                label={
                  <span className="fw-medium">
                    <i className="bi bi-check-circle me-2 text-success"></i>
                    I currently study here
                  </span>
                }
                checked={formData.currentlyStudying}
                onChange={(e) => handleInputChange('currentlyStudying', e.target.checked)}
                className="mt-3 mb-3"
              />

              {!formData.currentlyStudying && (
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
                          required={!formData.currentlyStudying}
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
                          required={!formData.currentlyStudying}
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
                Description (Optional)
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Describe your coursework, achievements, projects, or activities..."
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="border-2"
                style={{ borderRadius: '10px' }}
              />
              <Form.Text className="text-muted small">
                Mention relevant coursework, honors, or extracurricular activities
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
            {editingEducation ? 'Update Education' : 'Add Education'}
          </Button>
        </motion.div>
      </Modal.Footer>
    </Modal>
  );
}