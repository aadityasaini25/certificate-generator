"use client";

import { useId, useRef, useState, type DragEvent } from "react";
import { FileText, Paperclip, UploadCloud, X } from "lucide-react";

import { UPLOAD_ACCEPT_ATTRIBUTE } from "@/lib/constants";
import { cn, formatFileSize } from "@/lib/utils";

/**
 * Drag-and-drop document picker.
 *
 * Keyboard-accessible: the visible drop area is a real <button>, and the file
 * input stays in the DOM (visually hidden) so assistive technology and form
 * submission both behave normally.
 */

export interface FileDropzoneProps {
  label: string;
  helpText: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}

export function FileDropzone({
  label,
  helpText,
  file,
  onFileChange,
  error,
  required = false,
  disabled = false,
}: FileDropzoneProps) {
  const inputId = useId();
  const errorId = error ? `${inputId}-error` : undefined;
  const helpId = `${inputId}-help`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDraggingOver(false);
    if (disabled) return;

    const dropped = event.dataTransfer.files?.[0];
    if (dropped) {
      onFileChange(dropped);
    }
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (!disabled) setIsDraggingOver(true);
  }

  function clearFile() {
    onFileChange(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <span className="block text-sm font-medium text-ink">
        {label}
        {required ? (
          <span className="ml-0.5 text-status-danger" aria-hidden>
            *
          </span>
        ) : null}
        {required ? <span className="sr-only"> (required)</span> : null}
      </span>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={() => setIsDraggingOver(false)}
        className={cn(
          "rounded-card border-2 border-dashed transition-colors",
          isDraggingOver
            ? "border-brand-500 bg-brand-50"
            : "border-line-strong bg-surface-muted",
          error && !isDraggingOver && "border-status-danger bg-status-danger-bg",
          disabled && "opacity-60",
        )}
      >
        {file ? (
          <div className="flex flex-wrap items-center gap-3 p-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-control bg-surface text-brand-700 shadow-card">
              <FileText aria-hidden className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">
                {file.name}
              </p>
              <p className="text-xs text-ink-muted">
                {formatFileSize(file.size)}
              </p>
            </div>
            <button
              type="button"
              onClick={clearFile}
              disabled={disabled}
              className="inline-flex items-center gap-1.5 rounded-control px-2.5 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:bg-surface hover:text-status-danger disabled:cursor-not-allowed"
            >
              <X aria-hidden className="size-4" />
              Remove
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
            aria-describedby={[helpId, errorId].filter(Boolean).join(" ")}
            className="flex w-full flex-col items-center justify-center gap-2 px-6 py-9 text-center disabled:cursor-not-allowed"
          >
            <span className="flex size-11 items-center justify-center rounded-full bg-surface text-brand-700 shadow-card">
              <UploadCloud aria-hidden className="size-5" />
            </span>
            <span className="text-sm font-medium text-ink">
              Drag and drop your file here, or{" "}
              <span className="text-brand-700 underline underline-offset-4">
                browse
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
              <Paperclip aria-hidden className="size-3.5" />
              PDF or ZIP
            </span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={UPLOAD_ACCEPT_ATTRIBUTE}
        disabled={disabled}
        className="sr-only"
        onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
      />

      <p id={helpId} className="text-xs leading-relaxed text-ink-muted">
        {helpText}
      </p>

      {error ? (
        <p id={errorId} className="text-sm text-status-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
