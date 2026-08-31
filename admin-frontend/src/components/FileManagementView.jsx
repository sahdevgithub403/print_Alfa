import React, { useState, useEffect } from "react";
import {
  getAdminDocuments,
  deleteAdminDocument,
  deleteAdminDocumentsBulk,
  deleteAllAdminDocuments,
  downloadDocumentFile,
  getDocumentPreviewUrl,
} from "../api";
import mammoth from "mammoth";
import {
  Search,
  RefreshCw,
  Trash2,
  Download,
  Eye,
  FileText,
  Image as ImageIcon,
  FileType,
  Files,
  AlertTriangle,
  X,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  HardDrive,
  CheckSquare,
  Square,
  Lock,
  Filter,
  ArrowUpDown,
  FileWarning,
} from "lucide-react";

export const FileManagementView = ({ user }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Filters and pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [sortOrder, setSortOrder] = useState("NEWEST");
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const pageSize = 20;

  // Multi-selection state
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Modal states
  const [singleDeleteTarget, setSingleDeleteTarget] = useState(null);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Preview states
  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const [docxHtml, setDocxHtml] = useState(null);

  useEffect(() => {
    fetchDocuments();
  }, [currentPage, typeFilter, sortOrder]);

  const showToast = (message, type = "success") => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchDocuments = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    else setIsRefreshing(true);
    setError(null);

    try {
      const data = await getAdminDocuments({
        search: searchQuery,
        type: typeFilter,
        sort: sortOrder,
        page: currentPage,
        size: pageSize,
      });

      setDocuments(data?.content || []);
      setTotalPages(data?.totalPages || 1);
      setTotalElements(data?.totalElements || 0);
      setSelectedIds(new Set());
    } catch (err) {
      console.error("Failed to fetch documents:", err);
      setError("Unable to load shop documents. Please try again.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(0);
    fetchDocuments();
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (fileName = "", contentType = "") => {
    const fn = fileName.toLowerCase();
    const ct = (contentType || "").toLowerCase();

    if (ct.includes("pdf") || fn.endsWith(".pdf")) {
      return <FileText className="w-5 h-5 text-red-500" />;
    }
    if (ct.startsWith("image/") || fn.endsWith(".jpg") || fn.endsWith(".jpeg") || fn.endsWith(".png")) {
      return <ImageIcon className="w-5 h-5 text-blue-500" />;
    }
    if (ct.includes("word") || ct.includes("officedocument") || fn.endsWith(".doc") || fn.endsWith(".docx")) {
      return <FileType className="w-5 h-5 text-indigo-500" />;
    }
    return <Files className="w-5 h-5 text-neutral-600" />;
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === documents.length) {
      setSelectedIds(new Set());
    } else {
      const eligibleIds = documents.filter((d) => d.canDelete).map((d) => d.id);
      setSelectedIds(new Set(eligibleIds));
    }
  };

  const toggleSelectOne = (docId) => {
    const next = new Set(selectedIds);
    if (next.has(docId)) {
      next.delete(docId);
    } else {
      next.add(docId);
    }
    setSelectedIds(next);
  };

  // Delete Handlers
  const handleConfirmSingleDelete = async () => {
    if (!singleDeleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteAdminDocument(singleDeleteTarget.id);
      showToast(`Successfully deleted ${singleDeleteTarget.originalFileName}`);
      setSingleDeleteTarget(null);
      fetchDocuments(true);
    } catch (err) {
      console.error("Delete failed:", err);
      showToast(err.response?.data?.message || "Failed to delete document", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsDeleting(true);
    try {
      const result = await deleteAdminDocumentsBulk(Array.from(selectedIds));
      showToast(`Successfully deleted ${result?.deletedCount || selectedIds.size} files`);
      setShowBulkDeleteModal(false);
      setSelectedIds(new Set());
      fetchDocuments(true);
    } catch (err) {
      console.error("Bulk delete failed:", err);
      showToast(err.response?.data?.message || "Bulk deletion failed", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmDeleteAll = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteAllAdminDocuments();
      showToast(`Cleaned up ${result?.deletedCount || 0} files (${result?.skippedActiveCount || 0} active files preserved)`);
      setShowDeleteAllModal(false);
      setSelectedIds(new Set());
      fetchDocuments(true);
    } catch (err) {
      console.error("Delete all failed:", err);
      showToast(err.response?.data?.message || "Failed to delete all shop documents", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // Preview Handlers
  const handleOpenPreview = async (doc) => {
    if (!doc?.id) return;
    setPreviewDoc(doc);
    setIsPreviewLoading(true);
    setPreviewError(false);
    setDocxHtml(null);

    try {
      const url = await getDocumentPreviewUrl(doc.id, doc.contentType || "application/pdf");
      setPreviewUrl(url);

      const fn = doc.originalFileName.toLowerCase();
      if (fn.endsWith(".docx") || doc.contentType?.includes("officedocument.wordprocessingml")) {
        try {
          const response = await fetch(url);
          const arrayBuffer = await response.arrayBuffer();
          const result = await mammoth.convertToHtml({ arrayBuffer });
          setDocxHtml(result.value);
        } catch (mErr) {
          console.error("Mammoth preview failed:", mErr);
          setPreviewError(true);
        }
      }
    } catch (err) {
      console.error("Preview failed:", err);
      setPreviewError(true);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const closePreview = () => {
    if (previewUrl) {
      window.URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setPreviewDoc(null);
    setDocxHtml(null);
    setPreviewError(false);
  };

  // Storage calculation for current view
  const currentTotalBytes = documents.reduce((sum, d) => sum + (d.fileSize || 0), 0);
  const deletableCount = documents.filter((d) => d.canDelete).length;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-6 right-6 z-50 px-5 py-3.5 rounded-xl shadow-xl flex items-center gap-3 text-sm font-bold animate-in fade-in slide-in-from-top duration-200 ${
            toastMessage.type === "error"
              ? "bg-rose-600 text-white"
              : "bg-[#111111] text-white border border-neutral-700"
          }`}
        >
          {toastMessage.type === "error" ? (
            <AlertTriangle className="w-5 h-5 text-rose-200" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          )}
          <span>{toastMessage.message}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="p-1 hover:bg-white/20 rounded-lg ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner & Storage Overview */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#E2E2E2] shadow-2xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center text-[#111111] border border-neutral-200">
                <HardDrive className="w-5 h-5" />
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-[#111111] tracking-tight">
                Shop File Storage
              </h2>
            </div>
            <p className="text-sm text-[#6B6B6B] mt-1 font-medium">
              Manage, preview, and securely purge documents uploaded to your shop ({user?.shopName || "Your Shop"}).
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => fetchDocuments(false)}
              disabled={isRefreshing || loading}
              className="btn-secondary h-11 px-4 text-xs sm:text-sm flex items-center gap-2 font-bold"
              title="Refresh files"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={() => setShowDeleteAllModal(true)}
              disabled={totalElements === 0 || isDeleting}
              className="h-11 px-4 rounded-xl text-xs sm:text-sm font-bold bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>Purge All Shop Files</span>
            </button>
          </div>
        </div>

        {/* Storage Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200">
            <span className="text-xs text-[#6B6B6B] font-bold uppercase tracking-wider block">
              Total Shop Files
            </span>
            <span className="text-2xl font-extrabold text-[#111111] mt-1 block">
              {totalElements}
            </span>
          </div>

          <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200">
            <span className="text-xs text-[#6B6B6B] font-bold uppercase tracking-wider block">
              Page View Storage
            </span>
            <span className="text-2xl font-extrabold text-[#111111] mt-1 block">
              {formatBytes(currentTotalBytes)}
            </span>
          </div>

          <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200">
            <span className="text-xs text-[#6B6B6B] font-bold uppercase tracking-wider block">
              Safe to Purge
            </span>
            <span className="text-2xl font-extrabold text-emerald-700 mt-1 block">
              {deletableCount} of {documents.length}
            </span>
          </div>
        </div>
      </div>

      {/* Control Bar: Search & Filters */}
      <div className="bg-white rounded-2xl p-4 border border-[#E2E2E2] shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-neutral-400 pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by file name or order #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-10 pr-4 bg-neutral-50 border border-neutral-200 rounded-xl text-sm text-[#111111] placeholder-neutral-400 focus:outline-none focus:bg-white focus:border-[#111111] focus:ring-1 focus:ring-[#111111]"
          />
        </form>

        {/* Filter Dropdowns */}
        <div className="flex items-center gap-3 w-full md:w-auto flex-wrap sm:flex-nowrap justify-between md:justify-end">
          <div className="flex items-center gap-2 text-xs font-bold text-neutral-600">
            <Filter className="w-4 h-4 text-neutral-400" />
            <span>Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setCurrentPage(0);
              }}
              className="h-10 px-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold text-[#111111] focus:outline-none focus:border-[#111111]"
            >
              <option value="ALL">All Formats</option>
              <option value="PDF">PDF Documents</option>
              <option value="IMAGE">Images (JPG/PNG)</option>
              <option value="DOC">Word Docs (DOCX)</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-neutral-600">
            <ArrowUpDown className="w-4 h-4 text-neutral-400" />
            <span>Sort:</span>
            <select
              value={sortOrder}
              onChange={(e) => {
                setSortOrder(e.target.value);
                setCurrentPage(0);
              }}
              className="h-10 px-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold text-[#111111] focus:outline-none focus:border-[#111111]"
            >
              <option value="NEWEST">Newest Uploads</option>
              <option value="OLDEST">Oldest Uploads</option>
              <option value="SIZE_DESC">Largest File Size</option>
              <option value="SIZE_ASC">Smallest File Size</option>
            </select>
          </div>
        </div>
      </div>

      {/* Multi-Selection Action Strip */}
      {selectedIds.size > 0 && (
        <div className="bg-[#111111] text-white p-4 rounded-xl flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center font-bold text-xs">
              {selectedIds.size}
            </span>
            <span className="text-sm font-semibold">
              {selectedIds.size} {selectedIds.size === 1 ? "file" : "files"} selected
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-neutral-400 hover:text-white px-3 py-1.5 font-bold transition-colors"
            >
              Deselect All
            </button>
            <button
              onClick={() => setShowBulkDeleteModal(true)}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors shadow-md"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected</span>
            </button>
          </div>
        </div>
      )}

      {/* Files List Table */}
      <div className="bg-white rounded-2xl border border-[#E2E2E2] shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-[#111111]" />
            <p className="text-sm text-[#6B6B6B] font-medium animate-pulse">
              Loading shop documents...
            </p>
          </div>
        ) : error ? (
          <div className="p-8 text-center space-y-3">
            <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
            <p className="text-base font-bold text-[#111111]">{error}</p>
            <button onClick={() => fetchDocuments(false)} className="btn-secondary-sm mx-auto">
              Retry
            </button>
          </div>
        ) : documents.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Files className="w-12 h-12 text-neutral-300 mx-auto" />
            <p className="text-base font-bold text-[#111111]">No Documents Found</p>
            <p className="text-sm text-[#6B6B6B] max-w-sm mx-auto">
              {searchQuery || typeFilter !== "ALL"
                ? "No uploaded files match the current search filters."
                : "Your shop hasn't received or stored any customer print files yet."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-neutral-50/80 border-b border-[#E2E2E2] text-xs font-bold text-[#6B6B6B] uppercase tracking-wider">
                  <th className="py-4 pl-6 pr-3 w-12 text-center">
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="text-neutral-500 hover:text-neutral-900 transition-colors"
                      title="Select all deletable files"
                    >
                      {selectedIds.size === documents.length && documents.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-[#111111]" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="py-4 px-4">File Name</th>
                  <th className="py-4 px-4">Specs & Size</th>
                  <th className="py-4 px-4">Order Link</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-4">Uploaded</th>
                  <th className="py-4 pr-6 pl-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E2E2]">
                {documents.map((doc) => {
                  const isSelected = selectedIds.has(doc.id);
                  const isProcessing = doc.isProcessing || !doc.canDelete;

                  return (
                    <tr
                      key={doc.id}
                      className={`hover:bg-neutral-50/60 transition-colors ${
                        isSelected ? "bg-indigo-50/40" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-4 pl-6 pr-3 text-center">
                        <button
                          type="button"
                          onClick={() => toggleSelectOne(doc.id)}
                          disabled={isProcessing}
                          className={`text-neutral-400 hover:text-neutral-900 transition-colors ${
                            isProcessing ? "opacity-30 cursor-not-allowed" : ""
                          }`}
                          title={isProcessing ? "File is locked by an active order" : "Select file"}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-[#111111]" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* File Name & Format Icon */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3 min-w-0 max-w-xs sm:max-w-md">
                          <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center shrink-0 border border-neutral-200">
                            {getFileIcon(doc.originalFileName, doc.contentType)}
                          </div>
                          <div className="min-w-0">
                            <p
                              className="font-bold text-[#111111] truncate max-w-[220px] sm:max-w-[280px]"
                              title={doc.originalFileName}
                            >
                              {doc.originalFileName}
                            </p>
                            <span className="text-[11px] font-mono text-[#6B6B6B] uppercase">
                              {doc.contentType ? doc.contentType.split("/").pop() : "FILE"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Specs */}
                      <td className="py-4 px-4">
                        <div className="text-xs space-y-0.5">
                          <p className="font-bold text-[#111111]">{formatBytes(doc.fileSize)}</p>
                          <p className="text-[#6B6B6B] font-medium">
                            {doc.pageCount} {doc.pageCount === 1 ? "page" : "pages"}
                          </p>
                        </div>
                      </td>

                      {/* Order Info */}
                      <td className="py-4 px-4">
                        <div className="text-xs space-y-0.5">
                          <span className="font-mono font-bold text-[#111111] bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200">
                            {doc.orderNumber || "No Order"}
                          </span>
                          {doc.customerName && (
                            <p className="text-[#6B6B6B] truncate max-w-[120px]">
                              {doc.customerName}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        {isProcessing ? (
                          <span className="inline-flex items-center gap-1 text-xs font-extrabold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                            <Lock className="w-3 h-3" />
                            <span>In Print Queue</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Completed</span>
                          </span>
                        )}
                      </td>

                      {/* Upload Time */}
                      <td className="py-4 px-4 text-xs text-[#6B6B6B] font-medium whitespace-nowrap">
                        {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleString() : "Unknown"}
                      </td>

                      {/* Row Action Buttons */}
                      <td className="py-4 pr-6 pl-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenPreview(doc)}
                            className="p-2 text-neutral-600 hover:text-neutral-900 rounded-lg hover:bg-neutral-100 transition-colors border border-transparent hover:border-neutral-200"
                            title="Preview document"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => downloadDocumentFile(doc.id, doc.originalFileName)}
                            className="p-2 text-neutral-600 hover:text-neutral-900 rounded-lg hover:bg-neutral-100 transition-colors border border-transparent hover:border-neutral-200"
                            title="Download original file"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setSingleDeleteTarget(doc)}
                            disabled={isProcessing}
                            className={`p-2 rounded-lg transition-colors border ${
                              isProcessing
                                ? "text-neutral-300 border-transparent cursor-not-allowed"
                                : "text-neutral-500 hover:text-rose-600 hover:bg-rose-50 border-transparent hover:border-rose-200"
                            }`}
                            title={isProcessing ? "Cannot delete file in active print job" : "Delete file permanently"}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Server-Side Pagination Footer */}
        {!loading && totalPages > 1 && (
          <div className="px-6 py-4 border-t border-[#E2E2E2] bg-neutral-50 flex items-center justify-between">
            <p className="text-xs font-bold text-[#6B6B6B]">
              Showing page <strong className="text-[#111111]">{currentPage + 1}</strong> of{" "}
              <strong className="text-[#111111]">{totalPages}</strong> ({totalElements} total files)
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                disabled={currentPage === 0 || loading}
                className="btn-secondary-sm h-9 px-3 text-xs flex items-center gap-1 font-bold disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Prev</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={currentPage >= totalPages - 1 || loading}
                className="btn-secondary-sm h-9 px-3 text-xs flex items-center gap-1 font-bold disabled:opacity-40"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SINGLE FILE DELETE CONFIRMATION MODAL */}
      {singleDeleteTarget && (
        <div className="fixed inset-0 z-50 bg-neutral-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E2E2] shadow-2xl max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-[#111111]">Delete this file?</h3>
              <p className="text-sm text-[#6B6B6B]">
                Are you sure you want to permanently delete{" "}
                <strong className="text-[#111111] font-semibold">{singleDeleteTarget.originalFileName}</strong>?
              </p>
              <p className="text-xs text-rose-600 font-bold bg-rose-50 p-2.5 rounded-lg border border-rose-100">
                ⚠️ Warning: This will delete the physical file from server storage. This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSingleDeleteTarget(null)}
                disabled={isDeleting}
                className="btn-secondary h-11 px-4 text-sm font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSingleDelete}
                disabled={isDeleting}
                className="h-11 px-5 rounded-xl text-sm font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors flex items-center gap-2 shadow-sm"
              >
                {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Delete File</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK DELETE CONFIRMATION MODAL */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 z-50 bg-neutral-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E2E2] shadow-2xl max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-[#111111]">
                Delete {selectedIds.size} Selected Files?
              </h3>
              <p className="text-sm text-[#6B6B6B]">
                This will permanently purge the {selectedIds.size} selected documents from your shop storage.
              </p>
              <p className="text-xs text-rose-600 font-bold bg-rose-50 p-2.5 rounded-lg border border-rose-100">
                ⚠️ This operation is irreversible.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowBulkDeleteModal(false)}
                disabled={isDeleting}
                className="btn-secondary h-11 px-4 text-sm font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkDelete}
                disabled={isDeleting}
                className="h-11 px-5 rounded-xl text-sm font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors flex items-center gap-2 shadow-sm"
              >
                {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Delete ({selectedIds.size}) Files</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE ALL SHOP DOCUMENTS CONFIRMATION MODAL */}
      {showDeleteAllModal && (
        <div className="fixed inset-0 z-50 bg-neutral-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-rose-200 shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-xl bg-rose-100 border border-rose-300 flex items-center justify-center text-rose-700">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-extrabold text-[#111111]">
                Purge ALL Shop Documents?
              </h3>
              <p className="text-sm text-[#6B6B6B] leading-relaxed">
                This will permanently delete all completed and historical documents stored for shop{" "}
                <strong className="text-[#111111]">{user?.shopName}</strong>. Active print jobs will remain protected.
              </p>
              <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-xl text-xs text-rose-700 font-bold space-y-1">
                <p>⚠️ DANGER ZONE: This action is permanent and cannot be undone.</p>
                <p className="text-neutral-600 font-normal">
                  All customer files uploaded to your counter will be erased from server disk storage.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E2E2]">
              <button
                type="button"
                onClick={() => setShowDeleteAllModal(false)}
                disabled={isDeleting}
                className="btn-secondary h-11 px-4 text-sm font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAll}
                disabled={isDeleting}
                className="h-11 px-5 rounded-xl text-sm font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors flex items-center gap-2 shadow-lg shadow-rose-900/20"
              >
                {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Yes, Purge All Files</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DOCUMENT PREVIEW OVERLAY */}
      {previewDoc && (
        <div className="fixed inset-0 z-[60] bg-neutral-900/90 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-200">
          <div className="w-full max-w-6xl h-full max-h-[95vh] flex flex-col bg-white rounded-2xl overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200 m-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E2E2] bg-neutral-50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-neutral-200 flex items-center justify-center text-neutral-700">
                  {getFileIcon(previewDoc.originalFileName, previewDoc.contentType)}
                </div>
                <div>
                  <h3 className="font-bold text-[#111111] text-base truncate max-w-md">
                    {previewDoc.originalFileName}
                  </h3>
                  <p className="text-xs text-[#6B6B6B] uppercase tracking-wider">
                    {previewDoc.contentType || "Document Preview"} · {formatBytes(previewDoc.fileSize)}
                  </p>
                </div>
              </div>
              <button
                onClick={closePreview}
                className="p-2 text-neutral-500 hover:text-neutral-900 rounded-xl hover:bg-neutral-200 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 bg-neutral-100 flex items-center justify-center overflow-hidden relative">
              {isPreviewLoading && !previewError && (
                <div className="flex flex-col items-center justify-center text-neutral-500 space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
                  <p className="font-medium">Loading document securely...</p>
                </div>
              )}

              {previewError && (
                <div className="flex flex-col items-center justify-center text-neutral-500 space-y-4 max-w-sm text-center">
                  <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center">
                    <X className="w-8 h-8 text-rose-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#111111]">Preview Failed</h3>
                    <p className="text-sm mt-1 text-[#6B6B6B]">
                      The document could not be rendered for preview. Please download it directly.
                    </p>
                  </div>
                  <button onClick={closePreview} className="btn-secondary mt-4 w-full">
                    Close Preview
                  </button>
                </div>
              )}

              {!isPreviewLoading && !previewError && previewUrl && (() => {
                const isImage = (previewDoc.contentType || "").startsWith("image/");
                const isPdf = (previewDoc.contentType || "").includes("pdf") || previewDoc.originalFileName.toLowerCase().endsWith(".pdf");
                const isDocx = previewDoc.originalFileName.toLowerCase().endsWith(".docx") || (previewDoc.contentType || "").includes("officedocument.wordprocessingml");

                if (isImage) {
                  return (
                    <div className="w-full h-full p-8 flex items-center justify-center bg-neutral-100 overflow-auto">
                      <img
                        src={previewUrl}
                        alt={previewDoc.originalFileName}
                        className="max-w-full max-h-full object-contain rounded shadow-sm"
                      />
                    </div>
                  );
                }

                if (isPdf) {
                  return (
                    <iframe
                      src={`${previewUrl}#toolbar=0&navpanes=0`}
                      className="w-full h-full border-none bg-neutral-200"
                      title={previewDoc.originalFileName}
                    />
                  );
                }

                if (isDocx && docxHtml !== null) {
                  return (
                    <div className="w-full h-full overflow-y-auto bg-neutral-200/50 p-4 sm:p-8 flex justify-center">
                      <div
                        className="bg-white p-8 sm:p-12 shadow-md max-w-4xl w-full min-h-full docx-preview-container text-[#111111]"
                        dangerouslySetInnerHTML={{
                          __html: docxHtml || "<p>Empty document.</p>",
                        }}
                      />
                    </div>
                  );
                }

                return (
                  <div className="flex flex-col items-center justify-center text-neutral-500 space-y-4 max-w-sm text-center">
                    <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center">
                      <FileWarning className="w-8 h-8 text-amber-500" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-[#111111]">Preview Not Available</h3>
                      <p className="text-sm mt-1 text-[#6B6B6B]">
                        This file type cannot be rendered inline in browser.
                      </p>
                    </div>
                    <button
                      onClick={() => downloadDocumentFile(previewDoc.id, previewDoc.originalFileName)}
                      className="btn-primary mt-4 w-full"
                    >
                      <Download className="w-5 h-5 mr-1" />
                      Download File
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
