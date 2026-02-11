import React from 'react';
import Dashboard from './Dashboard';
import AdminDashboard from './AdminDashboard';
import { useAdmin } from '../hooks/useAdmin';
import { UserStats, DailyActivity } from '../types';

interface DashboardRouterProps {
    stats: UserStats;
    monthlyActivity: DailyActivity[];
}

/**
 * Component that routes to either AdminDashboard or regular Dashboard
 * based on user's admin status
 */
const DashboardRouter: React.FC<DashboardRouterProps> = ({ stats, monthlyActivity }) => {
    const { isAdmin, loading } = useAdmin();

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="size-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return isAdmin ? <AdminDashboard /> : <Dashboard stats={stats} monthlyActivity={monthlyActivity} />;
};

export default DashboardRouter;
