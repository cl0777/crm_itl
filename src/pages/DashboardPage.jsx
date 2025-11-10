import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "@/lib/api";
import logo from "/logo.png";

function DashboardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check if token exists
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) {
      navigate("/admin/crm/login");
      return;
    }

    // Fetch user data from API
    const fetchUserData = async () => {
      try {
        const response = await apiClient.get("/auth/me");
        const userData = response.data?.user || response.data;
        if (userData) {
          setUser(userData);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        navigate("/admin/crm/login");
      }
    };

    fetchUserData();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    navigate("/admin/crm/login");
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-500 rounded-lg mr-3">
                <img src={logo} alt="Logo" />
              </div>
              <h1 className="text-2xl font-bold text-white">
                CRM Admin Dashboard
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-slate-300">Welcome, {user.username}</span>
              <button
                onClick={handleLogout}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors duration-200"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Actions */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-xl border border-white/20 p-6 mb-8">
          <h3 className="text-xl font-semibold text-white mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <button
              onClick={() => navigate("/admin/crm/customers")}
              className="flex items-center justify-center p-4 bg-white/10 hover:bg-white/20 rounded-lg transition-colors duration-200"
            >
              <svg
                className="w-5 h-5 text-white mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                />
              </svg>
              <span className="text-white">View Customers</span>
            </button>
            <button
              onClick={() => navigate("/admin/crm/messages")}
              className="flex items-center justify-center p-4 bg-white/10 hover:bg-white/20 rounded-lg transition-colors duration-200"
            >
              <svg
                className="w-5 h-5 text-white mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14"
                />
              </svg>
              <span className="text-white">New Message</span>
            </button>
            <button
              onClick={() => navigate("/admin/crm/profile")}
              className="flex items-center justify-center p-4 bg-white/10 hover:bg-white/20 rounded-lg transition-colors duration-200"
            >
              <svg
                className="w-5 h-5 text-white mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              <span className="text-white">My Profile</span>
            </button>
            {user?.role === "admin" && (
              <>
                <button
                  onClick={() => navigate("/admin/crm/users")}
                  className="flex items-center justify-center p-4 bg-white/10 hover:bg-white/20 rounded-lg transition-colors duration-200"
                >
                  <svg
                    className="w-5 h-5 text-white mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                    />
                  </svg>
                  <span className="text-white">Users</span>
                </button>
                <button
                  onClick={() => navigate("/admin/crm/departments")}
                  className="flex items-center justify-center p-4 bg-white/10 hover:bg-white/20 rounded-lg transition-colors duration-200"
                >
                  <svg
                    className="w-5 h-5 text-white mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                  <span className="text-white">Departments</span>
                </button>
              </>
            )}
            {user?.role === "manager" && (
              <button
                onClick={() => navigate("/admin/crm/my-departments")}
                className="flex items-center justify-center p-4 bg-white/10 hover:bg-white/20 rounded-lg transition-colors duration-200"
              >
                <svg
                  className="w-5 h-5 text-white mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
                <span className="text-white">My Department</span>
              </button>
            )}
          </div>
        </div>

        {/* Welcome Section */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 p-8 mb-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl mb-6 shadow-lg">
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
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">
              Welcome to CRM Admin
            </h2>
            <p className="text-slate-300 text-lg">
              Manage your customer relationships efficiently
            </p>
          </div>
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Customers Card */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-xl border border-white/20 p-6 hover:bg-white/15 transition-all duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <svg
                  className="w-6 h-6 text-blue-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                  />
                </svg>
              </div>
              <span className="text-2xl font-bold text-white">1,234</span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Total Customers
            </h3>
            <p className="text-slate-400 text-sm">+12% from last month</p>
          </div>

          {/* Orders Card */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-xl border border-white/20 p-6 hover:bg-white/15 transition-all duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-500/20 rounded-lg">
                <svg
                  className="w-6 h-6 text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <span className="text-2xl font-bold text-white">567</span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Orders</h3>
            <p className="text-slate-400 text-sm">+8% from last month</p>
          </div>

          {/* Revenue Card */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-xl border border-white/20 p-6 hover:bg-white/15 transition-all duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <svg
                  className="w-6 h-6 text-sky-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                  />
                </svg>
              </div>
              <span className="text-2xl font-bold text-white">$45.2K</span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Revenue</h3>
            <p className="text-slate-400 text-sm">+15% from last month</p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default DashboardPage;
