"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import Image from "next/image";
import { toast } from "react-hot-toast";
import { getEventDetailsAsAdmin } from "@/lib/api/admin";
import { getUserConnections, getConnectionStats } from "@/lib/api/connections";
import { getUserEventRegistrations } from "@/lib/api/eventRegistration";
// StartupProfileManager moved to separate profile page

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({
    connections: 0,
    mentors: 0,
    investors: 0,
    fundingRaised: 0,
    profileCompletion: 0,
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [recentEvents, setRecentEvents] = useState([]);
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [eventDetails, setEventDetails] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [connections, setConnections] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [investors, setInvestors] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [userRegistrations, setUserRegistrations] = useState([]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchRoleSpecificProfile = async (role, userId) => {
    try {
      switch (role) {
        case "startup":
          const { data: startupData, error: startupError } = await supabase
            .from("startup_profiles")
            .select(
              `
              *,
              team_members(*)
            `
            )
            .eq("user_id", userId)
            .single();

          if (startupError && startupError.code !== "PGRST116") {
            console.error("Error fetching startup profile:", startupError);
            return null;
          }
          return startupData;

        case "mentor":
          const { data: mentorData, error: mentorError } = await supabase
            .from("mentor_profiles")
            .select("*")
            .eq("user_id", userId)
            .single();

          if (mentorError && mentorError.code !== "PGRST116") {
            console.error("Error fetching mentor profile:", mentorError);
            return null;
          }
          return mentorData;

        case "investor":
          const { data: investorData, error: investorError } = await supabase
            .from("investor_profiles")
            .select("*")
            .eq("user_id", userId)
            .single();

          if (investorError && investorError.code !== "PGRST116") {
            console.error("Error fetching investor profile:", investorError);
            return null;
          }
          return investorData;

        default:
          return null;
      }
    } catch (error) {
      console.error("Error in fetchRoleSpecificProfile:", error);
      return null;
    }
  };

  const fetchDashboardData = async () => {
    try {
      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError && profileError.code !== "PGRST116") {
        throw profileError;
      }

      if (profileData) {
        // Fetch role-specific profile data
        const roleSpecificData = await fetchRoleSpecificProfile(
          profileData.role,
          user.id
        );

        // Merge basic profile with role-specific data
        const completeProfile = {
          ...profileData,
          roleSpecificData,
        };

        setProfile(completeProfile);
        await fetchStats(profileData.role);
        await fetchRecentActivity(profileData.role);
        await fetchRecentEvents();
        await fetchConnections();
        await fetchTeamMembers(profileData.role, roleSpecificData);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      // Don't show error toast for missing profile, it's expected for new users
      if (error.code !== "PGRST116") {
        toast.error("Failed to load dashboard data");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async (userRole) => {
    try {
      // Get connection statistics
      const connectionStats = await getConnectionStats(user.id);
      
      // Calculate profile completion
      let profileCompletion = 0;
      if (profile) {
        const fields = ['full_name', 'email', 'avatar_url', 'bio'];
        const completedFields = fields.filter(field => profile[field]);
        profileCompletion = Math.round((completedFields.length / fields.length) * 100);
      }

      // Get funding raised for startups
      let fundingRaised = 0;
      if (userRole === "startup" && profile?.roleSpecificData) {
        fundingRaised = profile.roleSpecificData.funding_raised || 0;
      }

      setStats({
        connections: connectionStats.total_connections || 0,
        mentors: connectionStats.mentors_count || 0,
        investors: connectionStats.investors_count || 0,
        fundingRaised,
        profileCompletion,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchRecentActivity = async (userRole) => {
    try {
      const activities = [];

      // Recent connections
      const { data: connections } = await supabase
        .from("connections")
        .select(
          `
          *,
          requester:profiles!connections_requester_id_fkey(full_name),
          recipient:profiles!connections_recipient_id_fkey(full_name)
        `
        )
        .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(5);

      connections?.forEach((conn) => {
        const isRequester = conn.requester_id === user.id;
        activities.push({
          id: `conn-${conn.id}`,
          type: "connection",
          title: isRequester
            ? `Connected with ${conn.recipient.full_name}`
            : `${conn.requester.full_name} connected with you`,
          time: conn.created_at,
          status: conn.status,
        });
      });

      // Recent messages
      const { data: messages } = await supabase
        .from("messages")
        .select(
          `
          *,
          sender:profiles!messages_sender_id_fkey(full_name),
          recipient:profiles!messages_recipient_id_fkey(full_name)
        `
        )
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(5);

      messages?.forEach((msg) => {
        const isSender = msg.sender_id === user.id;
        activities.push({
          id: `msg-${msg.id}`,
          type: "message",
          title: isSender
            ? `Sent message to ${msg.recipient.full_name}`
            : `Received message from ${msg.sender.full_name}`,
          time: msg.created_at,
          content: msg.content.substring(0, 50) + "...",
        });
      });

      // Sort by time and take latest 10
      activities.sort((a, b) => new Date(b.time) - new Date(a.time));
      setRecentActivity(activities.slice(0, 10));
    } catch (error) {
      console.error("Error fetching recent activity:", error);
    }
  };

  const getProfileSetupProgress = () => {
    if (!profile) return 0;

    let fields = ["full_name", "bio", "location"];
    let completed = fields.filter((field) => profile[field]).length;

    // Add role-specific fields
    if (profile.roleSpecificData) {
      switch (profile.role) {
        case "startup":
          const startupFields = ["company_name", "description", "industry"];
          fields = [...fields, ...startupFields];
          completed += startupFields.filter(
            (field) => profile.roleSpecificData[field]
          ).length;
          break;
        case "mentor":
          const mentorFields = ["expertise_tags", "company", "job_title"];
          fields = [...fields, ...mentorFields];
          completed += mentorFields.filter((field) => {
            const value = profile.roleSpecificData[field];
            return field === "expertise_tags"
              ? value && value.length > 0
              : value;
          }).length;
          break;
        case "investor":
          const investorFields = ["fund_name", "investment_stage", "sectors"];
          fields = [...fields, ...investorFields];
          completed += investorFields.filter((field) => {
            const value = profile.roleSpecificData[field];
            return Array.isArray(value) ? value.length > 0 : value;
          }).length;
          break;
      }
    }

    return Math.round((completed / fields.length) * 100);
  };

  const fetchRecentEvents = async () => {
    try {
      const { data, error } = await supabase
        .from("events")
        .select("id, title, event_type, start_date")
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentEvents(data || []);
    } catch (error) {
      console.error("Error fetching recent events:", error);
    }
  };

  const fetchConnections = async () => {
    try {
      const allConnections = await getUserConnections(user.id);
      const mentorConnections = allConnections.filter(conn => conn.connected_user?.role === 'mentor');
      const investorConnections = allConnections.filter(conn => conn.connected_user?.role === 'investor');
      
      setConnections(allConnections);
      setMentors(mentorConnections);
      setInvestors(investorConnections);
    } catch (error) {
      console.error("Error fetching connections:", error);
    }
  };

  const fetchTeamMembers = async (userRole, roleSpecificData) => {
    try {
      if (userRole === 'startup' && roleSpecificData?.team_members) {
        // Add the logged-in user as founder
        const founder = {
          id: user.id,
          name: profile?.full_name || 'You',
          role: 'Founder',
          email: profile?.email,
          avatar_url: profile?.avatar_url
        };
        
        const members = roleSpecificData.team_members.map(member => ({
          id: member.id,
          name: member.name,
          role: member.role,
          email: member.email,
          avatar_url: member.avatar_url
        }));
        
        setTeamMembers([founder, ...members]);
      } else {
        // For non-startup users, just show themselves
        setTeamMembers([{
          id: user.id,
          name: profile?.full_name || 'You',
          role: userRole === 'mentor' ? 'Mentor' : userRole === 'investor' ? 'Investor' : 'User',
          email: profile?.email,
          avatar_url: profile?.avatar_url
        }]);
      }
    } catch (error) {
      console.error("Error fetching team members:", error);
    }
  };

  const handleEventClick = async (eventId) => {
    try {
      const eventData = await getEventDetailsAsAdmin(eventId);
      setEventDetails(eventData);
      setSelectedEvent(eventId);
      setShowEventDetails(true);
    } catch (error) {
      console.error("Error fetching event details:", error);
      toast.error("Failed to load event details");
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Please Sign In
        </h1>
        <p className="text-gray-600 mb-8">
          You need to be signed in to access your dashboard.
        </p>
        <Link
          href="/auth/signin"
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
        >
          Sign In
        </Link>
      </div>
    );
  }

  const profileProgress = getProfileSetupProgress();

  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <div>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Welcome, {profile?.full_name || "Founder"}!
                </h1>
                <p className="text-gray-600 mt-1">
                  Here&apos;s your startup dashboard overview.
                </p>
              </div>
            </div>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow-sm p-6 text-center">
                <div className="text-blue-600 text-3xl mb-2">👥</div>
                <div className="text-3xl font-bold text-gray-900">
                  {stats.connections || 0}
                </div>
                <div className="text-sm text-gray-600">Connections</div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6 text-center">
                <div className="text-purple-600 text-3xl mb-2">🎯</div>
                <div className="text-3xl font-bold text-gray-900">
                  {stats.mentors || 0}
                </div>
                <div className="text-sm text-gray-600">Mentors</div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6 text-center">
                <div className="text-green-600 text-3xl mb-2">💰</div>
                <div className="text-3xl font-bold text-gray-900">
                  {stats.investors || 0}
                </div>
                <div className="text-sm text-gray-600">Investors</div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6 text-center">
                <div className="text-orange-600 text-3xl mb-2">💵</div>
                <div className="text-3xl font-bold text-gray-900">
                  {stats.fundingRaised ? `Rs. ${stats.fundingRaised.toLocaleString()}` : 'Rs. 0'}
                </div>
                <div className="text-sm text-gray-600">Funding Raised</div>
              </div>
            </div>

            {/* Main Content Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
              {/* Startup Profile Card */}
              <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-start space-x-4">
                  <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                    {profile?.roleSpecificData?.logo_url ? (
                      <Image
                        src={profile.roleSpecificData.logo_url}
                        alt={profile.roleSpecificData.company_name || "Company"}
                        width={64}
                        height={64}
                        className="rounded-lg"
                      />
                    ) : (
                      <span className="text-2xl">🏢</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900">
                      {profile?.roleSpecificData?.company_name ||
                        "Honey Badger"}
                    </h2>
                    <p className="text-gray-600 mt-1">
                      {profile?.roleSpecificData?.tagline ||
                        "To be updated • Stage stage"}
                    </p>
                    <p className="text-gray-500 text-sm mt-2">
                      {profile?.roleSpecificData?.location ||
                        "No location provided."}
                    </p>
                    <p className="text-gray-500 text-sm">
                      Contact:{" "}
                      {profile?.roleSpecificData?.website_url ||
                        "No contact info provided."}
                    </p>
                    <p className="text-gray-600 mt-4">
                      {profile?.roleSpecificData?.description ||
                        "No bio provided."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Profile Progress */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Profile Completion
                </h3>
                <div className="relative pt-1">
                  <div className="flex mb-2 items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200">
                        Progress
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold inline-block text-blue-600">
                        {profileProgress}%
                      </span>
                    </div>
                  </div>
                  <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-200">
                    <div
                      style={{ width: `${profileProgress}%` }}
                      className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"
                    ></div>
                  </div>
                </div>
                <Link
                  href="/profile"
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-center block"
                >
                  Complete Profile
                </Link>
              </div>
            </div>

            {/* Team Members Section */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Team Members</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teamMembers.map((member) => (
                  <div key={member.id} className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                      {member.avatar_url ? (
                        <Image
                          src={member.avatar_url}
                          alt={member.name}
                          width={48}
                          height={48}
                          className="rounded-full"
                        />
                      ) : (
                        <span className="text-lg font-semibold text-gray-600">
                          {member.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{member.name}</h4>
                      <p className="text-sm text-gray-600">{member.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Recent Activity */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">
                    Recent Activity
                  </h2>
                  {recentActivity.length > 0 ? (
                    <div className="space-y-4">
                      {recentActivity.map((activity) => (
                        <div
                          key={activity.id}
                          className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg"
                        >
                          <div className="flex-shrink-0">
                            {activity.type === "connection" && (
                              <div className="bg-blue-100 p-2 rounded-full">
                                <span className="text-blue-600">🤝</span>
                              </div>
                            )}
                            {activity.type === "message" && (
                              <div className="bg-green-100 p-2 rounded-full">
                                <span className="text-green-600">💬</span>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900">
                              {activity.title}
                            </p>
                            {activity.content && (
                              <p className="text-sm text-gray-600 mt-1">
                                {activity.content}
                              </p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(activity.time).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500">No recent activity</p>
                      <p className="text-sm text-gray-400 mt-1">
                        Start connecting with others to see activity here
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Events */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Recent Events
                </h2>
                {recentEvents.length > 0 ? (
                  <div className="space-y-4">
                    {recentEvents.map((event) => (
                      <div
                        key={event.id}
                        className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => handleEventClick(event.id)}
                      >
                        <div className="flex-shrink-0">
                          <div className="bg-purple-100 p-2 rounded-full">
                            <span className="text-purple-600">📅</span>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900">
                            {event.title}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            Type: {event.event_type}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(event.start_date).toLocaleDateString()} at{" "}
                            {new Date(event.start_date).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No recent events</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Check back later for upcoming events
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      case "connections":
        return (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                Your Connections ({connections.length})
              </h2>
              <Link
                href="/explore"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Find New Connections
              </Link>
            </div>
            {connections.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {connections.map((connection) => (
                  <div key={connection.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                        {connection.connected_user?.avatar_url ? (
                          <Image
                            src={connection.connected_user.avatar_url}
                            alt={connection.connected_user.full_name}
                            width={48}
                            height={48}
                            className="rounded-full"
                          />
                        ) : (
                          <span className="text-lg font-semibold text-gray-600">
                            {connection.connected_user?.full_name?.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{connection.connected_user?.full_name}</h3>
                        <p className="text-sm text-gray-600 capitalize">{connection.connected_user?.role}</p>
                        <p className="text-xs text-gray-500">Connected on {new Date(connection.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">You haven't connected with anyone yet.</p>
                <Link
                  href="/explore"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Start Connecting
                </Link>
              </div>
            )}
          </div>
        );
      case "mentors":
        return (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                Connected Mentors ({mentors.length})
              </h2>
              <Link
                href="/explore"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Find Mentors
              </Link>
            </div>
            {mentors.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mentors.map((mentor) => (
                  <div key={mentor.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                        {mentor.connected_user?.avatar_url ? (
                          <Image
                            src={mentor.connected_user.avatar_url}
                            alt={mentor.connected_user.full_name}
                            width={48}
                            height={48}
                            className="rounded-full"
                          />
                        ) : (
                          <span className="text-lg font-semibold text-gray-600">
                            {mentor.connected_user?.full_name?.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{mentor.connected_user?.full_name}</h3>
                        <p className="text-sm text-gray-600">Mentor</p>
                        <p className="text-xs text-gray-500">Connected on {new Date(mentor.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">You haven't connected with any mentors yet.</p>
                <Link
                  href="/explore"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Find Mentors
                </Link>
              </div>
            )}
          </div>
        );
      case "investors":
        return (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                Connected Investors ({investors.length})
              </h2>
              <Link
                href="/explore"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Find Investors
              </Link>
            </div>
            {investors.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {investors.map((investor) => (
                  <div key={investor.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                        {investor.connected_user?.avatar_url ? (
                          <Image
                            src={investor.connected_user.avatar_url}
                            alt={investor.connected_user.full_name}
                            width={48}
                            height={48}
                            className="rounded-full"
                          />
                        ) : (
                          <span className="text-lg font-semibold text-gray-600">
                            {investor.connected_user?.full_name?.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{investor.connected_user?.full_name}</h3>
                        <p className="text-sm text-gray-600">Investor</p>
                        <p className="text-xs text-gray-500">Connected on {new Date(investor.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">You haven't connected with any investors yet.</p>
                <Link
                  href="/explore"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Find Investors
                </Link>
              </div>
            )}
          </div>
        );
      case "messages":
        return (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Messages</h2>
            <p className="text-gray-600">
              Your message history and conversations.
            </p>
            <div className="mt-4">
              <Link
                href="/messages"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                View All Messages
              </Link>
            </div>
          </div>
        );
      case "funding":
        return (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Funding Progress
            </h2>
            <p className="text-gray-600">
              Track your funding goals and progress.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900">Funding Goal</h3>
                <p className="text-2xl font-bold text-blue-600 mt-2">
                  Rs. 1,00,000
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900">Raised So Far</h3>
                <p className="text-2xl font-bold text-green-600 mt-2">
                  Rs. 25,000
                </p>
              </div>
            </div>
          </div>
        );
      case "team":
        return (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Team Management
            </h2>
            <p className="text-gray-600">Manage your team members and roles.</p>
            <div className="mt-4">
              <Link
                href="/profile"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Manage Team
              </Link>
            </div>
          </div>
        );
      case "settings":
        return (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Settings</h2>
            <p className="text-gray-600">
              Manage your account settings and preferences.
            </p>
            <div className="mt-4">
              <Link
                href="/profile"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Edit Profile
              </Link>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <nav className="mt-6 space-y-2">
          <div className="px-6 py-2">
            <button
              onClick={() => setActiveTab("overview")}
              className={`flex items-center space-x-3 px-3 py-2 w-full text-left rounded-lg ${
                activeTab === "overview"
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <span>📊</span>
              <span>Overview</span>
            </button>
          </div>

          <div className="px-6 py-2">
            <button
              onClick={() => setActiveTab("connections")}
              className={`flex items-center space-x-3 px-3 py-2 w-full text-left rounded-lg ${
                activeTab === "connections"
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <span>🤝</span>
              <span>Connections</span>
            </button>
          </div>

          <div className="px-6 py-2">
            <button
              onClick={() => setActiveTab("mentors")}
              className={`flex items-center space-x-3 px-3 py-2 w-full text-left rounded-lg ${
                activeTab === "mentors"
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <span>🎯</span>
              <span>Mentors</span>
            </button>
          </div>

          <div className="px-6 py-2">
            <button
              onClick={() => setActiveTab("investors")}
              className={`flex items-center space-x-3 px-3 py-2 w-full text-left rounded-lg ${
                activeTab === "investors"
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <span>💰</span>
              <span>Investors</span>
            </button>
          </div>

          <div className="px-6 py-2">
            <button
              onClick={() => setActiveTab("messages")}
              className={`flex items-center space-x-3 px-3 py-2 w-full text-left rounded-lg ${
                activeTab === "messages"
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <span>💬</span>
              <span>Messages</span>
            </button>
          </div>

          <div className="px-6 py-2">
            <button
              onClick={() => setActiveTab("funding")}
              className={`flex items-center space-x-3 px-3 py-2 w-full text-left rounded-lg ${
                activeTab === "funding"
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <span>📈</span>
              <span>Funding Progress</span>
            </button>
          </div>

          <div className="px-6 py-2">
            <button
              onClick={() => setActiveTab("team")}
              className={`flex items-center space-x-3 px-3 py-2 w-full text-left rounded-lg ${
                activeTab === "team"
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <span>👥</span>
              <span>Team Management</span>
            </button>
          </div>

          <div className="px-6 py-2">
            <button
              onClick={() => setActiveTab("settings")}
              className={`flex items-center space-x-3 px-3 py-2 w-full text-left rounded-lg ${
                activeTab === "settings"
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <span>⚙️</span>
              <span>Settings</span>
            </button>
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8">
        {/* Tab Content */}
        {renderTabContent()}
      </div>

      {/* Event Details Modal */}
      {showEventDetails && eventDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">
                Event Details
              </h2>
              <button
                onClick={() => setShowEventDetails(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900">Title</h3>
                <p className="text-gray-700">{eventDetails.title}</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900">Description</h3>
                <p className="text-gray-700">{eventDetails.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-gray-900">Type</h3>
                  <p className="text-gray-700">{eventDetails.event_type}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    Max Participants
                  </h3>
                  <p className="text-gray-700">
                    {eventDetails.max_participants}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-gray-900">Start Date</h3>
                  <p className="text-gray-700">
                    {new Date(eventDetails.start_date).toLocaleString()}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">End Date</h3>
                  <p className="text-gray-700">
                    {new Date(eventDetails.end_date).toLocaleString()}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900">Location</h3>
                <p className="text-gray-700">{eventDetails.location}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-gray-900">Virtual Event</h3>
                  <p className="text-gray-700">
                    {eventDetails.is_virtual ? "Yes" : "No"}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Public Event</h3>
                  <p className="text-gray-700">
                    {eventDetails.is_public ? "Yes" : "No"}
                  </p>
                </div>
              </div>

              {eventDetails.registrations &&
                eventDetails.registrations.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">
                      Registered Users ({eventDetails.registrations.length})
                    </h3>
                    <div className="max-h-40 overflow-y-auto">
                      {eventDetails.registrations.map((registration, index) => (
                        <div
                          key={index}
                          className="flex items-center space-x-2 py-1"
                        >
                          <span className="text-gray-700">
                            {registration.user.full_name}
                          </span>
                          <span className="text-sm text-gray-500">
                            ({registration.user.email})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowEventDetails(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
