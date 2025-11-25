import { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import { useNavigate } from "react-router-dom";
import apiClient from "@/lib/api";

function CustomersPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [countryFilter, setCountryFilter] = useState("All");
  const [sortBy, setSortBy] = useState("id");
  const [sortOrder, setSortOrder] = useState("asc");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isAddEntering, setIsAddEntering] = useState(false);
  const [isAddClosing, setIsAddClosing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isImportEntering, setIsImportEntering] = useState(false);
  const [isImportClosing, setIsImportClosing] = useState(false);
  const [importFileName, setImportFileName] = useState("");
  const [sheetNames, setSheetNames] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState("");
  const [excelHeaders, setExcelHeaders] = useState([]);
  const [excelRows, setExcelRows] = useState([]);
  const [importData, setImportData] = useState(null);
  const [isSubmittingImport, setIsSubmittingImport] = useState(false);

  // Edit modal state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isEditEntering, setIsEditEntering] = useState(false);
  const [isEditClosing, setIsEditClosing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({
    partyName: "",
    shortname: "",
    address1: "",
    address2: "",
    city: "",
    country: "",
    email: "",
    phone1: "",
    phone2: "",
    status: "Active",
    addedBy: "",
  });

  // Delete modal state
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleteEntering, setIsDeleteEntering] = useState(false);
  const [isDeleteClosing, setIsDeleteClosing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [formData, setFormData] = useState({
    partyName: "",
    shortname: "",
    address1: "",
    address2: "",
    city: "",
    country: "",
    email: "",
    phone1: "",
    phone2: "",
    status: "Active",
  });

  useEffect(() => {
    // Fetch current user data from API
    const fetchCurrentUser = async () => {
      try {
        const response = await apiClient.get("/auth/me");
        const userData = response.data?.user || response.data;
        if (userData) {
          setCurrentUser(userData);
        }
      } catch (error) {
        console.error("Error fetching current user:", error);
      }
    };

    // Fetch customers from API
    const fetchCustomers = async () => {
      try {
        setIsLoading(true);
        const response = await apiClient.get("/customers");
        const customerData = response.data?.customers || response.data || [];
        setCustomers(customerData);
        setFilteredCustomers(customerData);
      } catch (error) {
        console.error("Error fetching customers:", error);
        alert("Failed to fetch customers. Please try again.");
        // Set empty arrays on error
        setCustomers([]);
        setFilteredCustomers([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCurrentUser();
    fetchCustomers();
  }, []);

  // Get unique countries from customers for filter dropdown
  const uniqueCountries = Array.from(
    new Set(
      customers
        .map((c) => c.country || c.countryName)
        .filter((country) => country && country.trim() !== "")
    )
  ).sort();

  // Filter and sort customers
  useEffect(() => {
    let filtered = customers.filter((customer) => {
      const citySearch = (
        customer.city ||
        customer.cityName ||
        ""
      ).toLowerCase();
      const countrySearch = (
        customer.country ||
        customer.countryName ||
        ""
      ).toLowerCase();

      const matchesSearch =
        customer.partyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.shortname.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        citySearch.includes(searchTerm.toLowerCase()) ||
        countrySearch.includes(searchTerm.toLowerCase()) ||
        customer.phone1.includes(searchTerm) ||
        customer.phone2?.includes(searchTerm) ||
        (customer.addedBy || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "All" || customer.status === statusFilter;
      const matchesCountry =
        countryFilter === "All" ||
        countrySearch === countryFilter.toLowerCase();

      return matchesSearch && matchesStatus && matchesCountry;
    });

    // Sort customers
    filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      // Handle backward compatibility for city/country fields
      if (sortBy === "city") {
        aValue = a.city || a.cityName || "";
        bValue = b.city || b.cityName || "";
      } else if (sortBy === "country") {
        aValue = a.country || a.countryName || "";
        bValue = b.country || b.countryName || "";
      }

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

    setFilteredCustomers(filtered);
  }, [customers, searchTerm, statusFilter, countryFilter, sortBy, sortOrder]);

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    navigate("/admin/crm/login");
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setIsImporting(true);
    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const names = workbook.SheetNames || [];
        setSheetNames(names);
        const firstSheet = names[0];
        setSelectedSheet(firstSheet || "");
        if (firstSheet) {
          const ws = workbook.Sheets[firstSheet];
          const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
          const headers = rows[0] || [];
          setExcelHeaders(headers);
          setExcelRows(rows.slice(1));

          // Store the file data for API upload
          setImportData(data);
        } else {
          setExcelHeaders([]);
          setExcelRows([]);
          setImportData(null);
        }
        setIsImporting(false);
        // Open preview modal with animation
        setIsImportOpen(true);
        setIsImportEntering(true);
        setTimeout(() => setIsImportEntering(false), 10);
      } catch (err) {
        console.error(err);
        setIsImporting(false);
        alert(
          "Failed to read Excel file. Ensure it's a valid .xlsx/.xls file."
        );
      } finally {
        e.target.value = ""; // reset for next import
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const closeImportModal = () => {
    setIsImportClosing(true);
    setTimeout(() => {
      setIsImportOpen(false);
      setIsImportClosing(false);
      setImportData(null);
    }, 200);
  };

  const handleExportExcel = () => {
    if (filteredCustomers.length === 0) {
      alert("No customers to export");
      return;
    }

    // Prepare data for export - using backend-expected headers for import compatibility
    const exportData = filteredCustomers.map((customer) => ({
      "Company Name": customer.partyName,
      "Represented Name": customer.shortname || "",
      "Address 1": customer.address1,
      "Address 2": customer.address2 || "",
      City: customer.city || customer.cityName || "",
      Country: customer.country || customer.countryName || "",
      Email: customer.email | "",
      "Primary Phone": customer.phone1 || "",
      "Secondary Phone": customer.phone2 || "",
      Status: customer.status || "",
      "Added By": customer.addedBy || "System",
    }));

    // Create workbook
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Customers");

    // Auto-size columns
    const maxWidth = 30;
    const cols = [];
    for (let i = 0; i < exportData.length; i++) {
      const row = exportData[i];
      Object.keys(row).forEach((key, colIndex) => {
        if (!cols[colIndex]) {
          cols[colIndex] = { wch: key.length };
        }
        const cellValue = row[key] ? String(row[key]) : "";
        if (cellValue.length > cols[colIndex].wch) {
          cols[colIndex].wch = Math.min(cellValue.length, maxWidth);
        }
      });
    }
    worksheet["!cols"] = cols;

    // Generate filename with current date
    const date = new Date().toISOString().split("T")[0];
    const filename = `customers_${date}.xlsx`;

    // Download file
    XLSX.writeFile(workbook, filename);
  };

  const handleExportCSV = () => {
    if (filteredCustomers.length === 0) {
      alert("No customers to export");
      return;
    }

    // Prepare data for export - using backend-expected headers for import compatibility
    const exportData = filteredCustomers.map((customer) => ({
      "Company Name": customer.partyName,
      "Represented Name": customer.shortname || "",
      "Address 1": customer.address1,
      "Address 2": customer.address2 || "",
      City: customer.city || customer.cityName || "",
      Country: customer.country || customer.countryName || "",
      Email: customer.email,
      "Primary Phone": customer.phone1,
      "Secondary phone": customer.phone2 || "",
      Status: customer.status,
      "Added By": customer.addedBy || "",
    }));

    // Convert to CSV
    const headers = Object.keys(exportData[0] || {});
    const csvRows = [];

    // Add headers
    csvRows.push(headers.join(","));

    // Add data rows
    exportData.forEach((row) => {
      const values = headers.map((header) => {
        const value = row[header] || "";
        // Escape commas and quotes in CSV
        if (
          typeof value === "string" &&
          (value.includes(",") || value.includes('"'))
        ) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csvRows.push(values.join(","));
    });

    // Create CSV content
    const csvContent = csvRows.join("\n");

    // Create blob and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    const date = new Date().toISOString().split("T")[0];
    link.setAttribute("download", `customers_${date}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportSubmit = async () => {
    if (!importData || !excelRows || excelRows.length === 0) {
      alert("No data to import");
      return;
    }

    try {
      setIsSubmittingImport(true);

      // Convert the data to a File/Blob for FormData
      const blob = new Blob([importData], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const file = new File([blob], importFileName, {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      // Create FormData for file upload
      const formData = new FormData();
      formData.append("file", file);

      // Send to API
      // Don't set Content-Type header - let axios set it with boundary for multipart/form-data
      const response = await apiClient.post("/customers/import", formData);

      // Success - fetch updated customers list
      const fetchCustomers = async () => {
        try {
          const response = await apiClient.get("/customers");
          const customerData = response.data?.customers || response.data || [];
          setCustomers(customerData);
          setFilteredCustomers(customerData);
        } catch (error) {
          console.error("Error fetching customers:", error);
        }
      };

      await fetchCustomers();

      // Close modal and reset
      closeImportModal();
      setImportData(null);

      alert(
        `Successfully imported ${
          response.data?.count || excelRows.length
        } customers`
      );
    } catch (error) {
      console.error("Error importing customers:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Failed to import customers. Please check the file format and try again.";
      alert(errorMessage);
    } finally {
      setIsSubmittingImport(false);
    }
  };

  const openAddModal = () => {
    setIsAddOpen(true);
    setIsAddEntering(true);
    setTimeout(() => setIsAddEntering(false), 10);
  };

  const closeAddModal = () => {
    setIsAddClosing(true);
    setTimeout(() => {
      setIsAddOpen(false);
      setIsAddClosing(false);
    }, 200);
  };

  const openEditModal = (customer) => {
    setEditingId(customer.id);
    setEditData({
      partyName: customer.partyName || "",
      shortname: customer.shortname || "",
      address1: customer.address1 || "",
      address2: customer.address2 || "",
      city: customer.city || customer.cityName || "",
      country: customer.country || customer.countryName || "",
      email: customer.email || "",
      phone1: customer.phone1 || "",
      phone2: customer.phone2 || "",
      status: customer.status || "Active",
      addedBy: customer.addedBy || "",
    });
    setIsEditOpen(true);
    setIsEditEntering(true);
    setTimeout(() => setIsEditEntering(false), 10);
  };

  const closeEditModal = () => {
    setIsEditClosing(true);
    setTimeout(() => {
      setIsEditOpen(false);
      setIsEditClosing(false);
      setEditingId(null);
    }, 200);
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    if (editingId == null) return;

    try {
      // Prepare data matching API schema
      const payload = {
        partyName: editData.partyName,
        shortname: editData.shortname,
        address1: editData.address1,
        ...(editData.address2 && { address2: editData.address2 }),
        city: editData.city,
        country: editData.country,
        email: editData.email,
        phone1: editData.phone1,
        ...(editData.phone2 && { phone2: editData.phone2 }),
        status: editData.status,
      };

      await apiClient.patch(`/customers/${editingId}`, payload);

      // Update the customer in the list
      const updatedList = customers.map((c) =>
        c.id === editingId ? { ...c, ...editData, id: editingId } : c
      );
      setCustomers(updatedList);
      setFilteredCustomers(updatedList);
      closeEditModal();
    } catch (error) {
      console.error("Error updating customer:", error);
      alert("Failed to update customer. Please try again.");
    }
  };

  const openDeleteModal = (customer) => {
    setDeleteTarget(customer);
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

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      await apiClient.delete(`/customers/${deleteTarget.id}`);

      // Remove the customer from the list
      const updatedList = customers.filter((c) => c.id !== deleteTarget.id);
      setCustomers(updatedList);
      setFilteredCustomers(updatedList);
      closeDeleteModal();
    } catch (error) {
      console.error("Error deleting customer:", error);
      alert("Failed to delete customer. Please try again.");
    }
  };

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
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-white">Customers</h1>
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
        {/* Edit Customer Modal */}
        {isEditOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/60"
              onClick={closeEditModal}
            ></div>
            <div
              className={`relative z-10 w-full max-w-3xl bg-slate-900/90 border border-white/20 rounded-2xl p-6 backdrop-blur-xl max-h-[80vh] overflow-y-auto transition-all duration-200 ease-out transform ${
                isEditEntering ? "opacity-0 scale-90" : ""
              } ${
                isEditClosing ? "opacity-0 scale-90" : "opacity-100 scale-100"
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-white">
                  Edit Customer
                </h3>
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
              <form onSubmit={submitEdit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm text-slate-300">
                      Company name
                    </label>
                    <input
                      name="partyName"
                      value={editData.partyName}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          partyName: e.target.value,
                        })
                      }
                      required
                      placeholder="e.g. Tech Solutions Inc"
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-slate-300">
                      Represented name
                    </label>
                    <input
                      name="shortname"
                      value={editData.shortname}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          shortname: e.target.value,
                        })
                      }
                      placeholder="e.g. TSI"
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm text-slate-300">Address 1</label>
                    <input
                      name="address1"
                      value={editData.address1}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          address1: e.target.value,
                        })
                      }
                      required
                      placeholder="Street, number, area"
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-slate-300">Address 2</label>
                    <input
                      name="address2"
                      value={editData.address2}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          address2: e.target.value,
                        })
                      }
                      placeholder="Suite, building, unit (optional)"
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-slate-300">City</label>
                    <input
                      name="city"
                      value={editData.city}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          city: e.target.value,
                        })
                      }
                      required
                      placeholder="e.g. New York"
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-slate-300">Country</label>
                    <input
                      name="country"
                      value={editData.country}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          country: e.target.value,
                        })
                      }
                      required
                      placeholder="e.g. United States"
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-slate-300">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={editData.email}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          email: e.target.value,
                        })
                      }
                      required
                      placeholder="e.g. hello@company.com"
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-slate-300">
                      Primary phone
                    </label>
                    <input
                      name="phone1"
                      value={editData.phone1}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          phone1: e.target.value,
                        })
                      }
                      required
                      placeholder="Primary phone"
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-slate-300">
                      Secondary phone
                    </label>
                    <input
                      name="phone2"
                      value={editData.phone2}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          phone2: e.target.value,
                        })
                      }
                      placeholder="Secondary phone (optional)"
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-slate-300">Status</label>
                    <select
                      name="status"
                      value={editData.status}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          status: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                    >
                      <option className="bg-slate-800" value="Active">
                        Active
                      </option>
                      <option className="bg-slate-800" value="Inactive">
                        Inactive
                      </option>
                      <option className="bg-slate-800" value="Pending">
                        Pending
                      </option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-slate-300">Added By</label>
                    <input
                      name="addedBy"
                      value={editData.addedBy}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          addedBy: e.target.value,
                        })
                      }
                      placeholder="e.g. Admin"
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                    />
                  </div>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={closeEditModal}
                    className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 border border-white/20"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-lg hover:from-blue-700 hover:to-cyan-600"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {isDeleteOpen && (
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
                  Remove Customer
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
                Are you sure you want to remove{" "}
                {deleteTarget ? (
                  <span className="font-semibold text-white">
                    {deleteTarget.partyName}
                  </span>
                ) : (
                  "this customer"
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
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">
            Customer Management
          </h2>
          <p className="text-slate-300">
            Manage your customer database and relationships
          </p>
        </div>

        {/* Add Customer Modal */}
        {isAddOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/60"
              onClick={closeAddModal}
            ></div>
            <div
              className={`relative z-10 w-full max-w-3xl bg-slate-900/90 border border-white/20 rounded-2xl p-6 backdrop-blur-xl max-h-[80vh] overflow-y-auto transition-all duration-200 ease-out transform ${
                isAddEntering ? "opacity-0 scale-90" : ""
              } ${
                isAddClosing ? "opacity-0 scale-90" : "opacity-100 scale-100"
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-white">
                  Add New Customer
                </h3>
                <button
                  onClick={closeAddModal}
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
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    // Prepare data matching API schema
                    const payload = {
                      partyName: formData.partyName,
                      shortname: formData.shortname,
                      address1: formData.address1,
                      ...(formData.address2 && { address2: formData.address2 }),
                      city: formData.city,
                      country: formData.country,
                      email: formData.email,
                      phone1: formData.phone1,
                      ...(formData.phone2 && { phone2: formData.phone2 }),
                      status: formData.status,
                    };

                    const response = await apiClient.post(
                      "/customers",
                      payload
                    );

                    // Add the newly created customer to the list
                    const newCustomer = {
                      id: response.data.id || customers.length + 1,
                      ...response.data,
                      addedBy: currentUser?.username || "System",
                    };
                    const updated = [...customers, newCustomer];
                    setCustomers(updated);
                    setFilteredCustomers(updated);
                    setFormData({
                      partyName: "",
                      shortname: "",
                      address1: "",
                      address2: "",
                      city: "",
                      country: "",
                      email: "",
                      phone1: "",
                      phone2: "",
                      status: "Active",
                    });
                    closeAddModal();
                  } catch (error) {
                    console.error("Error creating customer:", error);
                    alert("Failed to create customer. Please try again.");
                  }
                }}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm text-slate-300">
                      Company name
                    </label>
                    <input
                      name="partyName"
                      value={formData.partyName}
                      onChange={(e) =>
                        setFormData({ ...formData, partyName: e.target.value })
                      }
                      required
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                      placeholder="e.g. Tech Solutions Inc"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-slate-300">
                      Represented name
                    </label>
                    <input
                      name="shortname"
                      value={formData.shortname}
                      onChange={(e) =>
                        setFormData({ ...formData, shortname: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                      placeholder="e.g. TSI"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm text-slate-300">Address 1</label>
                    <input
                      name="address1"
                      value={formData.address1}
                      onChange={(e) =>
                        setFormData({ ...formData, address1: e.target.value })
                      }
                      required
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                      placeholder="Street, number, area"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-slate-300">Address 2</label>
                    <input
                      name="address2"
                      value={formData.address2}
                      onChange={(e) =>
                        setFormData({ ...formData, address2: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                      placeholder="Suite, building, unit (optional)"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-slate-300">City</label>
                    <input
                      name="city"
                      value={formData.city}
                      onChange={(e) =>
                        setFormData({ ...formData, city: e.target.value })
                      }
                      required
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                      placeholder="e.g. New York"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-slate-300">Country</label>
                    <input
                      name="country"
                      value={formData.country}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          country: e.target.value,
                        })
                      }
                      required
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                      placeholder="e.g. United States"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-slate-300">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      required
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                      placeholder="e.g. hello@company.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-slate-300">
                      Primary phone
                    </label>
                    <input
                      name="phone1"
                      value={formData.phone1}
                      onChange={(e) =>
                        setFormData({ ...formData, phone1: e.target.value })
                      }
                      required
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                      placeholder="Primary phone"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-slate-300">
                      Secondary phone
                    </label>
                    <input
                      name="phone2"
                      value={formData.phone2}
                      onChange={(e) =>
                        setFormData({ ...formData, phone2: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                      placeholder="Secondary phone (optional)"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-slate-300">Status</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({ ...formData, status: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                      placeholder="Status"
                    >
                      <option className="bg-slate-800" value="Active">
                        Active
                      </option>
                      <option className="bg-slate-800" value="Inactive">
                        Inactive
                      </option>
                      <option className="bg-slate-800" value="Pending">
                        Pending
                      </option>
                    </select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm text-slate-300">Added By</label>
                    <div className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white">
                      {currentUser?.username || "System"}
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsAddOpen(false)}
                    className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 border border-white/20"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-lg hover:from-blue-700 hover:to-cyan-600"
                  >
                    Save Customer
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Import Preview Modal */}
        {isImportOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/60"
              onClick={closeImportModal}
            ></div>
            <div
              className={`relative z-10 w-full max-w-5xl bg-slate-900/90 border border-white/20 rounded-2xl p-6 backdrop-blur-xl max-h-[85vh] overflow-hidden transition-all duration-200 ease-out transform ${
                isImportEntering ? "opacity-0 scale-90" : ""
              } ${
                isImportClosing ? "opacity-0 scale-90" : "opacity-100 scale-100"
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-white">
                    Import Preview
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {importFileName}
                  </p>
                </div>
                <button
                  onClick={closeImportModal}
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
              {sheetNames.length > 1 && (
                <div className="mb-4">
                  <label className="text-sm text-slate-300 mr-2">Sheet</label>
                  <select
                    value={selectedSheet}
                    onChange={(e) => {
                      const newSheet = e.target.value;
                      setSelectedSheet(newSheet);
                      // Re-parse current workbook from state is not stored; prompt re-import for multi-sheet in this simple preview
                      // In a full implementation, we'd store the workbook object; for now we leave as-is.
                    }}
                    className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
                  >
                    {sheetNames.map((n) => (
                      <option key={n} value={n} className="bg-slate-800">
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="rounded-lg border border-white/10 overflow-auto max-h-[65vh]">
                <table className="min-w-full">
                  <thead className="bg-white/5 sticky top-0 z-10">
                    <tr>
                      {excelHeaders.length ? (
                        excelHeaders.map((h, idx) => (
                          <th
                            key={idx}
                            className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider whitespace-nowrap"
                          >
                            {String(h || "").trim() || `Column ${idx + 1}`}
                          </th>
                        ))
                      ) : (
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                          No Headers
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {excelRows && excelRows.length ? (
                      excelRows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-white/5">
                          {(excelHeaders.length ? excelHeaders : row).map(
                            (_, cIdx) => (
                              <td
                                key={cIdx}
                                className="px-4 py-2 text-sm text-slate-200 whitespace-nowrap"
                              >
                                {row[cIdx] !== undefined && row[cIdx] !== null
                                  ? String(row[cIdx])
                                  : ""}
                              </td>
                            )
                          )}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="px-4 py-6 text-center text-slate-400">
                          No data found in this sheet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex justify-end space-x-3">
                <button
                  onClick={closeImportModal}
                  className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 border border-white/20"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImportSubmit}
                  disabled={
                    isSubmittingImport || !importData || excelRows.length === 0
                  }
                  className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {isSubmittingImport
                    ? "Importing..."
                    : `Import ${excelRows.length} Customers`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mb-6 flex flex-wrap gap-4">
          <button
            onClick={openAddModal}
            className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-lg hover:from-blue-700 hover:to-cyan-600 transition-all duration-200"
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
            Add New Customer
          </button>
          <button
            onClick={handleImportClick}
            className="flex items-center px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 disabled:opacity-60"
            disabled={isImporting}
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
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
              />
            </svg>
            {isImporting ? "Uploading..." : "Import from Excel"}
          </button>
          <button
            onClick={handleExportExcel}
            disabled={filteredCustomers.length === 0}
            className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 disabled:opacity-60"
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
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Export to Excel
          </button>
          <button
            onClick={handleExportCSV}
            disabled={filteredCustomers.length === 0}
            className="flex items-center px-4 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-lg hover:from-teal-700 hover:to-cyan-700 transition-all duration-200 disabled:opacity-60"
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
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Export to CSV
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            onChange={handleFileSelected}
            className="hidden"
          />
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
                  placeholder="Search customers..."
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

            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="All" className="bg-slate-800">
                  All Status
                </option>
                <option value="Active" className="bg-slate-800">
                  Active
                </option>
                <option value="Inactive" className="bg-slate-800">
                  Inactive
                </option>
                <option value="Pending" className="bg-slate-800">
                  Pending
                </option>
              </select>
            </div>

            {/* Country Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">
                Country
              </label>
              <select
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value)}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="All" className="bg-slate-800">
                  All Countries
                </option>
                {uniqueCountries.map((country) => (
                  <option
                    key={country}
                    value={country}
                    className="bg-slate-800"
                  >
                    {country}
                  </option>
                ))}
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
                  <option value="id" className="bg-slate-800">
                    ID
                  </option>
                  <option value="partyName" className="bg-slate-800">
                    Company name
                  </option>
                  <option value="city" className="bg-slate-800">
                    City
                  </option>
                  <option value="country" className="bg-slate-800">
                    Country
                  </option>
                  <option value="status" className="bg-slate-800">
                    Status
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
          </div>

          {/* Results Count */}
          <div className="mt-4 flex justify-between items-center">
            <p className="text-sm text-slate-300">
              Showing {filteredCustomers.length} of {customers.length} customers
            </p>
            {(searchTerm ||
              statusFilter !== "All" ||
              countryFilter !== "All") && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("All");
                  setCountryFilter("All");
                }}
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Customers Table */}
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
                      ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Company name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Represented name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Address
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      City
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Country
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Added By
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {filteredCustomers.map((customer) => (
                    <tr
                      key={customer.id}
                      className="hover:bg-white/5 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm text-white font-mono">
                        {customer.id}
                      </td>
                      <td className="px-4 py-3 text-sm text-white font-medium">
                        {customer.partyName}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300 font-mono">
                        {customer.shortname}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300">
                        <div className="space-y-1">
                          <div>{customer.address1}</div>
                          {customer.address2 && (
                            <div className="text-xs text-slate-400">
                              {customer.address2}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300">
                        {customer.city || customer.cityName || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300">
                        {customer.country || customer.countryName || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-blue-300">
                        <a
                          href={`mailto:${customer.email}`}
                          className="hover:text-blue-200 transition-colors"
                        >
                          {customer.email}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300">
                        <div className="space-y-1">
                          <div className="font-medium">{customer.phone1}</div>
                          {customer.phone2 && (
                            <div className="text-xs text-slate-400">
                              {customer.phone2}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            customer.status === "Active"
                              ? "bg-green-500/20 text-green-300"
                              : customer.status === "Inactive"
                              ? "bg-red-500/20 text-red-300"
                              : "bg-yellow-500/20 text-yellow-300"
                          }`}
                        >
                          {customer.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300">
                        {customer.addedBy || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => openEditModal(customer)}
                            className="text-blue-400 hover:text-blue-300 transition-colors"
                            title="Edit"
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
                            onClick={() => openDeleteModal(customer)}
                            className="text-red-400 hover:text-red-300 transition-colors"
                            title="Delete"
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
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default CustomersPage;
