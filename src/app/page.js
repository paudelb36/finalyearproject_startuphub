"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import Image from "next/image";

export default function HomePage() {
  const { user, loading } = useAuth();
  const [startups, setStartups] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [events, setEvents] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    fetchHomeData();
  }, []);

  const fetchHomeData = async () => {
    try {
      // Fetch recent startups
      const { data: startupsData } = await supabase
        .from("startup_profiles")
        .select(
          `
          *,
          profiles!startup_profiles_user_id_fkey(full_name, avatar_url)
        `
        )
        .order("created_at", { ascending: false })
        .limit(6);

      // Fetch recent updates
      const { data: updatesData } = await supabase
        .from("startup_updates")
        .select(
          `
          *,
          startup_profiles!startup_updates_startup_id_fkey(company_name, logo_url, slug)
        `
        )
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(5);

      // Fetch upcoming events
      const { data: eventsData } = await supabase
        .from("events")
        .select("*")
        .eq("is_public", true)
        .gte("start_date", new Date().toISOString())
        .order("start_date", { ascending: true })
        .limit(4);

      setStartups(startupsData || []);
      setUpdates(updatesData || []);
      setEvents(eventsData || []);
    } catch (error) {
      console.error("Error fetching home data:", error);
    } finally {
      setLoadingData(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">
            Loading your startup ecosystem...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-900 via-blue-700 to-purple-700">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute top-0 left-0 w-full h-full"
            style={{
              backgroundImage:
                "url('data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')",
            }}
          ></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="text-center">
            <h1 className="text-5xl lg:text-7xl font-bold text-white mb-6 leading-tight">
              Connect.<span className="text-blue-300"> Grow.</span>{" "}
              <span className="text-purple-300">Succeed.</span>
            </h1>
            <p className="text-xl lg:text-2xl text-blue-100 mb-12 max-w-3xl mx-auto leading-relaxed">
              The ultimate platform connecting startups, mentors, and investors
              to build the future together. Join thousands of entrepreneurs
              already growing their ventures.
            </p>

            {!user ? (
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link
                  href="/auth/signup"
                  className="group bg-white text-blue-700 px-10 py-4 rounded-full font-bold text-lg hover:bg-blue-50 transition-all transform hover:scale-105 shadow-xl hover:shadow-2xl"
                >
                  <span className="flex items-center gap-2">
                    Get Started Free
                    <svg
                      className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>
                </Link>
                <Link
                  href="/auth/signin"
                  className="border-2 border-white text-white px-10 py-4 rounded-full font-bold text-lg hover:bg-white hover:text-blue-700 transition-all transform hover:scale-105"
                >
                  Sign In
                </Link>
              </div>
            ) : (
              <Link
                href="/dashboard"
                className="group bg-white text-blue-700 px-10 py-4 rounded-full font-bold text-lg hover:bg-blue-50 transition-all transform hover:scale-105 shadow-xl hover:shadow-2xl"
              >
                <span className="flex items-center gap-2">
                  Go to Dashboard
                  <svg
                    className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
              </Link>
            )}
          </div>
        </div>

        {/* Wave separator */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" className="w-full h-auto">
            <path
              fill="#f9fafb"
              d="M0,64L48,69.3C96,75,192,85,288,80C384,75,480,53,576,48C672,43,768,53,864,69.3C960,85,1056,107,1152,112C1248,117,1344,107,1392,101.3L1440,96L1440,120L1392,120C1344,120,1248,120,1152,120C1056,120,960,120,864,120C768,120,672,120,576,120C480,120,384,120,288,120C192,120,96,120,48,120L0,120Z"
            ></path>
          </svg>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20 py-16">
        {/* Featured Startups */}
        <section>
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Featured Startups
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Discover innovative startups that are shaping the future across
              various industries
            </p>
            <div className="mt-8">
              <Link
                href="/startups"
                className="group inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-semibold text-lg transition-colors"
              >
                Explore All Startups
                <svg
                  className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </Link>
            </div>
          </div>

          {loadingData ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl shadow-lg p-8 animate-pulse"
                >
                  <div className="flex items-center mb-6">
                    <div className="h-12 w-12 bg-gray-200 rounded-xl mr-4"></div>
                    <div className="flex-1">
                      <div className="h-5 bg-gray-200 rounded mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  </div>
                  <div className="h-4 bg-gray-200 rounded mb-3"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-6"></div>
                  <div className="flex justify-between items-center">
                    <div className="h-8 bg-gray-200 rounded-full w-20"></div>
                    <div className="h-4 bg-gray-200 rounded w-16"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {startups.map((startup, index) => (
                <Link
                  key={startup.id}
                  href={`/startups/${startup.slug || startup.id || 'unknown'}`}
                  className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-8 transform hover:-translate-y-2 border border-gray-100"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-center mb-6">
                    {startup.logo_url ? (
                      <div className="relative">
                        <Image
                          src={startup.logo_url}
                          alt={startup.company_name}
                          width={48}
                          height={48}
                          className="rounded-xl shadow-md group-hover:scale-110 transition-transform"
                        />
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-blue-600/20 to-purple-600/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      </div>
                    ) : (
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                        {startup.company_name.charAt(0)}
                      </div>
                    )}
                    <div className="ml-4 flex-1">
                      <h3 className="font-bold text-xl text-gray-900 group-hover:text-blue-600 transition-colors">
                        {startup.company_name}
                      </h3>
                      <p className="text-blue-600 font-medium text-sm">
                        {startup.industry}
                      </p>
                    </div>
                  </div>
                  <p
                    className="text-gray-700 mb-6 leading-relaxed overflow-hidden"
                    style={{
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    {startup.tagline}
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 px-4 py-2 rounded-full font-semibold text-sm">
                      {startup.stage}
                    </span>
                    <div className="flex items-center text-gray-500 text-sm">
                      <svg
                        className="w-4 h-4 mr-1"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {startup.location}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Recent Updates */}
        <section className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-3xl p-8 lg:p-16">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Latest Updates
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Stay informed with the latest milestones, achievements, and news
              from our startup community
            </p>
            <div className="mt-8">
              <Link
                href="/feed"
                className="group inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-semibold text-lg transition-colors"
              >
                View Full Feed
                <svg
                  className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </Link>
            </div>
          </div>

          {loadingData ? (
            <div className="space-y-6">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl shadow-lg p-8 animate-pulse"
                >
                  <div className="flex items-center mb-6">
                    <div className="h-12 w-12 bg-gray-200 rounded-xl mr-4"></div>
                    <div className="flex-1">
                      <div className="h-5 bg-gray-200 rounded mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                    </div>
                  </div>
                  <div className="h-6 bg-gray-200 rounded mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-8">
              {updates.map((update, index) => (
                <div
                  key={update.id}
                  className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-8 border border-gray-100"
                  style={{ animationDelay: `${index * 150}ms` }}
                >
                  <div className="flex items-center mb-6">
                    {update.startup_profiles?.logo_url ? (
                      <Image
                        src={update.startup_profiles.logo_url}
                        alt={update.startup_profiles.company_name}
                        width={48}
                        height={48}
                        className="rounded-xl shadow-md"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                        {update.startup_profiles?.company_name?.charAt(0)}
                      </div>
                    )}
                    <div className="ml-4 flex-1">
                      <Link
                        href={`/startups/${update.startup_profiles?.slug || update.startup_profiles?.id || 'unknown'}`}
                        className="font-bold text-xl text-gray-900 hover:text-blue-600 transition-colors"
                      >
                        {update.startup_profiles?.company_name}
                      </Link>
                      <p className="text-gray-500 font-medium">
                        {new Date(update.created_at).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          }
                        )}
                      </p>
                    </div>
                  </div>
                  <h3 className="font-bold text-2xl mb-4 text-gray-900">
                    {update.title}
                  </h3>
                  <p className="text-gray-700 leading-relaxed text-lg mb-4">
                    {update.content}
                  </p>
                  {update.milestone_type && (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-2 bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 px-4 py-2 rounded-full font-semibold">
                        <svg
                          className="w-4 h-4"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                        {update.milestone_type}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Upcoming Events */}
        <section>
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Upcoming Events
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Join networking events, workshops, and pitch competitions to
              accelerate your startup journey
            </p>
            <div className="mt-8">
              <Link
                href="/events"
                className="group inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-semibold text-lg transition-colors"
              >
                Browse All Events
                <svg
                  className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </Link>
            </div>
          </div>

          {loadingData ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl shadow-lg p-8 animate-pulse"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="h-6 bg-gray-200 rounded w-2/3"></div>
                    <div className="h-8 bg-gray-200 rounded-full w-20"></div>
                  </div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-6"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : events.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {events.map((event, index) => (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-8 transform hover:-translate-y-2 border border-gray-100"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex justify-between items-start mb-6">
                    <h3 className="font-bold text-xl text-gray-900 group-hover:text-blue-600 transition-colors flex-1 pr-4">
                      {event.title}
                    </h3>
                    <span
                      className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap ${
                        event.event_type === "workshop"
                          ? "bg-purple-100 text-purple-800"
                          : event.event_type === "networking"
                          ? "bg-blue-100 text-blue-800"
                          : event.event_type === "pitch"
                          ? "bg-green-100 text-green-800"
                          : "bg-orange-100 text-orange-800"
                      }`}
                    >
                      {event.event_type}
                    </span>
                  </div>

                  <p className="text-gray-700 mb-6 leading-relaxed line-clamp-3">
                    {event.description}
                  </p>

                  <div className="space-y-3 text-gray-600">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-lg">
                        <svg
                          className="w-4 h-4 text-blue-600"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <span className="font-medium">
                        {new Date(event.start_date).toLocaleDateString(
                          "en-US",
                          {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          }
                        )}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-lg">
                        <svg
                          className="w-4 h-4 text-green-600"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <span className="font-medium">
                        {event.is_virtual
                          ? "Virtual Event"
                          : event.location || "TBD"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-100">
                    <span className="text-blue-600 font-semibold group-hover:text-blue-800 transition-colors">
                      Learn more →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                No Upcoming Events
              </h3>
              <p className="text-gray-600 mb-8">
                Stay tuned! Exciting events are being planned.
              </p>
              <Link
                href="/events"
                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-semibold"
              >
                Check Back Soon
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </Link>
            </div>
          )}
        </section>
      </div>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-blue-900 to-purple-900 text-white py-20">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">
            Ready to Build the Future?
          </h2>
          <p className="text-xl mb-12 text-blue-100">
            Join our thriving ecosystem of entrepreneurs, mentors, and
            investors. Your startup journey begins here.
          </p>
          {!user ? (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/auth/signup"
                className="group bg-white text-blue-700 px-10 py-4 rounded-full font-bold text-lg hover:bg-blue-50 transition-all transform hover:scale-105 shadow-xl"
              >
                <span className="flex items-center gap-2">
                  Join Free Today
                  <svg
                    className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
              </Link>
              <Link
                href="/about"
                className="border-2 border-white text-white px-10 py-4 rounded-full font-bold text-lg hover:bg-white hover:text-blue-700 transition-all"
              >
                Learn More
              </Link>
            </div>
          ) : (
            <Link
              href="/dashboard"
              className="group bg-white text-blue-700 px-10 py-4 rounded-full font-bold text-lg hover:bg-blue-50 transition-all transform hover:scale-105 shadow-xl"
            >
              <span className="flex items-center gap-2">
                Continue Your Journey
                <svg
                  className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
            </Link>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Why Choose Our Platform?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Everything you need to grow your startup, connect with the right
              people, and secure funding
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Network & Connect
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Connect with like-minded entrepreneurs, experienced mentors, and
                potential investors from around the world.
              </p>
            </div>

            <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Track Growth
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Share milestones, track progress, and showcase your
                startup&apos;s journey with our comprehensive dashboard.
              </p>
            </div>

            <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Secure Funding
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Access a network of angel investors and VCs actively looking for
                the next big opportunity.
              </p>
            </div>

            <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Learn & Grow
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Attend workshops, webinars, and events designed to help you
                master the art of building successful startups.
              </p>
            </div>

            <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Validate Ideas
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Get feedback from experienced entrepreneurs and validate your
                business ideas before going to market.
              </p>
            </div>

            <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2V6"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Find Co-founders
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Discover talented individuals who share your vision and are
                ready to co-found the next big thing.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/*Footer*/}
      <>
        {/* Back to Top Button */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-8 right-8 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white p-3 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 z-50 group"
          aria-label="Back to top"
        >
          <svg
            className="w-6 h-6 transform group-hover:-translate-y-0.5 transition-transform duration-200"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 10l7-7m0 0l7 7m-7-7v18"
            />
          </svg>
        </button>

        {/* Enhanced Footer */}
        <footer className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white overflow-hidden">
          {/* Decorative Background Elements */}
          <div className="absolute inset-0">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
          </div>

          {/* Animated Grid Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="grid grid-cols-12 gap-4 h-full p-8">
              {[...Array(48)].map((_, i) => (
                <div
                  key={i}
                  className="border border-gray-500/20 rounded animate-pulse"
                  style={{ animationDelay: `${i * 0.1}s` }}
                ></div>
              ))}
            </div>
          </div>

          <div className="relative z-10 container mx-auto px-4 py-12">
            {/* Main Footer Content */}
            <div className="grid md:grid-cols-4 gap-8 mb-8">
              {/* Brand Section */}
              <div className="md:col-span-2">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-lg">S</span>
                  </div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                    StartupHub
                  </h3>
                </div>
                <p className="text-gray-300 leading-relaxed max-w-md">
                  Empowering entrepreneurs and startups to build the future.
                  Connect, learn, and grow with our innovative platform designed
                  for success.
                </p>

                {/* Social Media Icons */}
                <div className="flex space-x-4 mt-6">
                  {["twitter", "linkedin", "github", "discord"].map(
                    (platform) => (
                      <a
                        key={platform}
                        href="#"
                        className="w-10 h-10 bg-gray-700/50 hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-600 rounded-lg flex items-center justify-center transition-all duration-300 transform hover:scale-110 hover:rotate-6"
                      >
                        <span className="text-sm font-medium capitalize">
                          {platform[0]}
                        </span>
                      </a>
                    )
                  )}
                </div>
              </div>

              {/* Quick Links */}
              <div>
                <h4 className="text-lg font-semibold mb-4 text-blue-400">
                  Quick Links
                </h4>
                <ul className="space-y-2">
                  {["About Us", "Services", "Contact", "Blog"].map((link) => (
                    <li key={link}>
                      <a
                        href="#"
                        className="text-gray-300 hover:text-white hover:translate-x-2 transition-all duration-200 inline-block"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Legal */}
              <div>
                <h4 className="text-lg font-semibold mb-4 text-purple-400">
                  Legal
                </h4>
                <ul className="space-y-2">
                  {[
                    "Privacy Policy",
                    "Terms of Service",
                    "Cookie Policy",
                    "GDPR",
                  ].map((link) => (
                    <li key={link}>
                      <a
                        href="#"
                        className="text-gray-300 hover:text-white hover:translate-x-2 transition-all duration-200 inline-block"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Newsletter Signup */}
            <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-2xl p-6 mb-8 border border-gray-700/50 backdrop-blur-sm">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="text-lg font-semibold mb-1">Stay Updated</h4>
                  <p className="text-gray-300 text-sm">
                    Get the latest news and updates delivered to your inbox.
                  </p>
                </div>
                <div className="flex w-full md:w-auto max-w-sm">
                  <input
                    type="email"
                    placeholder="Enter your email"
                    className="flex-1 px-4 py-2 bg-gray-800/50 border border-gray-600 rounded-l-lg focus:outline-none focus:border-blue-500 text-white placeholder-gray-400"
                  />
                  <button className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-r-lg font-medium transition-all duration-200 transform hover:scale-105">
                    Subscribe
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Bar */}
            <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-gray-700/50">
              <div className="flex items-center space-x-2 mb-4 md:mb-0">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <p className="text-gray-300 text-sm">
                  &copy; 2025 StartupHub. All rights reserved.
                </p>
              </div>

            
            </div>
          </div>

          {/* Bottom Gradient Line */}
          <div className="h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
        </footer>
      </>
    </div>
  );
}
