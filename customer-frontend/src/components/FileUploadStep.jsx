import React, { useRef, useState } from "react";
import { uploadDocument } from "../api";
import mammoth from "mammoth";
import {
  Upload,
  FileText,
  Image,
  File,
  X,
  ArrowRight,
  Loader2,
  AlertCircle,
  Plus,
  RefreshCw,
  CheckCircle2,
  Eye,
  FileWarning,
} from "lucide-react";

export const FileUploadStep = ({ items, onItemsChange, onContinue }) => {
  const [globalError, setGlobalError] = useState(null);
  const fileInputRef = useRef(null);

  const [previewFile, setPreviewFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewType, setPreviewType] = useState("");
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const [docxHtml, setDocxHtml] = useState(null);

  const defaultSpecs = {
    printType: "PRINT",
    colorMode: "BW",
    paperSize: "A4",
    printSide: "SINGLE",
    pageRangeOption: "ALL",
    customPageRange: "",
    copies: 1,
  };

  const handleFilesSelected = async (filesList) => {
    if (!filesList || filesList.length === 0) return;
    setGlobalError(null);

    const newFiles = Array.from(filesList);
    const updatedItems = [...items];

    for (const file of newFiles) {
      if (file.size > 20 * 1024 * 1024) {
        setGlobalError(`"${file.name}" exceeds the 20 MB file size limit.`);
        continue;
      }

      const localItem = {
        localId: "file_" + Math.random().toString(36).substring(2, 9),
        file,
        uploadStatus: "UPLOADING",
        settings: { ...defaultSpecs },
      };

      updatedItems.push(localItem);
      uploadSingleFile(localItem, updatedItems);
    }

    onItemsChange([...updatedItems]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadSingleFile = async (item, currentList) => {
    if (!item.file) return;

    try {
      const uploadedDoc = await uploadDocument(item.file);
      item.uploadedDocument = uploadedDoc;
      item.uploadStatus = "COMPLETE";
      item.error = undefined;
    } catch (err) {
      item.uploadStatus = "FAILED";
      item.error = err.response?.data?.message || "Upload failed";
    } finally {
      onItemsChange([...currentList]);
    }
  };

  const handleRetryUpload = (itemToRetry) => {
    itemToRetry.uploadStatus = "UPLOADING";
    itemToRetry.error = undefined;
    onItemsChange([...items]);
    uploadSingleFile(itemToRetry, items);
  };

  const handleRemoveItem = (localId) => {
    const filtered = items.filter((i) => i.localId !== localId);
    onItemsChange(filtered);
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "";
    if (bytes < 1024 * 1024) {
      return (bytes / 1024).toFixed(1) + " KB";
    }
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const handlePreview = async (file) => {
    if (!file) return;
    try {
      setPreviewFile(file);
      setPreviewType(file.type);
      setIsPreviewLoading(true);
      setPreviewError(false);
      setDocxHtml(null);

      const url = URL.createObjectURL(file);
      setPreviewUrl(url);

      const isDocx =
        file.name.toLowerCase().endsWith(".docx") ||
        file.type ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

      if (isDocx) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const result = await mammoth.convertToHtml({ arrayBuffer });
          setDocxHtml(result.value);
        } catch (docxErr) {
          console.error("Mammoth docx conversion failed:", docxErr);
          setPreviewError(true);
        }
      }
    } catch (err) {
      console.error("Failed to load preview:", err);
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
    setPreviewFile(null);
    setPreviewType("");
    setDocxHtml(null);
  };

  const allCompleted =
    items.length > 0 && items.every((i) => i.uploadStatus === "COMPLETE");
  const isAnyUploading = items.some((i) => i.uploadStatus === "UPLOADING");

  return (
    <div className="space-y-8">
      {/* Editorial Title */}
      <div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-[#111111] tracking-tight">
          Upload Documents
        </h2>
        <p className="text-base text-[#6B6B6B] mt-2 font-medium">
          Select one or multiple PDF / image files to send directly to the shop
          counter printer.
        </p>
      </div>

      {globalError && (
        <div className="p-5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-semibold flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{globalError}</span>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={(e) => handleFilesSelected(e.target.files)}
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
        className="hidden"
      />

      {/* Upload Zone when empty */}
      {items.length === 0 ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFilesSelected(e.dataTransfer.files);
          }}
          className="min-h-[240px] border-2 border-dashed border-[#D8D8D8] hover:border-[#111111] rounded-2xl p-10 text-center cursor-pointer transition-all bg-white flex flex-col justify-center items-center gap-5 shadow-2xs"
        >
          <div className="w-16 h-16 rounded-2xl bg-neutral-100 text-[#111111] flex items-center justify-center border border-neutral-200">
            <Upload className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <p className="text-lg sm:text-xl font-extrabold text-[#111111]">
              Tap or drag files to upload
            </p>
            <p className="text-sm sm:text-base text-[#6B6B6B]">
              Supports multiple PDF, DOCX, JPG, PNG files up to 20 MB each
            </p>
          </div>
        </div>
      ) : (
        /* List of Uploaded Items */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#111111] uppercase tracking-wider">
              {items.length} {items.length === 1 ? "file" : "files"} selected
            </span>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 text-sm font-bold text-[#111111] hover:underline"
            >
              <Plus className="w-4 h-4" />
              <span>Add More Files</span>
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item) => {
              const fileName =
                item.uploadedDocument?.originalFileName ||
                item.file?.name ||
                "Document";
              const fileSize =
                item.uploadedDocument?.fileSize || item.file?.size || 0;
              const pageCount = item.uploadedDocument?.pageCount;

              return (
                <div
                  key={item.localId}
                  className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E2E2E2] flex items-center justify-between gap-3 sm:gap-4 shadow-2xs"
                >
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-neutral-100 text-[#111111] flex items-center justify-center shrink-0 border border-neutral-200">
                      {fileName.endsWith(".pdf") ? (
                        <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
                      ) : fileName.match(/\.(jpg|jpeg|png)$/i) ? (
                        <Image className="w-5 h-5 sm:w-6 sm:h-6" />
                      ) : (
                        <File className="w-5 h-5 sm:w-6 sm:h-6" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm sm:text-lg font-bold text-[#111111] truncate">
                        {fileName}
                      </p>
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-[#6B6B6B] mt-0.5 font-medium">
                        <span>{formatFileSize(fileSize)}</span>
                        {pageCount !== undefined && (
                          <>
                            <span>·</span>
                            <span className="font-bold text-[#111111]">
                              {pageCount} {pageCount === 1 ? "page" : "pages"}
                            </span>
                          </>
                        )}

                        {item.uploadStatus === "UPLOADING" && (
                          <span className="inline-flex items-center gap-1.5 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md font-semibold text-xs border border-amber-200">
                            <Loader2 className="w-3 h-3 animate-spin" />{" "}
                            Uploading...
                          </span>
                        )}

                        {item.uploadStatus === "COMPLETE" && (
                          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-semibold text-xs border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />{" "}
                            Complete
                          </span>
                        )}

                        {item.uploadStatus === "FAILED" && (
                          <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md font-semibold text-xs border border-rose-200">
                            <AlertCircle className="w-3 h-3 text-rose-600" />{" "}
                            Upload Failed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.file && (
                      <button
                        type="button"
                        onClick={() => item.file && handlePreview(item.file)}
                        className="btn-secondary-sm h-10 px-3.5 text-xs flex items-center gap-1.5 border-none"
                        title="Preview file"
                      >
                        <Eye className="w-4 h-4 text-neutral-600" />
                        <span className="hidden sm:inline">Preview</span>
                      </button>
                    )}

                    {item.uploadStatus === "FAILED" && (
                      <button
                        type="button"
                        onClick={() => handleRetryUpload(item)}
                        className="inline-flex items-center gap-1 px-3 py-2 text-xs font-bold text-[#111111] bg-neutral-100 hover:bg-neutral-200 rounded-lg border border-neutral-300 transition-colors"
                        title="Retry upload"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Retry</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.localId)}
                      className="p-2.5 text-neutral-400 hover:text-neutral-900 rounded-xl hover:bg-neutral-100 transition-colors"
                      title="Remove file"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="btn-secondary w-full h-13 border-dashed border-[#D8D8D8] text-base font-bold flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            <span>Add More Files</span>
          </button>
        </div>
      )}

      {items.length > 0 && (
        <button
          type="button"
          disabled={!allCompleted || isAnyUploading}
          onClick={onContinue}
          className="btn-primary w-full h-14 font-bold"
        >
          {isAnyUploading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" /> Uploading files...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <span>
                Continue to Print Options ({items.length}{" "}
                {items.length === 1 ? "file" : "files"})
              </span>
              <ArrowRight className="w-5 h-5" />
            </span>
          )}
        </button>
      )}

      {/* Document Preview Overlay */}
      {previewFile && (
        <div className="fixed inset-0 z-[60] bg-neutral-900/90 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-200">
          <div className="w-full max-w-6xl h-full max-h-[95vh] flex flex-col bg-white rounded-2xl overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200 m-2 sm:m-4">
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-[#E2E2E2] bg-neutral-50 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-neutral-200 flex items-center justify-center text-neutral-700 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-[#111111] text-sm sm:text-base truncate">
                    {previewFile.name}
                  </h3>
                  <p className="text-[10px] sm:text-xs text-[#6B6B6B] uppercase tracking-wider truncate">
                    {previewType || "Document Preview"}
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
                    <h3 className="text-lg font-bold text-[#111111]">
                      Preview Failed
                    </h3>
                    <p className="text-sm mt-1 text-[#6B6B6B]">
                      The document could not be loaded for preview.
                    </p>
                  </div>
                  <button
                    onClick={closePreview}
                    className="btn-secondary mt-4 w-full"
                  >
                    Close Preview
                  </button>
                </div>
              )}

              {!isPreviewLoading &&
                !previewError &&
                previewUrl &&
                (() => {
                  const isImage = previewType.startsWith("image/");
                  const isPdf =
                    previewType === "application/pdf" ||
                    previewFile.name.toLowerCase().endsWith(".pdf");
                  const isDocx =
                    previewFile.name.toLowerCase().endsWith(".docx") ||
                    previewType ===
                      "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
                  const isUnsupported = !isImage && !isPdf && !isDocx;

                  if (isImage) {
                    return (
                      <div className="w-full h-full p-8 flex items-center justify-center bg-neutral-100 overflow-auto">
                        <img
                          src={previewUrl}
                          alt={previewFile.name}
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
                        title={previewFile.name}
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

                  if (isUnsupported || (isDocx && docxHtml === null)) {
                    return (
                      <div className="flex flex-col items-center justify-center text-neutral-500 space-y-4 max-w-sm text-center">
                        <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center">
                          <FileWarning className="w-8 h-8 text-amber-500" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-[#111111]">
                            Preview Not Available
                          </h3>
                          <p className="text-sm mt-1 text-[#6B6B6B]">
                            This file type (
                            {previewFile.name.split(".").pop()?.toUpperCase() ||
                              "Unknown"}
                            ) cannot be securely previewed in the browser.
                          </p>
                        </div>
                      </div>
                    );
                  }

                  return null;
                })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
