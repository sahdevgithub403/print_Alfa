import React from "react";
import { FileText, UserSquare2, ChevronRight } from "lucide-react";

export const JobTypeSelectionStep = ({ onSelect }) => {
  return (
    <div className="space-y-6 max-w-lg mx-auto py-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-[#111111] tracking-tight">
          What do you want to print?
        </h2>
        <p className="text-base text-[#6B6B6B] font-medium">
          Select the type of print job you need.
        </p>
      </div>

      <div className="grid gap-4 mt-8">
        <button
          onClick={() => onSelect("DOCUMENT")}
          className="group text-left p-6 bg-white rounded-2xl border-2 border-[#E2E2E2] hover:border-brand-500 hover:bg-brand-50/50 transition-all flex items-center justify-between shadow-sm"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-neutral-100 group-hover:bg-white text-[#111111] flex items-center justify-center shrink-0 border border-neutral-200">
              <FileText className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#111111] group-hover:text-brand-900">
                Document Printing
              </h3>
              <p className="text-sm text-[#6B6B6B] mt-1 font-medium">
                Print PDFs, Word files, assignments, etc.
              </p>
            </div>
          </div>
          <ChevronRight className="w-6 h-6 text-neutral-400 group-hover:text-brand-600 transition-colors" />
        </button>

        <button
          onClick={() => onSelect("PASSPORT_PHOTO")}
          className="group text-left p-6 bg-white rounded-2xl border-2 border-[#E2E2E2] hover:border-brand-500 hover:bg-brand-50/50 transition-all flex items-center justify-between shadow-sm"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-neutral-100 group-hover:bg-white text-[#111111] flex items-center justify-center shrink-0 border border-neutral-200">
              <UserSquare2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#111111] group-hover:text-brand-900">
                Passport Photo
              </h3>
              <p className="text-sm text-[#6B6B6B] mt-1 font-medium">
                Upload a photo and get passport size prints.
              </p>
            </div>
          </div>
          <ChevronRight className="w-6 h-6 text-neutral-400 group-hover:text-brand-600 transition-colors" />
        </button>
      </div>
    </div>
  );
};
