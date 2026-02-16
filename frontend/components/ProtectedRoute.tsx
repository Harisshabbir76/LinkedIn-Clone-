// app/components/ProtectedRoute.tsx
'use client'

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'Looking for job' | 'Hiring job';
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.push('/login');
        return;
      }

      if (requiredRole && user?.role !== requiredRole) {
        toast.error(`You need to be a ${requiredRole === 'Hiring job' ? 'recruiter' : 'job seeker'} to access this page`);
        router.push('/');
        return;
      }
    }
  }, [loading, isAuthenticated, user, requiredRole, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAuthenticated || (requiredRole && user?.role !== requiredRole)) {
    return null;
  }

  return <>{children}</>;
}

// Simple toast utility since we can't import react-hot-toast here
const toast = {
  error: (message: string) => {
    // You can replace this with your preferred toast implementation
    console.error('Toast error:', message);
    // Create a simple alert for now
    const toastEl = document.createElement('div');
    toastEl.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
    toastEl.textContent = message;
    document.body.appendChild(toastEl);
    setTimeout(() => toastEl.remove(), 3000);
  }
};