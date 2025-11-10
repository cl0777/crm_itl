import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "@/lib/api";

function ProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState("");

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
          setFormData({
            username: userData.username || "",
            email: userData.email || "",
            password: "",
            confirmPassword: "",
          });
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        // If token is invalid, redirect to login
        navigate("/admin/crm/login");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
    // Clear success message when editing
    if (successMessage) {
      setSuccessMessage("");
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
    } else if (formData.username.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    // Password validation (only if password is being changed)
    if (formData.password) {
      if (formData.password.length < 6) {
        newErrors.password = "Password must be at least 6 characters";
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    setSuccessMessage("");

    try {
      const updateData = {
        username: formData.username,
        email: formData.email,
      };

      // Only include password if it's being changed
      if (formData.password) {
        updateData.password = formData.password;
      }

      const response = await apiClient.patch("/users/me", updateData);

      const updatedUser = response.data?.user || response.data || {
        ...user,
        username: formData.username,
        email: formData.email,
      };

      setUser(updatedUser);

      // Clear password fields
      setFormData((prev) => ({
        ...prev,
        password: "",
        confirmPassword: "",
      }));

      setSuccessMessage("Profile updated successfully!");
    } catch (error) {
      console.error("Update error:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Failed to update profile. Please try again.";
      alert(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    navigate("/admin/crm/login");
  };

  if (isLoading) {
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
              <button
                onClick={() => navigate("/admin/crm/dashboard")}
                className="mr-4 p-2 text-slate-300 hover:text-white transition-colors"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
              </button>
              <div className="inline-flex items-center justify-center w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg mr-3">
                <svg
                  className="w-6 h-6 text-white"
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
              </div>
              <h1 className="text-2xl font-bold text-white">My Profile</h1>
            </div>
            <div className="flex items-center space-x-4">
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
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-xl border border-white/20 p-6">
          <h2 className="text-2xl font-bold text-white mb-6">Edit Profile</h2>

          {successMessage && (
            <div className="mb-6 p-4 bg-green-500/20 border border-green-500/50 rounded-lg text-green-300">
              {successMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">
                Username
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className={`w-full px-4 py-2 bg-white/10 border rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all duration-200 ${
                  errors.username ? "border-red-400" : "border-white/20"
                }`}
                placeholder="Enter your username"
              />
              {errors.username && (
                <p className="text-red-400 text-sm">{errors.username}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full px-4 py-2 bg-white/10 border rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all duration-200 ${
                  errors.email ? "border-red-400" : "border-white/20"
                }`}
                placeholder="Enter your email"
              />
              {errors.email && (
                <p className="text-red-400 text-sm">{errors.email}</p>
              )}
            </div>

            {/* Password Section */}
            <div className="pt-4 border-t border-white/20">
              <h3 className="text-lg font-semibold text-white mb-4">
                Change Password
              </h3>
              <p className="text-sm text-slate-400 mb-4">
                Leave blank if you don't want to change your password
              </p>

              {/* Password */}
              <div className="space-y-2 mb-4">
                <label className="block text-sm font-medium text-slate-300">
                  New Password
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 bg-white/10 border rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all duration-200 ${
                    errors.password ? "border-red-400" : "border-white/20"
                  }`}
                  placeholder="Enter new password"
                />
                {errors.password && (
                  <p className="text-red-400 text-sm">{errors.password}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 bg-white/10 border rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all duration-200 ${
                    errors.confirmPassword ? "border-red-400" : "border-white/20"
                  }`}
                  placeholder="Confirm new password"
                />
                {errors.confirmPassword && (
                  <p className="text-red-400 text-sm">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => navigate("/admin/crm/dashboard")}
                className="px-6 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 border border-white/20 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-lg hover:from-blue-700 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

export default ProfilePage;

