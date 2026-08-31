import type { ReactNode } from "react";

type MediaDropzoneProps = {
  accept: string;
  children: ReactNode;
  disabled?: boolean;
  multiple?: boolean;
  onFiles: (files: FileList) => void;
};

export function MediaDropzone({
  accept,
  children,
  disabled = false,
  multiple = false,
  onFiles,
}: MediaDropzoneProps) {
  return (
    <label
      className={`grid min-h-36 place-items-center rounded-2xl border border-dashed border-gold/40 bg-gold/5 p-4 text-center ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
      onDragOver={(event) => {
        if (!disabled) event.preventDefault();
      }}
      onDrop={(event) => {
        event.preventDefault();
        if (!disabled && event.dataTransfer.files.length) onFiles(event.dataTransfer.files);
      }}
    >
      <input
        className="sr-only"
        type="file"
        multiple={multiple}
        accept={accept}
        disabled={disabled}
        onChange={(event) => {
          if (event.target.files?.length) onFiles(event.target.files);
          event.currentTarget.value = "";
        }}
      />
      {children}
    </label>
  );
}
