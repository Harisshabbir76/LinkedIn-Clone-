'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Form, InputGroup, Button, Dropdown } from 'react-bootstrap';
import { Search, X, MapPin, Filter, Briefcase, Clock, TrendingUp, Sparkles } from 'lucide-react';
import debounce from 'lodash/debounce';

// Define search result types
interface SearchSuggestion {
  type: 'skill' | 'location' | 'job';
  value: string;
  count?: number;
}

interface JobSearchResult {
  _id: string;
  title: string;
  companyName: string;
  location?: string;
  type?: string;
  salary?: {
    min?: number;
    max?: number;
  };
  createdAt: string;
}

export default function SearchBar() {
  const [searchQuery, setSearchQuery] = useState('');
  const [city, setCity] = useState('');
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [jobResults, setJobResults] = useState<JobSearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<{skill: string, city: string, timestamp: number}[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  
  const popularSkills = [
    { name: 'React', trending: true },
    { name: 'JavaScript', trending: true },
    { name: 'Python', trending: true },
    { name: 'Node.js', trending: false },
    { name: 'Java', trending: false },
    { name: 'TypeScript', trending: true },
    { name: 'AWS', trending: true },
    { name: 'Docker', trending: true },
    { name: 'Kubernetes', trending: false },
    { name: 'Machine Learning', trending: true },
    { name: 'Data Science', trending: false },
    { name: 'Frontend Developer', trending: true },
    { name: 'Backend Developer', trending: false },
    { name: 'Full Stack', trending: true },
    { name: 'DevOps', trending: true }
  ];
  
  const popularCities = [
    { name: 'Remote', trending: true },
    { name: 'New York', trending: false },
    { name: 'San Francisco', trending: false },
    { name: 'London', trending: false },
    { name: 'Berlin', trending: false },
    { name: 'Toronto', trending: false },
    { name: 'Sydney', trending: false },
    { name: 'Bangalore', trending: true },
    { name: 'Singapore', trending: false },
    { name: 'Tokyo', trending: false }
  ];
  
  const router = useRouter();
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    const savedSearches = localStorage.getItem('recentSkillSearches');
    if (savedSearches) {
      try {
        setRecentSearches(JSON.parse(savedSearches));
      } catch (error) {
        setRecentSearches([]);
      }
    }
  }, []);

  // Debounced search for suggestions
  const fetchSuggestions = useCallback(
    debounce(async (query: string) => {
      if (!query.trim()) {
        setSuggestions([]);
        setJobResults([]);
        return;
      }

      try {
        setIsSearching(true);
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        
        // Fetch search results for jobs
        const response = await fetch(
          `${API_URL}/api/jobs/search?skill=${encodeURIComponent(query)}&location=${encodeURIComponent(city)}&limit=4`,
          {
            headers: { 'Content-Type': 'application/json' },
          }
        );

        if (response.ok) {
          const data = await response.json();
          
          // Get job results for dropdown
          if (data.jobs && Array.isArray(data.jobs)) {
            setJobResults(data.jobs);
          }
          
          // Generate suggestions from popular skills and cities
          const skillSuggestions = popularSkills
            .filter(skill => skill.name.toLowerCase().includes(query.toLowerCase()))
            .slice(0, 3)
            .map(skill => ({ 
              type: 'skill' as const, 
              value: skill.name,
              count: skill.trending ? 150 : 80 
            }));
          
          const citySuggestions = popularCities
            .filter(city => city.name.toLowerCase().includes(query.toLowerCase()))
            .slice(0, 2)
            .map(city => ({ 
              type: 'location' as const, 
              value: city.name,
              count: city.trending ? 200 : 120 
            }));
          
          setSuggestions([...skillSuggestions, ...citySuggestions]);
        } else {
          setJobResults([]);
          setSuggestions([]);
        }
      } catch (error) {
        console.error('Error fetching suggestions:', error);
        setJobResults([]);
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 300),
    [city]
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.length > 0) {
      setShowResults(true);
      if (query.length > 1) {
        fetchSuggestions(query);
      }
    } else {
      setSuggestions([]);
      setJobResults([]);
      setShowResults(false);
    }
  };

  const handleCitySelect = (selectedCity: string) => {
    setCity(selectedCity);
    setShowCityDropdown(false);
  };

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    performSearch();
  };

  const performSearch = () => {
    if (!searchQuery.trim()) {
      inputRef.current?.focus();
      return;
    }

    // Save to recent searches
    const newSearch = { 
      skill: searchQuery.trim(), 
      city,
      timestamp: Date.now()
    };
    
    const updatedSearches = [
      newSearch,
      ...recentSearches.filter(s => 
        !(s.skill === newSearch.skill && s.city === newSearch.city)
      ),
    ].slice(0, 6);
    
    setRecentSearches(updatedSearches);
    localStorage.setItem('recentSkillSearches', JSON.stringify(updatedSearches));

    // Navigate using clean URL structure
    let url = `/search/${encodeURIComponent(searchQuery.trim())}`;
    if (city && city.trim()) {
      url += `/${encodeURIComponent(city.trim())}`;
    }
    
    router.push(url);
    setShowResults(false);
    setSearchQuery('');
  };

  const handleQuickSearch = (skill: string, selectedCity: string = '') => {
    setSearchQuery(skill);
    if (selectedCity) setCity(selectedCity);
    setTimeout(() => {
      performSearch();
    }, 100);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSuggestions([]);
    setJobResults([]);
    setShowResults(false);
    inputRef.current?.focus();
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSkillSearches');
  };

  const handleJobClick = (jobId: string) => {
    router.push(`/jobs/${jobId}`);
    setShowResults(false);
    setSearchQuery('');
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    if (suggestion.type === 'skill') {
      handleQuickSearch(suggestion.value);
    } else if (suggestion.type === 'location') {
      setCity(suggestion.value);
      if (searchQuery) {
        performSearch();
      }
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return 'Last week';
  };

  const formatSalary = (salary?: { min?: number; max?: number }) => {
    if (!salary || (!salary.min && !salary.max)) return '';
    if (salary.min && salary.max) {
      return `$${salary.min/1000}k-${salary.max/1000}k`;
    }
    if (salary.min) return `From $${salary.min/1000}k`;
    if (salary.max) return `Up to $${salary.max/1000}k`;
    return '';
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
        setShowCityDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="search-bar-container" ref={searchRef}>
      <Form onSubmit={handleSearch} className="w-100">
        <div className="d-flex flex-column flex-md-row gap-2 align-items-stretch">
          {/* Skill Search Input */}
          <div className="position-relative flex-grow-1">
            <div className="search-input-wrapper">
              <div className="search-input-group">
                <div className="search-icon">
                  <Search size={20} />
                </div>
                <input
                  ref={inputRef}
                  type="search"
                  placeholder="Search jobs, skills, companies..."
                  className="search-input"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onFocus={() => setShowResults(true)}
                  autoComplete="off"
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="search-clear-btn"
                    onClick={clearSearch}
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            </div>

            {/* Search Results Dropdown */}
            {showResults && (
              <div className="search-results-dropdown">
                <div className="search-results-content">
                  {/* Recent Searches */}
                  {!searchQuery && recentSearches.length > 0 && (
                    <div className="recent-searches-section">
                      <div className="section-header">
                        <h6 className="section-title">
                          <Clock size={16} className="me-2" />
                          Recent Searches
                        </h6>
                        <button
                          type="button"
                          className="clear-recent-btn"
                          onClick={clearRecentSearches}
                        >
                          Clear all
                        </button>
                      </div>
                      <div className="recent-searches-list">
                        {recentSearches.map((search, index) => (
                          <div
                            key={index}
                            className="recent-search-item"
                            onClick={() => handleQuickSearch(search.skill, search.city)}
                          >
                            <div className="recent-search-info">
                              <div className="search-skill">{search.skill}</div>
                              {search.city && (
                                <div className="search-location">
                                  <MapPin size={12} className="me-1" />
                                  {search.city}
                                </div>
                              )}
                              <div className="search-time">{formatTimeAgo(search.timestamp)}</div>
                            </div>
                            <button
                              type="button"
                              className="remove-search-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                const updated = recentSearches.filter((_, i) => i !== index);
                                setRecentSearches(updated);
                                localStorage.setItem('recentSkillSearches', JSON.stringify(updated));
                              }}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Search Results */}
                  {searchQuery && (
                    <>
                      {/* Job Results */}
                      {jobResults.length > 0 && (
                        <div className="job-results-section">
                          <div className="section-header">
                            <h6 className="section-title">
                              <Briefcase size={16} className="me-2" />
                              Job Matches
                            </h6>
                            <span className="results-count">{jobResults.length} found</span>
                          </div>
                          <div className="job-results-list">
                            {jobResults.map((job) => (
                              <div
                                key={job._id}
                                className="job-result-item"
                                onClick={() => handleJobClick(job._id)}
                              >
                                <div className="job-icon">
                                  <Briefcase size={16} />
                                </div>
                                <div className="job-info">
                                  <div className="job-title">{job.title}</div>
                                  <div className="job-details">
                                    <span className="company">{job.companyName}</span>
                                    {job.location && <span className="location">{job.location}</span>}
                                    {job.salary && formatSalary(job.salary) && (
                                      <span className="salary">{formatSalary(job.salary)}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Suggestions */}
                      {suggestions.length > 0 && (
                        <div className="suggestions-section">
                          <div className="section-header">
                            <h6 className="section-title">
                              <TrendingUp size={16} className="me-2" />
                              Suggestions
                            </h6>
                          </div>
                          <div className="suggestions-list">
                            {suggestions.map((suggestion, index) => (
                              <div
                                key={index}
                                className="suggestion-item"
                                onClick={() => handleSuggestionClick(suggestion)}
                              >
                                <div className="suggestion-icon">
                                  {suggestion.type === 'skill' ? (
                                    <Filter size={16} />
                                  ) : (
                                    <MapPin size={16} />
                                  )}
                                </div>
                                <div className="suggestion-info">
                                  <div className="suggestion-value">{suggestion.value}</div>
                                  {suggestion.count && (
                                    <div className="suggestion-count">
                                      <Sparkles size={12} className="me-1" />
                                      {suggestion.count}+ jobs
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* See All Results */}
                      {(jobResults.length > 0 || suggestions.length > 0) && (
                        <div className="see-all-results">
                          <button
                            type="button"
                            className="see-all-btn"
                            onClick={handleSearch}
                          >
                            See all results for "{searchQuery}"
                            <TrendingUp size={16} className="ms-2" />
                          </button>
                        </div>
                      )}

                      {/* No Results */}
                      {jobResults.length === 0 && suggestions.length === 0 && searchQuery && !isSearching && (
                        <div className="no-results">
                          <Search size={40} className="no-results-icon" />
                          <p className="no-results-text">No results found for "{searchQuery}"</p>
                          <p className="no-results-hint">Try different keywords or check spelling</p>
                        </div>
                      )}

                      {/* Loading State */}
                      {isSearching && (
                        <div className="searching-state">
                          <div className="searching-spinner"></div>
                          <span className="searching-text">Searching...</span>
                        </div>
                      )}
                    </>
                  )}

                  {/* Empty State - When no recent searches and no search query */}
                  {!searchQuery && recentSearches.length === 0 && (
                    <div className="empty-state">
                      <Search size={40} className="empty-state-icon" />
                      <p className="empty-state-text">Start typing to search for jobs</p>
                      <p className="empty-state-hint">You can search by skills, job titles, or companies</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* City Input */}
          <div className="position-relative">
            <div className="city-input-wrapper">
              <div className="city-input-group">
                <div className="city-icon">
                  <MapPin size={20} />
                </div>
                <input
                  type="text"
                  placeholder="City or remote"
                  className="city-input"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  onFocus={() => setShowCityDropdown(true)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSearch();
                    }
                  }}
                />
                {city && (
                  <button
                    type="button"
                    className="city-clear-btn"
                    onClick={() => setCity('')}
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Search Button */}
          <button
            type="submit"
            className="search-submit-btn"
            disabled={!searchQuery.trim()}
          >
            <Search size={20} className="me-2" />
            Search
          </button>
        </div>
      </Form>

      <style jsx global>{`
        .search-bar-container {
          position: relative;
          width: 100%;
        }

        .search-input-wrapper {
          position: relative;
          width: 100%;
        }

        .search-input-group {
          display: flex;
          align-items: center;
          background: white;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          padding: 4px;
          transition: all 0.3s ease;
          height: 56px;
        }

        .search-input-group:focus-within {
          border-color: #6366f1;
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
          transform: translateY(-1px);
        }

        .search-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          color: #64748b;
          padding-left: 12px;
        }

        .search-input {
          flex: 1;
          border: none;
          outline: none;
          padding: 12px 8px;
          font-size: 16px;
          font-weight: 500;
          color: #1e293b;
          background: transparent;
          min-width: 0;
        }

        .search-input::placeholder {
          color: #94a3b8;
          font-weight: 400;
        }

        .search-clear-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          background: transparent;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          transition: all 0.2s ease;
          border-radius: 10px;
        }

        .search-clear-btn:hover {
          color: #64748b;
          background: #f1f5f9;
        }

        .city-input-wrapper {
          width: 200px;
        }

        .city-input-group {
          display: flex;
          align-items: center;
          background: white;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          padding: 4px;
          transition: all 0.3s ease;
          height: 56px;
        }

        .city-input-group:focus-within {
          border-color: #6366f1;
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
        }

        .city-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          color: #64748b;
          padding-left: 12px;
        }

        .city-input {
          flex: 1;
          border: none;
          outline: none;
          padding: 12px 8px;
          font-size: 16px;
          font-weight: 500;
          color: #1e293b;
          background: transparent;
          min-width: 0;
        }

        .city-input::placeholder {
          color: #94a3b8;
          font-weight: 400;
        }

        .city-clear-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          background: transparent;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          transition: all 0.2s ease;
          border-radius: 10px;
        }

        .city-clear-btn:hover {
          color: #64748b;
          background: #f1f5f9;
        }

        .search-submit-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 24px;
          height: 56px;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          border: none;
          border-radius: 12px;
          color: white;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          min-width: 120px;
        }

        .search-submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(99, 102, 241, 0.4);
        }

        .search-submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          background: #cbd5e1;
        }

        /* Search Results Dropdown */
        .search-results-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          right: 0;
          background: white;
          border-radius: 16px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
          border: 1px solid rgba(0, 0, 0, 0.05);
          z-index: 1000;
          overflow: hidden;
          animation: slideDown 0.2s ease;
          max-height: 500px;
          overflow-y: auto;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .search-results-content {
          padding: 20px;
        }

        /* Sections */
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .section-title {
          display: flex;
          align-items: center;
          font-size: 14px;
          font-weight: 600;
          color: #475569;
          margin: 0;
        }

        .clear-recent-btn {
          background: transparent;
          border: none;
          color: #94a3b8;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: color 0.2s ease;
        }

        .clear-recent-btn:hover {
          color: #6366f1;
        }

        .results-count {
          font-size: 13px;
          color: #6366f1;
          font-weight: 600;
          background: rgba(99, 102, 241, 0.1);
          padding: 4px 10px;
          border-radius: 20px;
        }

        /* Recent Searches */
        .recent-searches-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .recent-search-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .recent-search-item:hover {
          background: #f8fafc;
          transform: translateX(4px);
        }

        .recent-search-info {
          flex: 1;
        }

        .search-skill {
          font-weight: 500;
          color: #1e293b;
          margin-bottom: 4px;
        }

        .search-location {
          display: flex;
          align-items: center;
          font-size: 12px;
          color: #64748b;
          margin-bottom: 2px;
        }

        .search-time {
          font-size: 11px;
          color: #94a3b8;
        }

        .remove-search-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          background: transparent;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          border-radius: 8px;
          transition: all 0.2s ease;
        }

        .remove-search-btn:hover {
          color: #ef4444;
          background: #fee2e2;
        }

        /* Job Results */
        .job-results-list, .popular-jobs-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .job-result-item, .popular-job-item {
          display: flex;
          align-items: center;
          padding: 12px;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .job-result-item:hover, .popular-job-item:hover {
          background: #f8fafc;
          transform: translateX(4px);
        }

        .job-icon, .popular-job-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          background: rgba(99, 102, 241, 0.1);
          border-radius: 10px;
          color: #6366f1;
          margin-right: 12px;
        }

        .job-info, .popular-job-info {
          flex: 1;
        }

        .job-title, .popular-job-title {
          font-weight: 500;
          color: #1e293b;
          margin-bottom: 4px;
          font-size: 14px;
        }

        .job-details, .popular-job-details {
          display: flex;
          gap: 12px;
          font-size: 12px;
          color: #64748b;
        }

        .company, .location, .salary {
          display: flex;
          align-items: center;
        }

        .company::before {
          content: "•";
          margin-right: 4px;
        }

        .salary {
          color: #10b981;
          font-weight: 500;
        }

        /* Suggestions */
        .suggestions-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .suggestion-item {
          display: flex;
          align-items: center;
          padding: 12px;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .suggestion-item:hover {
          background: #f8fafc;
          transform: translateX(4px);
        }

        .suggestion-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          background: rgba(59, 130, 246, 0.1);
          border-radius: 10px;
          color: #3b82f6;
          margin-right: 12px;
        }

        .suggestion-info {
          flex: 1;
        }

        .suggestion-value {
          font-weight: 500;
          color: #1e293b;
          margin-bottom: 4px;
          font-size: 14px;
        }

        .suggestion-count {
          display: flex;
          align-items: center;
          font-size: 11px;
          color: #8b5cf6;
          font-weight: 500;
        }

        /* See All Results */
        .see-all-results {
          padding-top: 16px;
          border-top: 1px solid #f1f5f9;
          margin-top: 16px;
        }

        .see-all-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          padding: 12px;
          background: rgba(99, 102, 241, 0.08);
          border: 2px dashed rgba(99, 102, 241, 0.3);
          border-radius: 10px;
          color: #6366f1;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .see-all-btn:hover {
          background: rgba(99, 102, 241, 0.15);
          border-color: rgba(99, 102, 241, 0.5);
          transform: translateY(-2px);
        }

        /* No Results */
        .no-results {
          text-align: center;
          padding: 40px 20px;
        }

        .no-results-icon {
          color: #cbd5e1;
          margin-bottom: 16px;
        }

        .no-results-text {
          font-weight: 600;
          color: #475569;
          margin-bottom: 8px;
        }

        .no-results-hint {
          font-size: 14px;
          color: #94a3b8;
        }

        /* Empty State */
        .empty-state {
          text-align: center;
          padding: 40px 20px;
        }

        .empty-state-icon {
          color: #e2e8f0;
          margin-bottom: 16px;
        }

        .empty-state-text {
          font-weight: 600;
          color: #475569;
          margin-bottom: 8px;
        }

        .empty-state-hint {
          font-size: 14px;
          color: #94a3b8;
        }

        /* Searching State */
        .searching-state {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          gap: 12px;
        }

        .searching-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid #e2e8f0;
          border-top-color: #6366f1;
          border-radius: 50%;
          animation: spinner 0.8s linear infinite;
        }

        @keyframes spinner {
          to { transform: rotate(360deg); }
        }

        .searching-text {
          color: #64748b;
          font-weight: 500;
        }

        /* Mobile Responsive */
        @media (max-width: 768px) {
          .search-bar-container {
            margin: 10px 0;
          }

          .search-input-group, .city-input-group {
            height: 48px;
          }

          .search-submit-btn {
            height: 48px;
            min-width: 100px;
            font-size: 14px;
          }

          .city-input-wrapper {
            width: 100%;
          }

          .search-results-dropdown {
            position: fixed;
            top: 120px;
            left: 20px;
            right: 20px;
            max-height: calc(100vh - 140px);
          }

          .search-input, .city-input {
            font-size: 14px;
          }

          .search-icon, .city-icon {
            width: 40px;
          }

          .search-clear-btn, .city-clear-btn {
            width: 40px;
            height: 40px;
          }
        }

        @media (max-width: 576px) {
          .d-flex.flex-md-row {
            flex-direction: column !important;
            gap: 12px;
          }

          .search-input-wrapper, .city-input-wrapper {
            width: 100%;
          }

          .search-submit-btn {
            width: 100%;
          }

          .search-results-content {
            padding: 16px;
          }
        }
      `}</style>
    </div>
  );
}