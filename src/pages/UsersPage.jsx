import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "@/lib/api";

function UsersPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [sortBy, setSortBy] = useState("username");
  const [sortOrder, setSortOrder] = useState("asc");
  const [currentUser, setCurrentUser] = useState(null);

  // Department search state
  const [departmentSearchTerm, setDepartmentSearchTerm] = useState("");
  const [isDepartmentDropdownOpen, setIsDepartmentDropdownOpen] =
    useState(false);

  // Create user modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreateEntering, setIsCreateEntering] = useState(false);
  const [isCreateClosing, setIsCreateClosing] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    username: "",
    name: "",
    email: "",
    password: "",
    role: "user",
    departmentId: null,
    managerId: null,
  });

  // Edit role modal state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState("user");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(null);
  const [selectedManagerId, setSelectedManagerId] = useState(null);

  // Delete modal state
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleteEntering, setIsDeleteEntering] = useState(false);
  const [isDeleteClosing, setIsDeleteClosing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    // Fetch current user to verify admin role
    const fetchCurrentUser = async () => {
      try {
        const response = await apiClient.get("/auth/me");
        const userData = response.data?.user || response.data;
        if (userData) {
          setCurrentUser(userData);
          if (userData.role !== "admin") {
            navigate("/admin/crm/dashboard");
          }
        }
      } catch (error) {
        console.error("Error fetching current user:", error);
        navigate("/admin/crm/dashboard");
      }
    };

    fetchCurrentUser();

    // Fetch users list
    const fetchUsers = async () => {
      try {
        const response = await apiClient.get("/users");
        const usersData = response.data?.users || response.data || [];
        setUsers(usersData);
        setFilteredUsers(usersData);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching users:", error);
        setIsLoading(false);
      }
    };

    // Fetch departments list
    const fetchDepartments = async () => {
      try {
        const response = await apiClient.get("/departments");
        const departmentsData =
          response.data?.departments || response.data || [];
        setDepartments(departmentsData);
      } catch (error) {
        console.error("Error fetching departments:", error);
      }
    };

    fetchUsers();
    fetchDepartments();
  }, [navigate]);

  // Filter and sort users
  useEffect(() => {
    let filtered = users.filter((user) => {
      const matchesSearch =
        (user.username || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (user.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.login || "").toLowerCase().includes(searchTerm.toLowerCase());

      const matchesRole = roleFilter === "All" || user.role === roleFilter;

      return matchesSearch && matchesRole;
    });

    // Sort users
    filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      if (typeof aValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortOrder === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    setFilteredUsers(filtered);
  }, [users, searchTerm, roleFilter, sortBy, sortOrder]);

  // Auto-select manager when department changes for user role
  useEffect(() => {
    if (selectedRole === "user" && selectedDepartmentId && isEditOpen) {
      // Find managers in the selected department
      const managersInDept = users.filter(
        (u) => u.role === "manager" && u.departmentId === selectedDepartmentId
      );

      // If there's exactly one manager, auto-select them
      if (
        managersInDept.length === 1 &&
        selectedManagerId !== managersInDept[0].id
      ) {
        setSelectedManagerId(managersInDept[0].id);
      } else if (managersInDept.length === 0 && selectedManagerId !== null) {
        setSelectedManagerId(null);
      }
    }
  }, [
    selectedDepartmentId,
    selectedRole,
    selectedManagerId,
    isEditOpen,
    users,
  ]);

  // Auto-select manager when department changes for user role (Create modal)
  useEffect(() => {
    if (
      createFormData.role === "user" &&
      createFormData.departmentId &&
      isCreateOpen
    ) {
      // Find managers in the selected department
      const managersInDept = users.filter(
        (u) =>
          u.role === "manager" && u.departmentId === createFormData.departmentId
      );

      // If there's exactly one manager, auto-select them
      if (
        managersInDept.length === 1 &&
        createFormData.managerId !== managersInDept[0].id
      ) {
        setCreateFormData((prev) => ({
          ...prev,
          managerId: managersInDept[0].id,
        }));
      } else if (
        managersInDept.length === 0 &&
        createFormData.managerId !== null
      ) {
        setCreateFormData((prev) => ({
          ...prev,
          managerId: null,
        }));
      }
    }
  }, [
    createFormData.departmentId,
    createFormData.role,
    createFormData.managerId,
    isCreateOpen,
    users,
  ]);

  const openEditModal = (user) => {
    setEditingUser(user);
    setSelectedRole(user.role || "user");
    setSelectedDepartmentId(user.departmentId || null);
    setSelectedManagerId(user.managerId || null);
    setIsEditOpen(true);
  };

  const closeEditModal = () => {
    setIsEditOpen(false);
    setEditingUser(null);
    setSelectedRole("user");
    setSelectedDepartmentId(null);
    setSelectedManagerId(null);
  };

  const openCreateModal = () => {
    setIsCreateOpen(true);
    setIsCreateEntering(true);
    setTimeout(() => setIsCreateEntering(false), 10);
  };

  const closeCreateModal = () => {
    setIsCreateClosing(true);
    setTimeout(() => {
      setIsCreateOpen(false);
      setIsCreateClosing(false);
      setCreateFormData({
        username: "",
        name: "",
        email: "",
        password: "",
        role: "user",
        departmentId: null,
        managerId: null,
      });
    }, 200);
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();

    try {
      // Prepare payload with conditional department
      const payload = { ...createFormData };

      // Only include departmentId if role is user or manager
      if (payload.role !== "user" && payload.role !== "manager") {
        delete payload.departmentId;
      }

      // Only include managerId if role is user
      if (payload.role !== "user") {
        delete payload.managerId;
      }

      const response = await apiClient.post("/users", payload);

      const newUser = response.data?.user || response.data;

      // Fetch updated users list
      const fetchUsers = async () => {
        try {
          const response = await apiClient.get("/users");
          const usersData = response.data?.users || response.data || [];
          setUsers(usersData);
          setFilteredUsers(usersData);
        } catch (error) {
          console.error("Error fetching users:", error);
        }
      };

      await fetchUsers();
      closeCreateModal();
      alert("User created successfully!");
    } catch (error) {
      console.error("Error creating user:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Failed to create user. Please try again.";
      alert(errorMessage);
    }
  };

  const handleRoleUpdate = async () => {
    if (!editingUser) return;

    try {
      const payload = {
        role: selectedRole,
      };

      // Only include departmentId if role is user or manager
      if (selectedRole === "user" || selectedRole === "manager") {
        payload.departmentId = selectedDepartmentId;
      }

      // Only include managerId if role is user
      if (selectedRole === "user") {
        payload.managerId = selectedManagerId;
      }

      const response = await apiClient.patch(
        `/users/${editingUser.id}`,
        payload
      );

      const updatedUser = response.data?.user || {
        ...editingUser,
        role: selectedRole,
        departmentId:
          selectedRole === "user" || selectedRole === "manager"
            ? selectedDepartmentId
            : null,
        managerId: selectedRole === "user" ? selectedManagerId : null,
      };

      const updatedUsers = users.map((u) =>
        u.id === editingUser.id ? updatedUser : u
      );

      setUsers(updatedUsers);
      closeEditModal();
    } catch (error) {
      console.error("Error updating user:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Failed to update user. Please try again.";
      alert(errorMessage);
    }
  };

  const openDeleteModal = (user) => {
    setDeleteTarget(user);
    setIsDeleteOpen(true);
    setIsDeleteEntering(true);
    setTimeout(() => setIsDeleteEntering(false), 10);
  };

  const closeDeleteModal = () => {
    setIsDeleteClosing(true);
    setTimeout(() => {
      setIsDeleteOpen(false);
      setIsDeleteClosing(false);
      setDeleteTarget(null);
    }, 200);
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;

    try {
      await apiClient.delete(`/users/${deleteTarget.id}`);

      // Fetch updated users list
      const fetchUsers = async () => {
        try {
          const response = await apiClient.get("/users");
          const usersData = response.data?.users || response.data || [];
          setUsers(usersData);
          setFilteredUsers(usersData);
        } catch (error) {
          console.error("Error fetching users:", error);
        }
      };

      await fetchUsers();
      closeDeleteModal();
      alert("User deleted successfully!");
    } catch (error) {
      console.error("Error deleting user:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Failed to delete user. Please try again.";
      alert(errorMessage);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    navigate("/admin/crm/login");
  };

  if (isLoading || !currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
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
              <div className="inline-flex items-center justify-center w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg mr-3">
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
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-white">Users</h1>
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">
            User Management
          </h2>
          <p className="text-slate-300">Manage user accounts and roles</p>
        </div>

        {/* Action Buttons */}
        <div className="mb-6">
          <button
            onClick={openCreateModal}
            className="flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            Add New User
          </button>
        </div>

        {/* Filters and Search */}
        <div className="mb-6 bg-white/10 backdrop-blur-lg rounded-xl shadow-xl border border-white/20 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">
                Search
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <svg
                  className="absolute right-3 top-2.5 w-5 h-5 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>

            {/* Role Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Role</label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="All" className="bg-slate-800">
                  All Roles
                </option>
                <option value="admin" className="bg-slate-800">
                  Admin
                </option>
                <option value="manager" className="bg-slate-800">
                  Manager
                </option>
                <option value="user" className="bg-slate-800">
                  User
                </option>
              </select>
            </div>

            {/* Sort */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">
                Sort By
              </label>
              <div className="flex space-x-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="username" className="bg-slate-800">
                    Username
                  </option>
                  <option value="email" className="bg-slate-800">
                    Email
                  </option>
                  <option value="role" className="bg-slate-800">
                    Role
                  </option>
                </select>
                <button
                  onClick={() =>
                    setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                  }
                  className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 transition-colors"
                  title={`Sort ${
                    sortOrder === "asc" ? "Descending" : "Ascending"
                  }`}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    {sortOrder === "asc" ? (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 15l7-7 7 7"
                      />
                    ) : (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    )}
                  </svg>
                </button>
              </div>
            </div>

            {/* Results Count */}
            <div className="space-y-2 flex items-end">
              <div className="w-full">
                <label className="text-sm font-medium text-slate-300">
                  Results
                </label>
                <p className="text-sm text-slate-300 mt-2">
                  {filteredUsers.length} of {users.length} users
                </p>
              </div>
            </div>
          </div>

          {/* Clear Filters */}
          {(searchTerm || roleFilter !== "All") && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => {
                  setSearchTerm("");
                  setRoleFilter("All");
                  setSortBy("username");
                  setSortOrder("asc");
                }}
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>

        {/* Users Table */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-xl border border-white/20 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Username
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="hover:bg-white/5 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm text-white font-medium">
                        {user.username}
                      </td>
                      <td className="px-4 py-3 text-sm text-blue-300">
                        <a
                          href={`mailto:${user.email}`}
                          className="hover:text-blue-200 transition-colors"
                        >
                          {user.email}
                        </a>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.role === "admin"
                              ? "bg-purple-500/20 text-purple-300"
                              : user.role === "manager"
                              ? "bg-green-500/20 text-green-300"
                              : "bg-blue-500/20 text-blue-300"
                          }`}
                        >
                          {user.role || "user"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300">
                        {departments.find((d) => d.id === user.departmentId)
                          ?.name || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => openEditModal(user)}
                            className="text-blue-400 hover:text-blue-300 transition-colors"
                            title="Change Role"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() => openDeleteModal(user)}
                            className="text-red-400 hover:text-red-300 transition-colors"
                            title="Delete User"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-6 text-center text-slate-400"
                      >
                        No users found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Create User Modal */}
        {isCreateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/60"
              onClick={closeCreateModal}
            ></div>
            <div
              className={`relative z-10 w-full max-w-md bg-slate-900/90 border border-white/20 rounded-2xl p-6 backdrop-blur-xl transition-all duration-200 ease-out transform ${
                isCreateEntering ? "opacity-0 scale-90" : ""
              } ${
                isCreateClosing ? "opacity-0 scale-90" : "opacity-100 scale-100"
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-white">
                  Create New User
                </h3>
                <button
                  onClick={closeCreateModal}
                  className="text-slate-300 hover:text-white"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleCreateUser}>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-300">
                      Name
                    </label>
                    <input
                      type="text"
                      value={createFormData.name}
                      onChange={(e) =>
                        setCreateFormData({
                          ...createFormData,
                          name: e.target.value,
                        })
                      }
                      required
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-300">
                      Username
                    </label>
                    <input
                      type="text"
                      value={createFormData.username}
                      onChange={(e) =>
                        setCreateFormData({
                          ...createFormData,
                          username: e.target.value,
                        })
                      }
                      required
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter username"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-300">
                      Email
                    </label>
                    <input
                      type="email"
                      value={createFormData.email}
                      onChange={(e) =>
                        setCreateFormData({
                          ...createFormData,
                          email: e.target.value,
                        })
                      }
                      required
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter email"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-300">
                      Password
                    </label>
                    <input
                      type="password"
                      value={createFormData.password}
                      onChange={(e) =>
                        setCreateFormData({
                          ...createFormData,
                          password: e.target.value,
                        })
                      }
                      required
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter password"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-300">
                      Role
                    </label>
                    <select
                      value={createFormData.role}
                      onChange={(e) => {
                        const newRole = e.target.value;
                        setCreateFormData({
                          ...createFormData,
                          role: newRole,
                          // Clear departmentId if switching to admin
                          departmentId:
                            newRole === "admin"
                              ? null
                              : createFormData.departmentId,
                        });
                      }}
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="user" className="bg-slate-800">
                        User
                      </option>
                      <option value="manager" className="bg-slate-800">
                        Manager
                      </option>
                      <option value="admin" className="bg-slate-800">
                        Admin
                      </option>
                    </select>
                  </div>
                  {(createFormData.role === "user" ||
                    createFormData.role === "manager") && (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-300">
                        Department
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={
                            isDepartmentDropdownOpen
                              ? departmentSearchTerm
                              : departments.find(
                                  (d) => d.id === createFormData.departmentId
                                )?.name || ""
                          }
                          onChange={(e) => {
                            setDepartmentSearchTerm(e.target.value);
                            setIsDepartmentDropdownOpen(true);
                          }}
                          onFocus={() => {
                            setDepartmentSearchTerm(
                              departments.find(
                                (d) => d.id === createFormData.departmentId
                              )?.name || ""
                            );
                            setIsDepartmentDropdownOpen(true);
                          }}
                          required
                          className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Search departments"
                        />
                        {isDepartmentDropdownOpen && (
                          <>
                            <div
                              className="fixed inset-0 z-40"
                              onClick={() => setIsDepartmentDropdownOpen(false)}
                            ></div>
                            <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-white/20 rounded-lg shadow-xl max-h-48 overflow-auto">
                              {departments
                                .filter((dept) =>
                                  dept.name
                                    .toLowerCase()
                                    .includes(
                                      departmentSearchTerm.toLowerCase()
                                    )
                                )
                                .map((dept) => (
                                  <button
                                    key={dept.id}
                                    type="button"
                                    onClick={() => {
                                      setCreateFormData({
                                        ...createFormData,
                                        departmentId: dept.id,
                                      });
                                      setIsDepartmentDropdownOpen(false);
                                    }}
                                    className="w-full text-left px-4 py-2 text-white hover:bg-white/10 transition-colors"
                                  >
                                    {dept.name}
                                  </button>
                                ))}
                              {departments.filter((dept) =>
                                dept.name
                                  .toLowerCase()
                                  .includes(departmentSearchTerm.toLowerCase())
                              ).length === 0 && (
                                <div className="px-4 py-2 text-slate-400 text-sm">
                                  No departments found.
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={closeCreateModal}
                    className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 border border-white/20"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700"
                  >
                    Create User
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete User Modal */}
        {isDeleteOpen && deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/60"
              onClick={closeDeleteModal}
            ></div>
            <div
              className={`relative z-10 w-full max-w-md bg-slate-900/90 border border-white/20 rounded-2xl p-6 backdrop-blur-xl transition-all duration-200 ease-out transform ${
                isDeleteEntering ? "opacity-0 scale-90" : ""
              } ${
                isDeleteClosing ? "opacity-0 scale-90" : "opacity-100 scale-100"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-lg font-semibold text-white">
                  Delete User
                </h4>
                <button
                  onClick={closeDeleteModal}
                  className="text-slate-300 hover:text-white"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <p className="text-slate-300 text-sm">
                Are you sure you want to delete{" "}
                {deleteTarget ? (
                  <span className="font-semibold text-white">
                    {deleteTarget.username}
                  </span>
                ) : (
                  "this user"
                )}
                ? This action cannot be undone.
              </p>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={closeDeleteModal}
                  className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 border border-white/20"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteUser}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Role Modal */}
        {isEditOpen && editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/60"
              onClick={closeEditModal}
            ></div>
            <div className="relative z-10 w-full max-w-md bg-slate-900/90 border border-white/20 rounded-2xl p-6 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-white">Edit User</h3>
                <button
                  onClick={closeEditModal}
                  className="text-slate-300 hover:text-white"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-300 mb-2">User:</p>
                  <p className="text-white font-medium">
                    {editingUser.username}
                  </p>
                  <p className="text-slate-400 text-sm">{editingUser.email}</p>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-300">
                    Role
                  </label>
                  <select
                    value={selectedRole}
                    onChange={(e) => {
                      const newRole = e.target.value;
                      setSelectedRole(newRole);
                      // Clear departmentId if switching to admin
                      if (newRole === "admin") {
                        setSelectedDepartmentId(null);
                      }
                    }}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="user" className="bg-slate-800">
                      User
                    </option>
                    <option value="manager" className="bg-slate-800">
                      Manager
                    </option>
                    <option value="admin" className="bg-slate-800">
                      Admin
                    </option>
                  </select>
                </div>
                {(selectedRole === "user" || selectedRole === "manager") && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-300">
                      Department
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={
                          isDepartmentDropdownOpen
                            ? departmentSearchTerm
                            : departments.find(
                                (d) => d.id === selectedDepartmentId
                              )?.name || ""
                        }
                        onChange={(e) => {
                          setDepartmentSearchTerm(e.target.value);
                          setIsDepartmentDropdownOpen(true);
                        }}
                        onFocus={() => {
                          setDepartmentSearchTerm(
                            departments.find(
                              (d) => d.id === selectedDepartmentId
                            )?.name || ""
                          );
                          setIsDepartmentDropdownOpen(true);
                        }}
                        required
                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Search departments"
                      />
                      {isDepartmentDropdownOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setIsDepartmentDropdownOpen(false)}
                          ></div>
                          <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-white/20 rounded-lg shadow-xl max-h-48 overflow-auto">
                            {departments
                              .filter((dept) =>
                                dept.name
                                  .toLowerCase()
                                  .includes(departmentSearchTerm.toLowerCase())
                              )
                              .map((dept) => (
                                <button
                                  key={dept.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedDepartmentId(dept.id);
                                    setIsDepartmentDropdownOpen(false);
                                  }}
                                  className="w-full text-left px-4 py-2 text-white hover:bg-white/10 transition-colors"
                                >
                                  {dept.name}
                                </button>
                              ))}
                            {departments.filter((dept) =>
                              dept.name
                                .toLowerCase()
                                .includes(departmentSearchTerm.toLowerCase())
                            ).length === 0 && (
                              <div className="px-4 py-2 text-slate-400 text-sm">
                                No departments found.
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={closeEditModal}
                  className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 border border-white/20"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRoleUpdate}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default UsersPage;
