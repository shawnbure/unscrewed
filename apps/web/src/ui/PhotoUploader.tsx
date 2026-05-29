import { useRef, useState } from "react";
import { api, API_BASE } from "../lib/api.js";
import { photoUrl } from "../lib/photoUrl.js";

interface UploadedPhoto {
  key: string;
  /** local preview URL for the file (object URL); cleared after first server read */
  previewUrl?: string;
}

interface Props {
  value: string[];
  onChange: (keys: string[]) => void;
  max?: number;
  className?: string;
}

const MAX_BYTES = 8 * 1024 * 1024;

export function PhotoUploader({
  value,
  onChange,
  max = 8,
  className = "",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [uploading, setUploading] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [previews, setPreviews] = useState<Record<string, string>>({});

  async function handleFiles(files: FileList | File[]) {
    setError(null);
    const list = Array.from(files);
    if (value.length + list.length > max) {
      setError(`You can upload up to ${max} photos`);
      return;
    }
    const newKeys: string[] = [];
    const newPreviews: Record<string, string> = {};
    setUploading(list.length);
    for (const file of list) {
      if (!file.type.startsWith("image/")) {
        setError(`${file.name} isn't an image`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        setError(`${file.name} is over 8 MB`);
        continue;
      }
      try {
        const { key, uploadUrl } = await api<{
          key: string;
          uploadUrl: string;
        }>("/listings/photos/presign", { method: "POST" });
        // uploadUrl from server is path-relative (e.g. "/listings/photos/<key>")
        const url = uploadUrl.startsWith("http")
          ? uploadUrl
          : `${API_BASE}${uploadUrl}`;
        const res = await fetch(url, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
        newKeys.push(key);
        newPreviews[key] = URL.createObjectURL(file);
      } catch (e: any) {
        setError(e?.message ?? "Upload failed");
      }
      setUploading((u) => u - 1);
    }
    setPreviews((p) => ({ ...p, ...newPreviews }));
    onChange([...value, ...newKeys]);
  }

  function removeAt(idx: number) {
    const next = value.slice();
    const [removed] = next.splice(idx, 1);
    if (removed && previews[removed]) {
      URL.revokeObjectURL(previews[removed]);
      const p = { ...previews };
      delete p[removed];
      setPreviews(p);
    }
    onChange(next);
  }

  function move(idx: number, dir: -1 | 1) {
    const next = value.slice();
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j]!, next[idx]!];
    onChange(next);
  }

  return (
    <div className={className}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
          drag
            ? "border-brand-500 bg-brand-50"
            : "border-sand-300 bg-white hover:border-brand-400 hover:bg-brand-50/40"
        }`}
        role="button"
        tabIndex={0}
      >
        <div className="text-3xl" aria-hidden>
          📸
        </div>
        <p className="mt-2 text-sm font-medium text-ink-700">
          Drop photos here or <span className="text-brand-700">click to upload</span>
        </p>
        <p className="mt-1 text-xs text-ink-400">
          JPG / PNG / WebP, up to 8 MB each — {max - value.length} slot
          {max - value.length === 1 ? "" : "s"} left
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {uploading > 0 && (
        <p className="mt-2 text-sm text-ink-500">
          Uploading {uploading} photo{uploading === 1 ? "" : "s"}…
        </p>
      )}

      {value.length > 0 && (
        <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {value.map((key, idx) => (
            <li
              key={key}
              className="card group relative aspect-square overflow-hidden"
            >
              <img
                src={previews[key] ?? photoUrl(key)}
                alt={`Photo ${idx + 1}`}
                className="h-full w-full object-cover"
              />
              {idx === 0 && (
                <span className="absolute left-1.5 top-1.5 chip-brand">
                  Cover
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => move(idx, -1)}
                    disabled={idx === 0}
                    className="rounded-md bg-white/90 px-1.5 text-xs text-ink-900 disabled:opacity-30"
                    aria-label="Move left"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() => move(idx, 1)}
                    disabled={idx === value.length - 1}
                    className="rounded-md bg-white/90 px-1.5 text-xs text-ink-900 disabled:opacity-30"
                    aria-label="Move right"
                  >
                    →
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => removeAt(idx)}
                  className="rounded-md bg-red-500/95 px-2 py-0.5 text-xs text-white"
                  aria-label="Remove"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
