'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { toast, Toaster } from 'react-hot-toast';
import { PremiumCompanyForm } from './CreateCompanyForm'; // Import the named export
import { motion } from 'framer-motion'; // Import motion

const API_BASE_URL = 'http://localhost:5000/api';

const CreateCompanyPage = () => {
  const router = useRouter();
  const { user, loading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!loading) {
      // Double check authentication
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      
      if (!token || !userStr || !isAuthenticated) {
        toast.error('Please login to create a company');
        router.push('/login');
        return;
      }
    }
  }, [loading, isAuthenticated, user, router]);

  const handleCreateCompany = async (formData: FormData) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please login again');
        router.push('/login');
        return false;
      }

      const response = await fetch(`${API_BASE_URL}/company/create`, {
        method: 'POST',
        headers: {
          'Authorization': token,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.errors && Array.isArray(data.errors)) {
          data.errors.forEach((err: any) => {
            toast.error(err.msg || 'Validation error');
          });
        } else if (data.error) {
          toast.error(data.error);
        } else {
          toast.error('Failed to create company');
        }
        return false;
      }

      toast.success('Company created successfully!');
      router.push(`/company/${data.company._id}`);
      return true;
    } catch (error: any) {
      console.error('Error creating company:', error);
      toast.error(error.message || 'Failed to create company. Please try again.');
      return false;
    }
  };

  if (loading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}
      >
        <div className="relative">
          <motion.div
            animate={{ 
              rotate: 360,
              scale: [1, 1.1, 1]
            }}
            transition={{ 
              rotate: { duration: 2, repeat: Infinity, ease: "linear" },
              scale: { duration: 2, repeat: Infinity, repeatType: "reverse" }
            }}
            className="w-16 h-16 rounded-full border-t-4 border-b-4 border-white"
          />
          <motion.div 
            className="absolute inset-0 w-16 h-16"
            animate={{ 
              rotate: -360,
            }}
            transition={{ 
              duration: 3, 
              repeat: Infinity, 
              ease: "linear" 
            }}
          >
            <div className="w-full h-full rounded-full border-l-4 border-r-4 border-blue-300" />
          </motion.div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <Toaster position="top-right" />
      <PremiumCompanyForm onSubmit={handleCreateCompany} /> {/* Use PremiumCompanyForm directly */}
    </>
  );
};

export default CreateCompanyPage;