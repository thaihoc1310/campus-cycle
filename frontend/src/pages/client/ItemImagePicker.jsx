import { useEffect, useMemo, useRef } from 'react';
import { ImagePlus, UploadCloud, X } from 'lucide-react';
import Button from '../../components/ui/Button.jsx';

export default function ItemImagePicker({ files, onChange, maxFiles = 6 }) {
  const inputRef = useRef(null);
  const previews = useMemo(
    () => files.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [files],
  );

  useEffect(() => () => {
    previews.forEach((preview) => URL.revokeObjectURL(preview.url));
  }, [previews]);

  const addFiles = (fileList) => {
    const selected = Array.from(fileList || []).filter((file) => file.type.startsWith('image/'));
    if (!selected.length) return;
    onChange([...files, ...selected].slice(0, maxFiles));
  };

  const removeFile = (index) => {
    onChange(files.filter((_, fileIndex) => fileIndex !== index));
  };

  const openPicker = () => {
    inputRef.current?.click();
  };

  const handleDrop = (event) => {
    event.preventDefault();
    addFiles(event.dataTransfer.files);
  };

  return (
    <section className="client-image-picker" onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(event) => {
          addFiles(event.target.files);
          event.target.value = '';
        }}
      />

      <div className="client-image-picker__header">
        <div>
          <span className="input-label">Photos</span>
          <p className="text-muted">{files.length}/{maxFiles} selected</p>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={openPicker} disabled={files.length >= maxFiles}>
          <ImagePlus size={16} />
          Add Photos
        </Button>
      </div>

      {previews.length ? (
        <div className="client-image-preview-grid">
          {previews.map((preview, index) => (
            <div key={`${preview.file.name}-${preview.file.lastModified}-${index}`} className="client-image-preview">
              <img src={preview.url} alt={preview.file.name} />
              <button type="button" onClick={() => removeFile(index)} aria-label={`Remove ${preview.file.name}`}>
                <X size={15} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <button type="button" className="client-image-dropzone" onClick={openPicker}>
          <UploadCloud size={30} />
          <span>Add item photos</span>
        </button>
      )}
    </section>
  );
}
