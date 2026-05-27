import { useState, useEffect, useRef } from 'react';
import { Star, Trash2, Upload, Image as ImageIcon } from 'lucide-react';
import api from '../../api/client';
import { useToast } from '../ui/Toast.jsx';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import './ImageGalleryModal.css';

export default function ImageGalleryModal({ isOpen, onClose, entityType, entityId, entityTitle }) {
  const toast = useToast();
  const fileRef = useRef(null);
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);

  const basePath = entityType === 'item' ? '/items' : '/campaigns';

  const fetchImages = async () => {
    if (!entityId) return;
    try {
      const res = await api.get(`${basePath}/${entityId}/images`);
      setImages(res.data);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    if (isOpen && entityId) fetchImages();
  }, [isOpen, entityId]);

  const handleUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    try {
      await api.post(`${basePath}/${entityId}/images`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast(`${files.length} image(s) uploaded successfully!`, 'success');
      fetchImages();
    } catch (err) {
      toast(err.response?.data?.detail || 'Upload failed', 'error');
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSetMain = async (imageId) => {
    try {
      await api.put(`${basePath}/images/${imageId}/main`);
      toast('Main image updated!', 'success');
      fetchImages();
    } catch (err) {
      toast(err.response?.data?.detail || 'Failed to set main image', 'error');
    }
  };

  const handleDelete = async (imageId) => {
    try {
      await api.delete(`${basePath}/images/${imageId}`);
      toast('Image deleted!', 'success');
      fetchImages();
    } catch (err) {
      toast(err.response?.data?.detail || 'Failed to delete image', 'error');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Gallery — ${entityTitle || ''}`} size="lg">
      <div className="gallery-modal">
        <div className="gallery-toolbar">
          <span className="gallery-count">{images.length} image(s)</span>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={handleUpload}
          />
          <Button variant="primary" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
            <Upload size={16} />
            {uploading ? 'Uploading...' : 'Upload Images'}
          </Button>
        </div>

        {images.length === 0 ? (
          <div className="gallery-empty">
            <ImageIcon size={48} strokeWidth={1.5} />
            <p>No images yet</p>
          </div>
        ) : (
          <div className="gallery-grid">
            {images.map((img) => (
              <div key={img.id} className={`gallery-item ${img.is_main ? 'gallery-item--main' : ''}`}>
                <img src={img.image_path} alt="" className="gallery-item__img" />
                {img.is_main && <span className="gallery-item__badge">Main</span>}
                <div className="gallery-item__overlay">
                  <button
                    className="gallery-action"
                    title="Set as main"
                    onClick={() => handleSetMain(img.id)}
                    disabled={img.is_main}
                  >
                    <Star size={16} fill={img.is_main ? '#F59E0B' : 'none'} color={img.is_main ? '#F59E0B' : '#fff'} />
                  </button>
                  <button className="gallery-action gallery-action--danger" title="Delete" onClick={() => handleDelete(img.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
