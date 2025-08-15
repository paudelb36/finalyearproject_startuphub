"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import {
  Users,
  Calendar,
  MessageSquare,
  Flag,
  BarChart3,
  Settings,
  Plus,
  Eye,
  Edit,
  Trash2,
  UserCheck,
  UserX,
  AlertTriangle,
} from "lucide-react";
import {
  getPlatformStats,
  getUsers,
  getEvents,
  createEventAsAdmin,
  getEventDetailsAsAdmin,
  updateEventAsAdmin,
  deleteEventAsAdmin,
  updateUserStatus,
  deleteUserAccount,
} from "@/lib/api/admin";

const AdminDashboard = () => {
  const router = useRouter();
  const [adminUser, setAdminUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [events, setEvents] = useState([]);
  const [users, setUsers] = useState([]);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [showEditEvent, setShowEditEvent] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventDetails, setEventDetails] = useState(null);
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    event_type: "webinar",
    start_date: "",
    end_date: "",
    location: "",
    is_virtual: false,
    google_meet_link: "",
    max_participants: 100,
    registration_deadline: "",
    is_public: true,
    tags: [],
    target_audience: ['startup', 'mentor', 'investor'],
  });
  const [editEvent, setEditEvent] = useState({});

  useEffect(() => {
    // Check for admin session in localStorage
    const checkAdminSession = () => {
      try {
        const adminSession = localStorage.getItem('adminSession');
        if (adminSession) {
          const admin = JSON.parse(adminSession);
          setAdminUser(admin);
          setLoading(false);
          // Load dashboard data
          loadDashboardData();
        } else {
          // No admin session found, redirect to login
          router.push('/admin/login');
        }
      } catch (error) {
        console.error('Error checking admin session:', error);
        router.push('/admin/login');
      }
    };

    checkAdminSession();
  }, [router]);

  const loadDashboardData = async (filters = {}) => {
    try {
      const [statsData, eventsData, usersData] = await Promise.all([
        getPlatformStats(),
        getEvents(),
        getUsers({ limit: 50, ...filters }),
      ]);

      // Debug logging (you can remove this after confirming it works)
      console.log("Stats API Response:", statsData);

      // Fix: Access the nested data structure correctly
      setStats(statsData?.data || {}); // Remove the fallback to statsData itself
      setEvents(
        eventsData?.data?.events || eventsData?.events || eventsData || []
      );
      setUsers(usersData?.data?.users || usersData?.users || usersData || []);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      toast.error("Failed to load dashboard data");
    }
  };

  const handleUpdateUserStatus = async (userId, newStatus) => {
    if (
      !confirm(
        `Are you sure you want to ${
          newStatus === "active" ? "activate" : "suspend"
        } this user?`
      )
    ) {
      return;
    }

    try {
      const result = await updateUserStatus(userId, newStatus);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(
        `User ${
          newStatus === "active" ? "activated" : "suspended"
        } successfully`
      );
      loadDashboardData();
    } catch (error) {
      console.error("Error updating user status:", error);
      toast.error("Failed to update user status");
    }
  };

  const handleDeleteUser = async (userId) => {
    if (
      !confirm(
        "Are you sure you want to delete this user? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const result = await deleteUserAccount(userId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("User deleted successfully");
      loadDashboardData();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Failed to delete user");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("adminSession");
    toast.success("Logged out successfully");
    router.push("/admin/login");
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    try {
      const eventData = {
        ...newEvent,
        is_public: newEvent.is_public,
        tags: newEvent.tags,
      };

      const result = await createEventAsAdmin(eventData, adminUser?.id);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Event created successfully!");
      setShowCreateEvent(false);
      setNewEvent({
        title: "",
        description: "",
        event_type: "webinar",
        start_date: "",
        end_date: "",
        location: "",
        is_virtual: false,
        google_meet_link: "",
        max_participants: 100,
        registration_deadline: "",
        is_public: true,
        tags: [],
        target_audience: ['startup', 'mentor', 'investor'],
      });
      loadDashboardData();
    } catch (error) {
      console.error("Error creating event:", error);
      toast.error("Failed to create event");
    }
  };

  const handleViewEvent = async (event) => {
    try {
      const result = await getEventDetailsAsAdmin(event.id, adminUser?.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setEventDetails(result.data);
      setSelectedEvent(event);
      setShowEventDetails(true);
    } catch (error) {
      console.error("Error fetching event details:", error);
      toast.error("Failed to load event details");
    }
  };

  const handleEditEvent = (event) => {
    console.log("Editing event:", event);
    const editData = {
      ...event,
      start_date: event.start_date
        ? new Date(event.start_date).toISOString().slice(0, 16)
        : "",
      end_date: event.end_date
        ? new Date(event.end_date).toISOString().slice(0, 16)
        : "",
      registration_deadline: event.registration_deadline
        ? new Date(event.registration_deadline).toISOString().slice(0, 16)
        : "",
      tags: event.tags || [],
    };
    console.log("Edit data prepared:", editData);
    setEditEvent(editData);
    setSelectedEvent(event);
    setShowEditEvent(true);
  };

  const handleUpdateEvent = async (e) => {
    e.preventDefault();
    try {
      // Remove fields that don't exist in the database schema
      const {
        organizer,
        registrations,
        registrationCount,
        ...eventDataToUpdate
      } = editEvent;

      const result = await updateEventAsAdmin(
        selectedEvent.id,
        eventDataToUpdate,
        adminUser?.id
      );
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Event updated successfully!");
      setShowEditEvent(false);
      setEditEvent({});
      setSelectedEvent(null);
      loadDashboardData();
    } catch (error) {
      console.error("Error updating event:", error);
      toast.error("Failed to update event");
    }
  };

  const handleDeleteEvent = async (event) => {
    if (
      !confirm(
        `Are you sure you want to delete "${event.title}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const result = await deleteEventAsAdmin(event.id, adminUser?.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Event deleted successfully!");
      loadDashboardData();
    } catch (error) {
      console.error("Error deleting event:", error);
      toast.error("Failed to delete event");
    }
  };

  const handleRecentEventClick = (event) => {
    handleViewEvent(event);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!adminUser) {
    return null;
  }

  const tabs = [
    { id: "overview", name: "Overview", icon: BarChart3 },
    { id: "events", name: "Events", icon: Calendar },
    { id: "users", name: "Users", icon: Users },
    { id: "content", name: "Content", icon: Flag },
    { id: "settings", name: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Admin Dashboard
              </h1>
              <p className="text-gray-600">
                Welcome back, {adminUser?.full_name}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowCreateEvent(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Create Event</span>
              </button>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
              >
                <Settings className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center">
                  <Users className="w-8 h-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">
                      Total Users
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats?.totalUsers || 0}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center">
                  <Calendar className="w-8 h-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">
                      Total Events
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats?.totalEvents || 0}
                    </p>
                  </div>
                </div>
              </div>
              {/* You can add more stats cards using the other data from your API */}
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center">
                  <Users className="w-8 h-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">
                      New Users (30 days)
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats?.newUsersLast30Days || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            {/* // Optional: Add more detailed stats cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center">
                  <Users className="w-8 h-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">
                      Startups
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats?.totalStartups || 0}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center">
                  <Users className="w-8 h-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Mentors</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats?.totalMentors || 0}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center">
                  <Users className="w-8 h-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">
                      Investors
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats?.totalInvestors || 0}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center">
                  <MessageSquare className="w-8 h-8 text-orange-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">
                      Messages
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats?.totalMessages || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Recent Users
                </h3>
                <div className="space-y-3">
                  {users.slice(0, 5).map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-medium">
                            {user.full_name?.charAt(0) || "U"}
                          </span>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">
                            {user.full_name}
                          </p>
                          <p className="text-xs text-gray-500 capitalize">
                            {user.role}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(user.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Recent Events
                </h3>
                <div className="space-y-3">
                  {events.slice(0, 5).map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between p-2 rounded hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => handleRecentEventClick(event)}
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900 hover:text-blue-600">
                          {event.title}
                        </p>
                        <p className="text-xs text-gray-500 capitalize">
                          {event.event_type}
                        </p>
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(event.start_date).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Events Tab */}
        {activeTab === "events" && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  All Events
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Event
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Participants
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {events.map((event) => (
                      <tr key={event.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {event.title}
                            </div>
                            <div className="text-sm text-gray-500">
                              {event.location}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 capitalize">
                            {event.event_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(event.start_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {event.max_participants || "Unlimited"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                              onClick={() => handleViewEvent(event)}
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50"
                              onClick={() => handleEditEvent(event)}
                              title="Edit Event"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                              onClick={() => handleDeleteEvent(event)}
                              title="Delete Event"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === "users" && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">
                User Management
              </h3>
              <div className="flex items-center space-x-4">
                <input
                  type="text"
                  placeholder="Search users..."
                  className="px-4 py-2 text-gray-700 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onChange={(e) => {
                    const searchTerm = e.target.value;
                    if (searchTerm) {
                      loadDashboardData({ search: searchTerm });
                    } else {
                      loadDashboardData();
                    }
                  }}
                />
                <select
                  className="px-4 py-2 text-gray-700 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onChange={(e) => loadDashboardData({ role: e.target.value })}
                >
                  <option value="">All Roles</option>
                  <option value="startup">Startups</option>
                  <option value="mentor">Mentors</option>
                  <option value="investor">Investors</option>
                </select>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0">
                            <img
                              className="h-10 w-10 rounded-full"
                              src={
                                user.avatar_url ||
                                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                  user.full_name
                                )}&background=random`
                              }
                              alt={user.full_name}
                            />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.full_name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                            user.role === "startup"
                              ? "bg-purple-100 text-purple-800"
                              : user.role === "mentor"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                            user.status === "active"
                              ? "bg-green-100 text-green-800"
                              : user.status === "suspended"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {user.status || "active"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center space-x-3">
                          {(user.status || "active") === "active" ? (
                            <button
                              onClick={() =>
                                handleUpdateUserStatus(user.id, "suspended")
                              }
                              className="text-yellow-600 hover:text-yellow-900"
                              title="Suspend User"
                            >
                              <UserX className="w-5 h-5" />
                            </button>
                          ) : (user.status || "active") === "suspended" ? (
                            <button
                              onClick={() =>
                                handleUpdateUserStatus(user.id, "active")
                              }
                              className="text-green-600 hover:text-green-900"
                              title="Activate User"
                            >
                              <UserCheck className="w-5 h-5" />
                            </button>
                          ) : null}
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete User"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Create Event Modal */}
      {showCreateEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Create New Event
              </h3>
              <form onSubmit={handleCreateEvent} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Event Title
                  </label>
                  <input
                    type="text"
                    value={newEvent.title}
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, title: e.target.value })
                    }
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                    style={{ color: "#111827" }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newEvent.description}
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, description: e.target.value })
                    }
                    rows={3}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                    style={{ color: "#111827" }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Event Type
                    </label>
                    <select
                      value={newEvent.event_type}
                      onChange={(e) =>
                        setNewEvent({ ...newEvent, event_type: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                      style={{ color: "#111827" }}
                    >
                      <option value="webinar">Webinar</option>
                      <option value="workshop">Workshop</option>
                      <option value="pitch_event">Pitch Event</option>
                      <option value="networking">Networking</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Participants
                    </label>
                    <input
                      type="number"
                      value={newEvent.max_participants}
                      onChange={(e) =>
                        setNewEvent({
                          ...newEvent,
                          max_participants: parseInt(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                      style={{ color: "#111827" }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={newEvent.start_date}
                      onChange={(e) =>
                        setNewEvent({ ...newEvent, start_date: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                      style={{ color: "#111827" }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="datetime-local"
                      value={newEvent.end_date}
                      onChange={(e) =>
                        setNewEvent({ ...newEvent, end_date: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                      style={{ color: "#111827" }}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={newEvent.location}
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, location: e.target.value })
                    }
                    placeholder="Enter location or leave empty for virtual events"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                    style={{ color: "#111827" }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Registration Deadline
                    </label>
                    <input
                      type="datetime-local"
                      value={newEvent.registration_deadline}
                      onChange={(e) =>
                        setNewEvent({
                          ...newEvent,
                          registration_deadline: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                      style={{ color: "#111827" }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Google Meet Link (for virtual events)
                    </label>
                    <input
                      type="url"
                      value={newEvent.google_meet_link}
                      onChange={(e) =>
                        setNewEvent({
                          ...newEvent,
                          google_meet_link: e.target.value,
                        })
                      }
                      placeholder="https://meet.google.com/..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                      style={{ color: "#111827" }}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={newEvent.tags.join(", ")}
                    onChange={(e) =>
                      setNewEvent({
                        ...newEvent,
                        tags: e.target.value
                          .split(",")
                          .map((tag) => tag.trim())
                          .filter((tag) => tag),
                      })
                    }
                    placeholder="e.g., startup, technology, innovation"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                    style={{ color: "#111827" }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target Audience
                  </label>
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {['startup', 'mentor', 'investor'].map((audience) => (
                        <label key={audience} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={newEvent.target_audience?.includes(audience) || false}
                            onChange={(e) => {
                              const currentAudience = newEvent.target_audience || ['startup', 'mentor', 'investor'];
                              if (e.target.checked) {
                                setNewEvent({
                                  ...newEvent,
                                  target_audience: [...currentAudience.filter(a => a !== audience), audience]
                                });
                              } else {
                                setNewEvent({
                                  ...newEvent,
                                  target_audience: currentAudience.filter(a => a !== audience)
                                });
                              }
                            }}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
                          />
                          <span className="text-sm text-gray-700 capitalize">{audience}</span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500">
                      Select who can register for this event. If none selected, all user types can register.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="is_virtual"
                      checked={newEvent.is_virtual}
                      onChange={(e) =>
                        setNewEvent({
                          ...newEvent,
                          is_virtual: e.target.checked,
                        })
                      }
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label
                      htmlFor="is_virtual"
                      className="ml-2 block text-sm text-gray-900"
                    >
                      Virtual Event
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="is_public"
                      checked={newEvent.is_public}
                      onChange={(e) =>
                        setNewEvent({
                          ...newEvent,
                          is_public: e.target.checked,
                        })
                      }
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label
                      htmlFor="is_public"
                      className="ml-2 block text-sm text-gray-900"
                    >
                      Public Event
                    </label>
                  </div>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateEvent(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                  >
                    Create Event
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Event Details Modal */}
      {showEventDetails && eventDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">
                Event Details
              </h2>
              <button
                onClick={() => setShowEventDetails(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    {eventDetails?.title || "Event Details"}
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-gray-500">
                        Type:
                      </span>
                      <span className="ml-2 text-sm text-gray-900 capitalize">
                        {eventDetails?.event_type || "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">
                        Start Date:
                      </span>
                      <span className="ml-2 text-sm text-gray-900">
                        {eventDetails?.start_date
                          ? new Date(eventDetails.start_date).toLocaleString()
                          : "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">
                        End Date:
                      </span>
                      <span className="ml-2 text-sm text-gray-900">
                        {eventDetails?.end_date
                          ? new Date(eventDetails.end_date).toLocaleString()
                          : "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">
                        Location:
                      </span>
                      <span className="ml-2 text-sm text-gray-900">
                        {eventDetails?.location || "Virtual"}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">
                        Max Participants:
                      </span>
                      <span className="ml-2 text-sm text-gray-900">
                        {eventDetails?.max_participants || "Unlimited"}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">
                        Registration Deadline:
                      </span>
                      <span className="ml-2 text-sm text-gray-900">
                        {eventDetails?.registration_deadline
                          ? new Date(
                              eventDetails.registration_deadline
                            ).toLocaleString()
                          : "No deadline"}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">
                        Virtual Event:
                      </span>
                      <span className="ml-2 text-sm text-gray-900">
                        {eventDetails?.is_virtual ? "Yes" : "No"}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">
                        Public Event:
                      </span>
                      <span className="ml-2 text-sm text-gray-900">
                        {eventDetails?.is_public ? "Yes" : "No"}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4">
                    <span className="text-sm font-medium text-gray-500">
                      Description:
                    </span>
                    <p className="mt-1 text-sm text-gray-900">
                      {eventDetails?.description || "No description available"}
                    </p>
                  </div>
                </div>
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-4">
                    Registered Users ({eventDetails.registrations?.length || 0})
                  </h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {eventDetails.registrations?.length > 0 ? (
                      eventDetails.registrations.map((registration) => (
                        <div
                          key={registration.id}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded"
                        >
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {registration.user?.full_name || "Unknown User"}
                            </p>
                            <p className="text-xs text-gray-500">
                              {registration.user?.email || "No email"}
                            </p>
                            <p className="text-xs text-gray-400 capitalize">
                              {registration.user?.role || "User"}
                            </p>
                          </div>
                          <span className="text-xs text-gray-400">
                            {new Date(
                              registration.registered_at ||
                                registration.created_at
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">
                        No registrations yet
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Event Modal */}
      {showEditEvent && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">
                Edit Event
              </h2>
              <button
                onClick={() => setShowEditEvent(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={handleUpdateEvent} className="space-y-4">
                <div>
                  <label
                    htmlFor="edit_title"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Event Title
                  </label>
                  <input
                    type="text"
                    id="edit_title"
                    value={editEvent.title || ""}
                    onChange={(e) =>
                      setEditEvent({ ...editEvent, title: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="edit_description"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Description
                  </label>
                  <textarea
                    id="edit_description"
                    value={editEvent.description || ""}
                    onChange={(e) =>
                      setEditEvent({
                        ...editEvent,
                        description: e.target.value,
                      })
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="edit_event_type"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Event Type
                    </label>
                    <select
                      id="edit_event_type"
                      value={editEvent.event_type || "webinar"}
                      onChange={(e) =>
                        setEditEvent({
                          ...editEvent,
                          event_type: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    >
                      <option value="webinar">Webinar</option>
                      <option value="workshop">Workshop</option>
                      <option value="networking">Networking</option>
                      <option value="conference">Conference</option>
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="edit_max_participants"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Max Participants
                    </label>
                    <input
                      type="number"
                      id="edit_max_participants"
                      value={editEvent.max_participants || ""}
                      onChange={(e) =>
                        setEditEvent({
                          ...editEvent,
                          max_participants: parseInt(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      min="1"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="edit_start_date"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Start Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      id="edit_start_date"
                      value={editEvent.start_date || ""}
                      onChange={(e) =>
                        setEditEvent({
                          ...editEvent,
                          start_date: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      required
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="edit_end_date"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      End Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      id="edit_end_date"
                      value={editEvent.end_date || ""}
                      onChange={(e) =>
                        setEditEvent({ ...editEvent, end_date: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="edit_registration_deadline"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Registration Deadline
                  </label>
                  <input
                    type="datetime-local"
                    id="edit_registration_deadline"
                    value={editEvent.registration_deadline || ""}
                    onChange={(e) =>
                      setEditEvent({
                        ...editEvent,
                        registration_deadline: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </div>
                <div>
                  <label
                    htmlFor="edit_location"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Location
                  </label>
                  <input
                    type="text"
                    id="edit_location"
                    value={editEvent.location || ""}
                    onChange={(e) =>
                      setEditEvent({ ...editEvent, location: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    placeholder="Enter location or leave empty for virtual"
                  />
                </div>
                <div className="flex space-x-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="edit_is_virtual"
                      checked={editEvent.is_virtual || false}
                      onChange={(e) =>
                        setEditEvent({
                          ...editEvent,
                          is_virtual: e.target.checked,
                        })
                      }
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label
                      htmlFor="edit_is_virtual"
                      className="ml-2 block text-sm text-gray-900"
                    >
                      Virtual Event
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="edit_is_public"
                      checked={editEvent.is_public !== false}
                      onChange={(e) =>
                        setEditEvent({
                          ...editEvent,
                          is_public: e.target.checked,
                        })
                      }
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label
                      htmlFor="edit_is_public"
                      className="ml-2 block text-sm text-gray-900"
                    >
                      Public Event
                    </label>
                  </div>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowEditEvent(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                  >
                    Update Event
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
