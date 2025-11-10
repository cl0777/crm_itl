import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "@/lib/api";

function DepartmentsPage() {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  // Create department modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    name: "",
    description: "",
  });

  // Delete modal state
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
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
        navigate("/admin/crm/login");
      }
    };

    fetchCurrentUser();
  }, [navigate]);

  useEffect(() => {
    if (!currentUser || currentUser.role !== "admin") return;

    // Fetch departments
    const fetchDepartments = async () => {
      try {
        setIsLoading(true);
        const response = await apiClient.get("/departments");
        const departmentsData =
          response.data?.departments || response.data || [];
        setDepartments(departmentsData);
      } catch (error) {
        console.error("Error fetching departments:", error);
        alert("Failed to fetch departments. Please try again.");
        setDepartments([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDepartments();
  }, [currentUser]);

  const openCreateModal = () => {
    setIsCreateOpen(true);
  };

  const closeCreateModal = () => {
    setIsCreateOpen(false);
    setCreateFormData({
      name: "",
      description: "",
    });
  };

  const handleCreateDepartment = async (e) => {
    e.preventDefault();

    try {
      const response = await apiClient.post("/departments", createFormData);

      const newDepartment = response.data?.department || response.data;

      // Fetch updated departments list
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

      await fetchDepartments();
      closeCreateModal();
      alert("Department created successfully!");
    } catch (error) {
      console.error("Error creating department:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Failed to create department. Please try again.";
      alert(errorMessage);
    }
  };

  const openDeleteModal = (department) => {
    setDeleteTarget(department);
    setIsDeleteOpen(true);
  };

  const closeDeleteModal = () => {
    setIsDeleteOpen(false);
    setDeleteTarget(null);
  };

  const handleDeleteDepartment = async () => {
    if (!deleteTarget) return;

    try {
      await apiClient.delete(`/departments/${deleteTarget.id}`);

      // Fetch updated departments list
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

      await fetchDepartments();
      closeDeleteModal();
      alert("Department deleted successfully!");
    } catch (error) {
      console.error("Error deleting department:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Failed to delete department. Please try again.";
      alert(errorMessage);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="bg-slate-900/90 backdrop-blur-xl border-b border-white/10 sticky top-0 z-40 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-6">
              <h1 className="text-2xl font-bold text-white">Departments</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate("/admin/crm/dashboard")}
                className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 border border-white/20"
              >
                Dashboard
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem("token");
                  navigate("/admin/crm/login");
                }}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200"
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
            Department Management
          </h2>
          <p className="text-slate-300">Manage departments</p>
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
            Add New Department
          </button>
        </div>

        {/* Departments List */}
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
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {departments.map((department) => (
                    <tr
                      key={department.id}
                      className="hover:bg-white/5 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm text-white font-medium">
                        {department.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300">
                        {department.description || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => openDeleteModal(department)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                          title="Delete Department"
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
                      </td>
                    </tr>
                  ))}
                  {departments.length === 0 && (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-4 py-6 text-center text-slate-400"
                      >
                        No departments found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Create Department Modal */}
        {isCreateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/60"
              onClick={closeCreateModal}
            ></div>
            <div className="relative z-10 w-full max-w-md bg-slate-900/90 border border-white/20 rounded-2xl p-6 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-white">
                  Create New Department
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
              <form onSubmit={handleCreateDepartment}>
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
                      placeholder="Enter department name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-300">
                      Description
                    </label>
                    <textarea
                      value={createFormData.description}
                      onChange={(e) =>
                        setCreateFormData({
                          ...createFormData,
                          description: e.target.value,
                        })
                      }
                      rows={3}
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter description (optional)"
                    />
                  </div>
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
                    Create Department
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Department Modal */}
        {isDeleteOpen && deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/60"
              onClick={closeDeleteModal}
            ></div>
            <div className="relative z-10 w-full max-w-md bg-slate-900/90 border border-white/20 rounded-2xl p-6 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-lg font-semibold text-white">
                  Delete Department
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
                    {deleteTarget.name}
                  </span>
                ) : (
                  "this department"
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
                  onClick={handleDeleteDepartment}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default DepartmentsPage;
