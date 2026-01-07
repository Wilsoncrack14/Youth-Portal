import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAdmin } from '../hooks/useAdmin';

interface AdminRouteProps {
    children: React.ReactNode;
}

/**
 * Component to protect admin-only routes
 * Redirects non-admin users to the home page
 */
export const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
    const { isAdmin, loading } = useAdmin();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background-dark">
                <div className="text-center">
                    <div className="size-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-400">Verificando permisos...</p>
                </div>
            </div>
        );
    }

    if (!isAdmin) {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
};
