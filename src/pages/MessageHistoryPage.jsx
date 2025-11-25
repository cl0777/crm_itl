import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "@/lib/api";

function MessageHistoryPage() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  useEffect(() => {
    // Fetch current user
    const fetchCurrentUser = async () => {
      try {
        const response = await apiClient.get("/auth/me");
        const userData = response.data?.user || response.data;
        if (userData) {
          setCurrentUser(userData);
        }
      } catch (error) {
        console.error("Error fetching current user:", error);
        navigate("/admin/crm/login");
      }
    };

    fetchCurrentUser();
  }, [navigate]);

  useEffect(() => {
    // Fetch message history
    const fetchMessages = async () => {
      try {
        setIsLoading(true);
        // The API should handle role-based filtering on the backend
        // Admin: all messages, Manager: department messages, User: own messages
        const response = await apiClient.get("/messages/history");
        const messagesData = response.data?.messages || response.data || [];
        setMessages(messagesData);
      } catch (error) {
        console.error("Error fetching message history:", error);
        alert("Failed to fetch message history. Please try again.");
        setMessages([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();
  }, []);

  // Filter and sort messages
  const filteredMessages = useMemo(() => {
    let filtered = messages;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((msg) => {
        const subject = (msg.subject || "").toLowerCase();
        const body = (msg.bodyMarkdown || msg.body || "").toLowerCase();
        const sender = (
          msg.user?.username ||
          msg.user?.name ||
          ""
        ).toLowerCase();
        const recipient = (msg.recipient.partyName || "").toLowerCase();
        return (
          subject.includes(term) ||
          body.includes(term) ||
          sender.includes(term) ||
          recipient.includes(term)
        );
      });
    }

    // Type filter
    if (typeFilter !== "All") {
      filtered = filtered.filter((msg) => msg.type === typeFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      // Handle date sorting
      if (sortBy === "createdAt" || sortBy === "sentAt") {
        aValue = new Date(aValue || 0);
        bValue = new Date(bValue || 0);
      } else if (typeof aValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortOrder === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [messages, searchTerm, typeFilter, sortBy, sortOrder]);

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const markdownToHtml = (md) => {
    if (!md) return "";
    const escapeHtml = (str) =>
      str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const lines = escapeHtml(md).split(/\r?\n/);
    const htmlLines = [];
    let inUl = false;
    let inOl = false;

    const closeListsIfAny = () => {
      if (inUl) {
        htmlLines.push("</ul>");
        inUl = false;
      }
      if (inOl) {
        htmlLines.push("</ol>");
        inOl = false;
      }
    };

    for (let rawLine of lines) {
      let line = rawLine;
      const headingMatch = line.match(/^(#{1,6})\s?(.*)$/);
      if (headingMatch && headingMatch[2].trim() !== "") {
        const level = Math.min(6, headingMatch[1].length);
        const content = headingMatch[2];
        closeListsIfAny();
        line = `<h${level}>${content}</h${level}>`;
      } else if (/^>\s?/.test(line)) {
        closeListsIfAny();
        line = `<blockquote>${line.replace(/^>\s?/, "")}</blockquote>`;
      } else if (/^[-*+]\s+/.test(line)) {
        if (!inUl) {
          closeListsIfAny();
          inUl = true;
          htmlLines.push("<ul>");
        }
        line = `<li>${line.replace(/^[-*+]\s+/, "")}</li>`;
      } else if (/^\d+\.\s+/.test(line)) {
        if (!inOl) {
          closeListsIfAny();
          inOl = true;
          htmlLines.push("<ol>");
        }
        line = `<li>${line.replace(/^\d+\.\s+/, "")}</li>`;
      } else {
        closeListsIfAny();
        if (line.trim() === "") {
          line = "<br/>";
        } else {
          line = `<p>${line}</p>`;
        }
      }

      line = line
        .replace(/\`([^`]+)\`/g, "<code>$1</code>")
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        .replace(/\*([^*]+)\*/g, "<em>$1</em>")
        .replace(/\_\_([^_]+)\_\_/g, "<strong>$1</strong>")
        .replace(/\_([^_]+)\_/g, "<em>$1</em>")
        .replace(
          /\[([^\]]+)\]\(([^)]+)\)/g,
          '<a href="$2" target="_blank" rel="noreferrer">$1</a>'
        );

      htmlLines.push(line);
    }
    closeListsIfAny();
    return htmlLines.join("\n");
  };

  const openDetailModal = (message) => {
    setSelectedMessage(message);
    setIsDetailOpen(true);
  };

  const closeDetailModal = () => {
    setIsDetailOpen(false);
    setSelectedMessage(null);
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
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-white">Message History</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate("/admin/crm/messages")}
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
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                New Message
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem("accessToken");
                  localStorage.removeItem("refreshToken");
                  navigate("/admin/crm/login");
                }}
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

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">
            Sent Messages History
          </h2>
          <p className="text-slate-300">
            {currentUser?.role === "admin" && "View all sent messages"}
            {currentUser?.role === "manager" &&
              "View messages from your departments"}
            {currentUser?.role === "user" && "View your sent messages"}
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 bg-white/10 backdrop-blur-lg rounded-xl shadow-xl border border-white/20 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">
                Search
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search messages..."
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

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="All" className="bg-slate-800">
                  All Types
                </option>
                <option value="Email" className="bg-slate-800">
                  Email
                </option>
                <option value="WhatsApp" className="bg-slate-800">
                  WhatsApp
                </option>
              </select>
            </div>

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
                  <option value="createdAt" className="bg-slate-800">
                    Date
                  </option>
                  <option value="subject" className="bg-slate-800">
                    Subject
                  </option>
                  <option value="type" className="bg-slate-800">
                    Type
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

          <div className="mt-4 flex justify-between items-center">
            <p className="text-sm text-slate-300">
              Showing {filteredMessages.length} message(s)
            </p>
            {(searchTerm || typeFilter !== "All") && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setTypeFilter("All");
                  setSortBy("createdAt");
                  setSortOrder("desc");
                }}
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Messages table */}
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
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Subject
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Sender
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Recipient
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {filteredMessages.map((msg) => (
                    <tr
                      key={msg.id}
                      className="hover:bg-white/5 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm text-white">
                        {formatDate(msg.createdAt || msg.sentAt)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            msg.type === "Email"
                              ? "bg-blue-500/20 text-blue-300"
                              : "bg-green-500/20 text-green-300"
                          }`}
                        >
                          {msg.type || "Email"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-white font-medium">
                        {msg.subject || "(No subject)"}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300">
                        {msg.user?.name || "Unknown"}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300">
                        {msg.recipient
                          ? `${msg.recipient.shortname} `
                          : msg.recipient.email || "N/A"}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            msg.status === "sent" || msg.status === "delivered"
                              ? "bg-green-500/20 text-green-300"
                              : msg.status === "failed"
                              ? "bg-red-500/20 text-red-300"
                              : "bg-yellow-500/20 text-yellow-300"
                          }`}
                        >
                          {msg.status || "sent"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <button
                          onClick={() => openDetailModal(msg)}
                          className="text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredMessages.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-6 text-center text-slate-400"
                      >
                        {isLoading
                          ? "Loading messages..."
                          : "No messages found."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Message Detail Modal */}
        {isDetailOpen && selectedMessage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/60"
              onClick={closeDetailModal}
            ></div>
            <div className="relative z-10 w-full max-w-3xl bg-slate-900/95 border border-white/20 rounded-2xl p-6 backdrop-blur-xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-white">
                  Message Details
                </h3>
                <button
                  onClick={closeDetailModal}
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-slate-400">Type</label>
                    <p className="text-white">
                      {selectedMessage.type || "Email"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-slate-400">Sent At</label>
                    <p className="text-white">
                      {formatDate(
                        selectedMessage.createdAt || selectedMessage.sentAt
                      )}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-slate-400">Sender</label>
                    <p className="text-white">
                      {selectedMessage.user?.name || "Unknown"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-slate-400">Status</label>
                    <p className="text-white">
                      {selectedMessage.status || "sent"}
                    </p>
                  </div>
                </div>

                {selectedMessage.subject && (
                  <div>
                    <label className="text-sm text-slate-400">Subject</label>
                    <p className="text-white font-medium">
                      {selectedMessage.subject}
                    </p>
                  </div>
                )}

                <div>
                  <label className="text-sm text-slate-400">Recipient</label>
                  <div className="mt-2 space-y-1">
                    {selectedMessage.recipient ? (
                      <div
                        key={selectedMessage.recipient.id}
                        className="text-white bg-white/5 p-2 rounded"
                      >
                        {selectedMessage.recipient.partyName ||
                          selectedMessage.recipient.email ||
                          selectedMessage.recipient.name}
                      </div>
                    ) : (
                      <p className="text-white">
                        {selectedMessage.recipient.partyName || 0} recipient(s)
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-sm text-slate-400">Message Body</label>
                  <div
                    className="mt-2 prose prose-invert max-w-none bg-white/5 border border-white/20 rounded-lg p-4 text-slate-100"
                    dangerouslySetInnerHTML={{
                      __html: markdownToHtml(
                        selectedMessage.bodyMarkdown ||
                          selectedMessage.body ||
                          ""
                      ),
                    }}
                  ></div>
                </div>

                {selectedMessage.attachments &&
                  selectedMessage.attachments.length > 0 && (
                    <div>
                      <label className="text-sm text-slate-400">
                        Attachments ({selectedMessage.attachments.length})
                      </label>
                      <div className="mt-2 space-y-1">
                        {selectedMessage.attachments.map((att, idx) => (
                          <div
                            key={idx}
                            className="text-white bg-white/5 p-2 rounded flex items-center gap-2"
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
                                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828L20 7.828M16 5l3 3"
                              />
                            </svg>
                            {att.name ||
                              att.filename ||
                              `Attachment ${idx + 1}`}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default MessageHistoryPage;
