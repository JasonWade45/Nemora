'use client';

import React, { useCallback, useRef, useState } from 'react';
import { Upload, X, FileSpreadsheet, FileText } from 'lucide-react';

interface FileUploadProps {
  accept?: string[];
  maxSizeMB?: number;
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

const DEFAULT_ACCEPT = ['.xlsx', '.xls', '.csv'];

export function FileUpload({
  accept = DEFAULT_ACCEPT,
  maxSizeMB = 10,
  onFileSelect,
  disabled = false,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback(
    (file: File): boolean => {
      setError(null);

      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!accept.includes(ext)) {
        setError(`Invalid file type. Accepted: ${accept.join(', ')}`);
        return false;
      }

      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`File too large. Maximum size: ${maxSizeMB}MB`);
        return false;
      }

      return true;
    },
    [accept, maxSizeMB]
  );

  const handleFile = useCallback(
    (file: File) => {
      if (validateFile(file)) {
        onFileSelect(file);
      }
    },
    [validateFile, onFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (disabled) return;

      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [disabled, handleFile]
  );

  const handleClick = () => {
    if (!disabled) inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const FileIcon = accept.some((a) => a.includes('xls') || a.includes('csv'))
    ? FileSpreadsheet
    : FileText;

  return (
    <div>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
          transition-all duration-200
          ${isDragging
            ? 'border-pharma-500 bg-pharma-50'
            : 'border-slate-300 hover:border-pharma-400 hover:bg-slate-50'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept.join(',')}
          onChange={handleChange}
          className="hidden"
          disabled={disabled}
        />
        <div className="flex flex-col items-center gap-3">
          <div
            className={`p-3 rounded-full ${
              isDragging ? 'bg-pharma-100' : 'bg-slate-100'
            }`}
          >
            {isDragging ? (
              <Upload className="w-6 h-6 text-pharma-600" />
            ) : (
              <FileIcon className="w-6 h-6 text-slate-400" />
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700">
              {isDragging ? 'Drop file here' : 'Click to browse or drag and drop'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {accept.join(', ').toUpperCase()} up to {maxSizeMB}MB
            </p>
          </div>
        </div>
      </div>
      {error && (
        <div className="mt-2 flex items-center gap-1.5 text-sm text-danger-600">
          <X className="w-3.5 h-3.5" />
          {error}
        </div>
      )}
    </div>
  );
}
