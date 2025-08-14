"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useStore, useLoadingState } from "@/lib/store";
import { toast } from "react-hot-toast";
import StartupDashboard from "@/components/dashboards/StartupDashboard";
import MentorDashboard from "@/components/dashboards/MentorDashboard";
import InvestorDashboard from "@/components/dashboards/InvestorDashboard";
import { DashboardStatsSkeleton } from "@/components/ui/LoadingSkeleton";
import Link from "next/link";

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState(null);
  const getProfile = useStore((state) => state.getProfile);
  const { loading, error } = useLoadingState('profiles', user?.id || 'anonymous');

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    try {
      // Get basic profile from cache or Supabase
      const profileData = await getProfile(user.id);
      
      if (!profileData) {
        toast.error("Failed to load profile");
        return;
      }

      // Get role-specific data
      let roleSpecificData = null;
      if (profileData.role) {
        roleSpecificData = await fetchRoleSpecificData(
          profileData.role,
          user.id
        );
      }

      setProfile({
        ...profileData,
        roleSpecificData,
      });
    } catch (error) {
      console.error("Dashboard fetchUserProfile error details:", {
        errorType: typeof error,
        errorConstructor: error?.constructor?.name,
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        status: error?.status,
        statusCode: error?.statusCode,
        userId: user?.id,
        errorString: String(error),
        errorKeys: Object.keys(error || {})
      });
      
      // Try to stringify the full error
      try {
        console.error('Dashboard full error object:', JSON.stringify(error, null, 2))
      } catch (stringifyError) {
        console.error('Dashboard error stringifying error:', stringifyError.message)
        console.error('Dashboard raw error:', error)
      }
      
      const errorMessage = error?.message || error?.code || 'Unknown error occurred';
      toast.error(`Failed to load dashboard: ${errorMessage}`);
    }
  };

  const fetchRoleSpecificData = async (role, userId) => {
    const getStartupByUserId = useStore.getState().getStartupByUserId;
    const getMentorById = useStore.getState().getMentorById;
    const getInvestorById = useStore.getState().getInvestorById;
    
    try {
      switch (role) {
        case "startup":
          try {
            return await getStartupByUserId(userId);
          } catch (error) {
            if (error.message?.includes('not found')) return null;
            console.error("Error fetching startup profile:", error);
            return null;
          }

        case "mentor":
          try {
            return await getMentorById(userId);
          } catch (error) {
            if (error.message?.includes('not found')) return null;
            console.error("Error fetching mentor profile:", error);
            return null;
          }

        case "investor":
          try {
            return await getInvestorById(userId);
          } catch (error) {
            if (error.message?.includes('not found')) return null;
            console.error("Error fetching investor profile:", error);
            return null;
          }

        default:
          return null;
      }
    } catch (error) {
      console.error("Error fetching role-specific data:", error);
      return null;
    }
  };

  const renderDashboard = () => {
    if (!profile) {
      return (
        <div className="max-w-7xl mx-auto p-6">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Profile Not Found
            </h2>
            <p className="text-gray-700 mb-6">
              We couldn&apos;t find your profile. Please complete your profile setup.
            </p>
            <Link
              href="/profile/setup"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Complete Profile Setup
            </Link>
          </div>
        </div>
      );
    }

    switch (profile.role) {
      case "startup":
        return <StartupDashboard profile={profile} />;
      case "mentor":
        return <MentorDashboard profile={profile} />;
      case "investor":
        return <InvestorDashboard profile={profile} />;
      default:
        return (
          <div className="max-w-7xl mx-auto p-6">
            <div className="text-center py-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Role Not Set
              </h2>
              <p className="text-gray-700 mb-6">
                Please select your role to access your dashboard.
              </p>
              <Link
                href="/profile/setup"
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Set Your Role
              </Link>
            </div>
          </div>
        );
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <DashboardStatsSkeleton />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Access Denied
          </h2>
          <p className="text-gray-700 mb-6">
            Please log in to access your dashboard.
          </p>
          <Link
            href="/auth/login"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Log In
          </Link>
        </div>
      </div>
    );
  }

  return renderDashboard();
}
