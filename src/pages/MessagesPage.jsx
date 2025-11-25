import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "@/lib/api";

function MessagesPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isEmailOpen, setIsEmailOpen] = useState(false);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [messageText, setMessageText] = useState("");
  const emailTextareaRef = useRef(null);
  const emailFileInputRef = useRef(null);
  const [attachments, setAttachments] = useState([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [countryFilter, setCountryFilter] = useState("All");
  const [sortBy, setSortBy] = useState("partyName");
  const [sortOrder, setSortOrder] = useState("asc");
  // Signature states
  const [signatures, setSignatures] = useState([]);
  const [selectedSignatureId, setSelectedSignatureId] = useState("");
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [signatureViewMode, setSignatureViewMode] = useState("list"); // "list" or "form"
  const [editingSignature, setEditingSignature] = useState(null);
  const [signatureFormData, setSignatureFormData] = useState({
    name: "",
    markdown: "",
    isDefault: false,
  });

  useEffect(() => {
    // Fetch customers from API
    const fetchCustomers = async () => {
      try {
        setIsLoading(true);
        const response = await apiClient.get("/customers");
        const customerData = response.data?.customers || response.data || [];
        setCustomers(customerData);
      } catch (error) {
        console.error("Error fetching customers:", error);
        alert("Failed to fetch customers. Please try again.");
        setCustomers([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  // Get unique countries from active customers for filter dropdown
  const uniqueCountries = useMemo(() => {
    const activeList = customers.filter((c) => c.status === "Active");
    return Array.from(
      new Set(
        activeList
          .map((c) => c.country || c.countryName)
          .filter((country) => country && country.trim() !== "")
      )
    ).sort();
  }, [customers]);

  const activeCustomers = useMemo(() => {
    // Only Active customers
    let list = customers.filter((c) => c.status === "Active");
    // Search with backward compatibility for city/country fields
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter((c) => {
        const citySearch = (c.city || c.cityName || "").toLowerCase();
        const countrySearch = (c.country || c.countryName || "").toLowerCase();

        return (
          c.partyName.toLowerCase().includes(term) ||
          (c.shortname || "").toLowerCase().includes(term) ||
          (c.email || "").toLowerCase().includes(term) ||
          citySearch.includes(term) ||
          countrySearch.includes(term) ||
          (c.phone1 || "").includes(searchTerm) ||
          (c.phone2 || "").includes(searchTerm)
        );
      });
    }
    // Country filter with backward compatibility
    if (countryFilter !== "All") {
      list = list.filter((c) => (c.country || c.countryName) === countryFilter);
    }
    // Sort
    list.sort((a, b) => {
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
    return list;
  }, [customers, searchTerm, countryFilter, sortBy, sortOrder]);

  const toggleSelected = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const allSelected =
    activeCustomers.length > 0 &&
    activeCustomers.every((c) => selectedIds.has(c.id));
  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      if (allSelected) return new Set();
      return new Set(activeCustomers.map((c) => c.id));
    });
  };

  // Fetch signatures
  const fetchSignatures = async () => {
    try {
      const response = await apiClient.get("/signatures");
      const signaturesData = response.data || [];
      // Map backend "content" field to "markdown" for frontend consistency
      const mappedSignatures = signaturesData.map((sig) => ({
        ...sig,
        markdown: sig.markdown || sig.content || "", // Support both field names
      }));
      setSignatures(mappedSignatures);
      // Set default signature if available
      const defaultSig = mappedSignatures.find((sig) => sig.isDefault);
      if (defaultSig) {
        setSelectedSignatureId(defaultSig.id);
      }
    } catch (error) {
      console.error("Error fetching signatures:", error);
    }
  };

  const openEmailForm = async () => {
    setEmailSubject("");
    setMessageText("");
    // reset attachments
    attachments.forEach((a) => a.url && URL.revokeObjectURL(a.url));
    setAttachments([]);
    setIsEmailOpen(true);
    // Fetch signatures when opening email form
    await fetchSignatures();
  };
  const openWhatsAppForm = () => {
    setMessageText("");
    setIsWhatsAppOpen(true);
  };
  const closeForms = () => {
    if (isEmailOpen && attachments.length) {
      attachments.forEach((a) => a.url && URL.revokeObjectURL(a.url));
      setAttachments([]);
    }
    setIsEmailOpen(false);
    setIsWhatsAppOpen(false);
    setEmailSubject("");
    setMessageText("");
  };

  // Template variable replacement function
  const replaceTemplateVariables = (text, customer) => {
    if (!text || !customer) return text;

    const replacements = {
      "{company_name}": customer.partyName || "",
      "{companyname}": customer.partyName || "",
      "{represented_name}": customer.shortname || "",
      "{shortname}": customer.shortname || "",
      "{email}": customer.email || "",
      "{phone}": customer.phone1 || "",
      "{phone1}": customer.phone1 || "",
      "{primary_phone}": customer.phone1 || "",
      "{phone2}": customer.phone2 || "",
      "{secondary_phone}": customer.phone2 || "",
      "{city}": customer.city || customer.cityName || "",
      "{country}": customer.country || customer.countryName || "",
      "{address1}": customer.address1 || "",
      "{address2}": customer.address2 || "",
      "{address}": customer.address1 || "",
    };

    let result = text;
    Object.keys(replacements).forEach((key) => {
      const regex = new RegExp(key.replace(/[{}]/g, "\\$&"), "gi");
      result = result.replace(regex, replacements[key]);
    });

    return result;
  };

  const handleSend = async (type) => {
    if (type === "Email") {
      // Send email through API
      try {
        // Validate customer IDs
        if (selectedIds.size === 0) {
          alert("Please select at least one customer to send the email to.");
          return;
        }

        const customerIds = Array.from(selectedIds);
        const selectedCustomers = customers.filter((c) =>
          customerIds.includes(c.id)
        );

        // Send individual emails to each customer with personalized content
        let successCount = 0;
        let errorCount = 0;

        for (const customer of selectedCustomers) {
          try {
            // Replace template variables for this customer
            const personalizedSubject = replaceTemplateVariables(
              emailSubject,
              customer
            );
            const personalizedBody = replaceTemplateVariables(
              messageText,
              customer
            );

            // Create FormData for file upload
            const formData = new FormData();

            // Add subject as string (personalized)
            formData.append("subject", personalizedSubject || "");

            // Add bodyMarkdown as string (personalized)
            formData.append("bodyMarkdown", personalizedBody || "");

            // Add single customer ID
            formData.append("customerIds", String(customer.id));

            // Add attachments
            attachments.forEach((attachment) => {
              formData.append("attachments", attachment.file);
            });

            // Send to API
            await apiClient.post("/messages/mail", formData);
            successCount++;
          } catch (error) {
            console.error(
              `Error sending email to ${customer.partyName}:`,
              error
            );
            errorCount++;
          }
        }

        if (errorCount === 0) {
          alert(`Email sent successfully to ${successCount} customer(s)!`);
        } else {
          alert(
            `Email sent to ${successCount} customer(s), ${errorCount} failed.`
          );
        }

        closeForms();
      } catch (error) {
        console.error("Error sending email:", error);
        const errorMessage =
          error.response?.data?.message ||
          error.response?.data?.error ||
          "Failed to send email. Please try again.";
        alert(errorMessage);
      }
    } else {
      // WhatsApp - placeholder
      const attachInfo =
        type === "Email" && attachments.length
          ? `\n\nAttachments (${attachments.length}):\n- ${attachments
              .map(
                (a) => `${a.file.name} (${Math.round(a.file.size / 1024)} KB)`
              )
              .join("\n- ")}`
          : "";
      alert(
        `${type} sent to ${selectedIds.size} customer(s):\n\n${
          messageText || "<empty>"
        }${attachInfo}`
      );
      closeForms();
    }
  };

  const escapeHtml = (str) =>
    str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const markdownToHtml = (md) => {
    if (!md) return "";
    // Basic inline conversions first on escaped text
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

      // Headings: allow optional space after #'s
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

      // Inline: code, bold, italic, links
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

  const applyMarkdown = (action) => {
    const textarea = emailTextareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const value = messageText || "";
    const selected = value.slice(start, end) || "";

    const surround = (prefix, suffix = prefix) => {
      const before = value.slice(0, start);
      const after = value.slice(end);
      const inner = selected || "text";
      const newValue = `${before}${prefix}${inner}${suffix}${after}`;
      setMessageText(newValue);
      // Preserve selection around the inner text so multiple wraps can be applied
      const selStart = before.length + prefix.length;
      const selEnd = selStart + inner.length;
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(selStart, selEnd);
      });
    };

    const insertLineStart = (token) => {
      const before = value.slice(0, start);
      const after = value.slice(end);
      const lineStart = before.lastIndexOf("\n") + 1;
      const newBefore = `${before.slice(0, lineStart)}${token} ${before.slice(
        lineStart
      )}`;
      const newValue = `${newBefore}${selected}${after}`;
      setMessageText(newValue);
      // Keep the original selected text selected after insertion
      const selStart =
        newBefore.length -
        (before.length - lineStart) +
        (before.length - lineStart) +
        token.length +
        1 +
        (selected ? 0 : 0);
      const selEnd = newBefore.length + (selected ? selected.length : 0);
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(selStart, selEnd);
      });
    };

    const wrapLines = (prefix) => {
      const before = value.slice(0, start);
      const after = value.slice(end);
      const content = selected || "item 1\nitem 2";
      const wrapped = content
        .split("\n")
        .map((l) => (l.trim() ? `${prefix} ${l}` : l))
        .join("\n");
      const newValue = `${before}${wrapped}${after}`;
      setMessageText(newValue);
      // Preserve selection over the wrapped block
      const selStart = before.length;
      const selEnd = selStart + wrapped.length;
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(selStart, selEnd);
      });
    };

    switch (action) {
      case "bold":
        return surround("**");
      case "italic":
        return surround("*");
      case "code":
        return surround("`");
      case "h1":
        return insertLineStart("#");
      case "h2":
        return insertLineStart("##");
      case "quote":
        return wrapLines(">");
      case "ul":
        return wrapLines("-");
      case "link": {
        const before = messageText.slice(0, start);
        const after = messageText.slice(end);
        const text = selected || "link text";
        const url = "https://";
        const snippet = `[${text}](${url})`;
        const newValue = `${before}${snippet}${after}`;
        setMessageText(newValue);
        const urlStart = (before + `[${text}](`).length;
        requestAnimationFrame(() => {
          textarea.focus();
          textarea.setSelectionRange(urlStart, urlStart + url.length);
        });
        return;
      }
      case "clear":
        return setMessageText("");
      default:
        return;
    }
  };

  const triggerFilePicker = () => {
    emailFileInputRef.current?.click();
  };

  const handleFilesSelected = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const newItems = files.map((file, idx) => ({
      id: `${Date.now()}_${idx}`,
      file,
      url: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
    }));
    setAttachments((prev) => [...prev, ...newItems]);
    e.target.value = ""; // reset for re-selecting same files
  };

  const removeAttachment = (id) => {
    setAttachments((prev) => {
      const item = prev.find((a) => a.id === id);
      if (item && item.url) URL.revokeObjectURL(item.url);
      return prev.filter((a) => a.id !== id);
    });
  };

  // Signature management functions
  const insertSignature = () => {
    if (!selectedSignatureId) return;
    const signature = signatures.find((sig) => sig.id === selectedSignatureId);
    if (!signature) return;

    const textarea = emailTextareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart || 0;
      const end = textarea.selectionEnd || 0;
      const text = messageText || "";
      const before = text.substring(0, start);
      const after = text.substring(end);
      const separator = before && !before.endsWith("\n\n") ? "\n\n" : "";
      const newText = `${before}${separator}${signature.markdown}${after}`;
      setMessageText(newText);
      // Set cursor position after inserted signature
      setTimeout(() => {
        textarea.focus();
        const newPosition =
          start + separator.length + signature.markdown.length;
        textarea.setSelectionRange(newPosition, newPosition);
      }, 0);
    } else {
      setMessageText((prev) => {
        const separator = prev && !prev.endsWith("\n\n") ? "\n\n" : "";
        return prev + separator + signature.markdown;
      });
    }
  };

  const openSignatureModal = (signature = null) => {
    if (signature) {
      setEditingSignature(signature);
      setSignatureFormData({
        name: signature.name,
        markdown: signature.markdown,
        isDefault: signature.isDefault,
      });
      setSignatureViewMode("form");
    } else {
      setEditingSignature(null);
      setSignatureFormData({
        name: "",
        markdown: "",
        isDefault: false,
      });
      setSignatureViewMode("list");
    }
    setIsSignatureModalOpen(true);
  };

  const closeSignatureModal = () => {
    setIsSignatureModalOpen(false);
    setEditingSignature(null);
    setSignatureViewMode("list");
    setSignatureFormData({
      name: "",
      markdown: "",
      isDefault: false,
    });
  };

  const handleSaveSignature = async () => {
    try {
      if (
        !signatureFormData.name.trim() ||
        !signatureFormData.markdown.trim()
      ) {
        alert("Please fill in both name and markdown content.");
        return;
      }

      // Transform data to match backend API expectations
      const payload = {
        name: signatureFormData.name,
        content: signatureFormData.markdown, // Backend expects "content" not "markdown"
        isDefault: signatureFormData.isDefault,
      };

      if (editingSignature) {
        // Update existing signature
        await apiClient.patch(`/signatures/${editingSignature.id}`, payload);
      } else {
        // Create new signature
        await apiClient.post("/signatures", payload);
      }

      await fetchSignatures();
      closeSignatureModal();
    } catch (error) {
      console.error("Error saving signature:", error);
      const errorMessage =
        error.response?.data?.message ||
        (Array.isArray(error.response?.data?.message)
          ? error.response.data.message.join(", ")
          : "Failed to save signature. Please try again.");
      alert(errorMessage);
    }
  };

  const handleDeleteSignature = async (id) => {
    if (!confirm("Are you sure you want to delete this signature?")) return;

    try {
      await apiClient.delete(`/signatures/${id}`);
      await fetchSignatures();
      if (selectedSignatureId === id) {
        setSelectedSignatureId("");
      }
    } catch (error) {
      console.error("Error deleting signature:", error);
      alert("Failed to delete signature. Please try again.");
    }
  };

  const handleSetDefaultSignature = async (id) => {
    try {
      await apiClient.patch(`/signatures/${id}`, { isDefault: true });
      await fetchSignatures();
    } catch (error) {
      console.error("Error setting default signature:", error);
      alert("Failed to set default signature. Please try again.");
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
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8"
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-white">New Message</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate("/admin/crm/messages/history")}
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
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                History
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
            Select Active Customers
          </h2>
          <p className="text-slate-300">
            Choose recipients and compose a message
          </p>
        </div>

        {/* Actions */}
        <div className="mb-6 flex flex-wrap gap-4">
          <button
            onClick={openEmailForm}
            disabled={selectedIds.size === 0}
            className="flex items-center px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg hover:from-indigo-700 hover:to-blue-700 transition-all duration-200 disabled:opacity-60"
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
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8m-18 8h18a2 2 0 002-2V8a2 2 0 00-2-2H3a2 2 0 00-2 2v6a2 2 0 002 2z"
              />
            </svg>
            Send message from Email
          </button>
          <button
            onClick={openWhatsAppForm}
            disabled={selectedIds.size === 0}
            className="flex items-center px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 disabled:opacity-60"
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
                d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Send message from WhatsApp
          </button>
        </div>

        {/* Filters and Search (status locked to Active) */}
        <div className="mb-6 bg-white/10 backdrop-blur-lg rounded-xl shadow-xl border border-white/20 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                  <option value="partyName" className="bg-slate-800">
                    Company name
                  </option>
                  <option value="city" className="bg-slate-800">
                    City
                  </option>
                  <option value="country" className="bg-slate-800">
                    Country
                  </option>
                  <option value="email" className="bg-slate-800">
                    Email
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
              Showing {activeCustomers.length} active customers
            </p>
            {(searchTerm || countryFilter !== "All") && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setCountryFilter("All");
                  setSortBy("partyName");
                  setSortOrder("asc");
                }}
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Customers table */}
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
                    <th className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleSelectAll}
                        className="w-4 h-4"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Company name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                      Phone
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {activeCustomers.map((c) => (
                    <tr
                      key={c.id}
                      className="hover:bg-white/5 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(c.id)}
                          onChange={() => toggleSelected(c.id)}
                          className="w-4 h-4"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-white font-medium">
                        {c.partyName}
                      </td>
                      <td className="px-4 py-3 text-sm text-blue-300">
                        <a
                          href={`mailto:${c.email}`}
                          className="hover:text-blue-200 transition-colors"
                        >
                          {c.email}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300">
                        {c.phone1}
                      </td>
                    </tr>
                  ))}
                  {activeCustomers.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-6 text-center text-slate-400"
                      >
                        No active customers available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Email form modal */}
        {isEmailOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/60"
              onClick={closeForms}
            ></div>
            <div className="relative z-10 w-full max-w-xl bg-slate-900/90 border border-white/20 rounded-2xl p-6 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-white">Send Email</h3>
                <button
                  onClick={closeForms}
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
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2 mb-2">
                  <button
                    onClick={() => applyMarkdown("bold")}
                    className="px-2 py-1 text-xs bg-white/10 border border-white/20 rounded text-white hover:bg-white/20"
                  >
                    B
                  </button>
                  <button
                    onClick={() => applyMarkdown("italic")}
                    className="px-2 py-1 text-xs bg-white/10 border border-white/20 rounded text-white hover:bg-white/20"
                  >
                    <em>I</em>
                  </button>
                  <button
                    onClick={() => applyMarkdown("h1")}
                    className="px-2 py-1 text-xs bg-white/10 border border-white/20 rounded text-white hover:bg-white/20"
                  >
                    H1
                  </button>
                  <button
                    onClick={() => applyMarkdown("h2")}
                    className="px-2 py-1 text-xs bg-white/10 border border-white/20 rounded text-white hover:bg-white/20"
                  >
                    H2
                  </button>
                  <button
                    onClick={() => applyMarkdown("ul")}
                    className="px-2 py-1 text-xs bg-white/10 border border-white/20 rounded text-white hover:bg-white/20"
                  >
                    List
                  </button>
                  <button
                    onClick={() => applyMarkdown("quote")}
                    className="px-2 py-1 text-xs bg-white/10 border border-white/20 rounded text-white hover:bg-white/20"
                  >
                    Quote
                  </button>
                  <button
                    onClick={() => applyMarkdown("code")}
                    className="px-2 py-1 text-xs bg-white/10 border border-white/20 rounded text-white hover:bg-white/20"
                  >
                    Code
                  </button>
                  <button
                    onClick={() => applyMarkdown("link")}
                    className="px-2 py-1 text-xs bg-white/10 border border-white/20 rounded text-white hover:bg-white/20"
                  >
                    Link
                  </button>
                  <div className="ml-auto flex items-center gap-2">
                    <button
                      onClick={() => setIsPreviewOpen((v) => !v)}
                      className="px-2 py-1 text-xs bg-white/10 border border-white/20 rounded text-white hover:bg-white/20"
                    >
                      {isPreviewOpen ? "Hide Preview" : "Preview"}
                    </button>
                    <button
                      onClick={() => applyMarkdown("clear")}
                      className="px-2 py-1 text-xs bg-red-600 rounded text-white hover:bg-red-700"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                {/* Template Variables Helper */}
                <div className="mb-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <div className="text-xs text-blue-300 mb-2 font-semibold">
                    Available Template Variables (click to insert):
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "{company_name}",
                      "{represented_name}",
                      "{email}",
                      "{phone}",
                      "{phone2}",
                      "{city}",
                      "{country}",
                      "{address1}",
                      "{address2}",
                    ].map((variable) => (
                      <button
                        key={variable}
                        type="button"
                        onClick={() => {
                          const textarea = emailTextareaRef.current;
                          if (textarea) {
                            const start = textarea.selectionStart;
                            const end = textarea.selectionEnd;
                            const text = messageText;
                            const newText =
                              text.substring(0, start) +
                              variable +
                              text.substring(end);
                            setMessageText(newText);
                            // Set cursor position after inserted variable
                            setTimeout(() => {
                              textarea.focus();
                              textarea.setSelectionRange(
                                start + variable.length,
                                start + variable.length
                              );
                            }, 0);
                          } else {
                            setMessageText((prev) => prev + variable);
                          }
                        }}
                        className="px-2 py-1 text-xs bg-blue-500/20 border border-blue-500/30 rounded text-blue-200 hover:bg-blue-500/30 transition-colors"
                        title={`Insert ${variable}`}
                      >
                        {variable}
                      </button>
                    ))}
                  </div>
                  <div className="text-xs text-blue-400/70 mt-2">
                    Variables will be replaced with actual customer data when
                    sending
                  </div>
                </div>
                {/* Signature Selector */}
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="text-sm text-slate-300 mb-1 block">
                      Signature
                    </label>
                    <select
                      value={selectedSignatureId}
                      onChange={(e) => setSelectedSignatureId(e.target.value)}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
                    >
                      <option value="" className="bg-slate-800">
                        No signature
                      </option>
                      {signatures.map((sig) => (
                        <option
                          key={sig.id}
                          value={sig.id}
                          className="bg-slate-800"
                        >
                          {sig.name} {sig.isDefault ? "(Default)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={insertSignature}
                    disabled={!selectedSignatureId}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    title="Insert signature into message"
                  >
                    Insert
                  </button>
                  <button
                    onClick={() => openSignatureModal()}
                    className="px-3 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 border border-white/20 text-sm"
                    title="Manage signatures"
                  >
                    Manage
                  </button>
                </div>
                <label className="text-sm text-slate-300">Subject</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                  placeholder="Enter email subject"
                />
                <label className="text-sm text-slate-300">Message</label>
                <textarea
                  ref={emailTextareaRef}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                  placeholder="Write your message..."
                />
                {isPreviewOpen && (
                  <div className="mt-4">
                    <div className="text-sm text-slate-300 mb-2">Preview</div>
                    <div
                      className="prose prose-invert max-w-none bg-white/5 border border-white/20 rounded-lg p-4 text-slate-100"
                      dangerouslySetInnerHTML={{
                        __html: markdownToHtml(messageText),
                      }}
                    ></div>
                  </div>
                )}
                <div className="mt-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="text-sm text-slate-300">Attachments</div>
                    <button
                      onClick={triggerFilePicker}
                      className="px-3 py-1.5 text-xs bg-white/10 border border-white/20 rounded text-white hover:bg-white/20 flex items-center"
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
                          d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828L20 7.828M16 5l3 3"
                        />
                      </svg>
                      Attach files
                    </button>
                    <input
                      ref={emailFileInputRef}
                      type="file"
                      multiple
                      onChange={handleFilesSelected}
                      className="hidden"
                    />
                  </div>
                  {attachments.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {attachments.map((a) => (
                        <div
                          key={a.id}
                          className="flex items-center gap-3 bg-white/5 border border-white/10 rounded p-2"
                        >
                          {a.url ? (
                            <img
                              src={a.url}
                              alt={a.file.name}
                              className="w-12 h-12 object-cover rounded"
                            />
                          ) : (
                            <div className="w-12 h-12 flex items-center justify-center bg-white/10 rounded">
                              <svg
                                className="w-6 h-6 text-slate-300"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M7 7h10M7 11h10M7 15h7"
                                />
                              </svg>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="truncate text-sm text-white">
                              {a.file.name}
                            </div>
                            <div className="text-xs text-slate-400">
                              {Math.round(a.file.size / 1024)} KB
                            </div>
                          </div>
                          <button
                            onClick={() => removeAttachment(a.id)}
                            className="text-slate-300 hover:text-white"
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
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={closeForms}
                  className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 border border-white/20"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSend("Email")}
                  disabled={selectedIds.size === 0}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg hover:from-indigo-700 hover:to-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        )}

        {/* WhatsApp form modal */}
        {isWhatsAppOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/60"
              onClick={closeForms}
            ></div>
            <div className="relative z-10 w-full max-w-xl bg-slate-900/90 border border-white/20 rounded-2xl p-6 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-white">
                  Send WhatsApp
                </h3>
                <button
                  onClick={closeForms}
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
              <div className="space-y-3">
                <label className="text-sm text-slate-300">Message</label>
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                  placeholder="Write your message..."
                />
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={closeForms}
                  className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 border border-white/20"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSend("WhatsApp")}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Signature Management Modal */}
        {isSignatureModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/60"
              onClick={closeSignatureModal}
            ></div>
            <div className="relative z-10 w-full max-w-3xl bg-slate-900/95 border border-white/20 rounded-2xl p-6 backdrop-blur-xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-white">
                  {editingSignature ? "Edit Signature" : "Manage Signatures"}
                </h3>
                <button
                  onClick={closeSignatureModal}
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

              {signatureViewMode === "form" ? (
                // Edit/Create Form
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-slate-300 mb-1 block">
                      Signature Name
                    </label>
                    <input
                      type="text"
                      value={signatureFormData.name}
                      onChange={(e) =>
                        setSignatureFormData({
                          ...signatureFormData,
                          name: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                      placeholder="e.g., Professional, Personal"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-300 mb-1 block">
                      Signature Content (Markdown)
                    </label>
                    <textarea
                      value={signatureFormData.markdown}
                      onChange={(e) =>
                        setSignatureFormData({
                          ...signatureFormData,
                          markdown: e.target.value,
                        })
                      }
                      rows={8}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white font-mono text-sm"
                      placeholder="Enter your signature in markdown format..."
                    />
                    <div className="mt-2 text-xs text-slate-400">
                      You can use markdown formatting: **bold**, *italic*,
                      links, etc.
                    </div>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isDefault"
                      checked={signatureFormData.isDefault}
                      onChange={(e) =>
                        setSignatureFormData({
                          ...signatureFormData,
                          isDefault: e.target.checked,
                        })
                      }
                      className="w-4 h-4 mr-2"
                    />
                    <label
                      htmlFor="isDefault"
                      className="text-sm text-slate-300"
                    >
                      Set as default signature
                    </label>
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={closeSignatureModal}
                      className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 border border-white/20"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveSignature}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      {editingSignature ? "Update" : "Create"}
                    </button>
                  </div>
                </div>
              ) : (
                // Signature List
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        setEditingSignature(null);
                        setSignatureFormData({
                          name: "",
                          markdown: "",
                          isDefault: false,
                        });
                        setSignatureViewMode("form");
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
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
                      New Signature
                    </button>
                  </div>
                  {signatures.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      No signatures yet. Create your first signature!
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {signatures.map((sig) => (
                        <div
                          key={sig.id}
                          className="bg-white/5 border border-white/10 rounded-lg p-4"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="text-white font-medium">
                                  {sig.name}
                                </h4>
                                {sig.isDefault && (
                                  <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-300 rounded">
                                    Default
                                  </span>
                                )}
                              </div>
                              <div
                                className="text-sm text-slate-300 prose prose-invert max-w-none"
                                dangerouslySetInnerHTML={{
                                  __html: markdownToHtml(sig.markdown),
                                }}
                              />
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              {!sig.isDefault && (
                                <button
                                  onClick={() =>
                                    handleSetDefaultSignature(sig.id)
                                  }
                                  className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                                  title="Set as default"
                                >
                                  Set Default
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setEditingSignature(sig);
                                  setSignatureFormData({
                                    name: sig.name,
                                    markdown: sig.markdown,
                                    isDefault: sig.isDefault,
                                  });
                                  setSignatureViewMode("form");
                                }}
                                className="px-2 py-1 text-xs bg-white/10 text-white rounded hover:bg-white/20"
                                title="Edit"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteSignature(sig.id)}
                                className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                                title="Delete"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default MessagesPage;
