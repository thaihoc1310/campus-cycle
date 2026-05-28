import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, Package } from 'lucide-react';
import Modal from '../../components/ui/Modal.jsx';
import './Client.css';

function imagePath(image) {
  return typeof image === 'string' ? image : image?.image_path;
}

export default function ClientImageGallery({ images = [], title = 'Image', fallbackIcon = <Package size={72} />, variant = 'default' }) {
  const paths = useMemo(() => images.map(imagePath).filter(Boolean), [images]);
  const stripRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [stripControls, setStripControls] = useState({ prev: false, next: false });
  const activePath = paths[activeIndex];
  const collageExtraCount = Math.max(0, paths.length - 5);

  const updateStripControls = useCallback(() => {
    const strip = stripRef.current;
    if (!strip) {
      setStripControls({ prev: false, next: false });
      return;
    }

    const maxScroll = strip.scrollWidth - strip.clientWidth;
    setStripControls({
      prev: strip.scrollLeft > 2,
      next: maxScroll > 2 && strip.scrollLeft < maxScroll - 2,
    });
  }, []);

  useEffect(() => {
    setActiveIndex(0);
    setLightboxOpen(false);
  }, [paths.join('|')]);

  useEffect(() => {
    if (variant !== 'strip') return undefined;
    const strip = stripRef.current;
    if (!strip) return undefined;

    const update = () => updateStripControls();
    const frame = window.requestAnimationFrame(update);
    strip.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.cancelAnimationFrame(frame);
      strip.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [paths.length, updateStripControls, variant]);

  if (!paths.length) {
    return (
      <div className="client-image-gallery client-image-gallery--empty">
        <div className="client-image-gallery__main">
          {fallbackIcon}
        </div>
      </div>
    );
  }

  if (variant === 'collage') {
    return (
      <div className="client-image-collage">
        <button type="button" className="client-image-collage__main" onClick={() => { setActiveIndex(0); setLightboxOpen(true); }} aria-label={`Open ${title} main image`}>
          <img src={paths[0]} alt={title} />
        </button>

        {paths.length > 1 && (
          <div className="client-image-collage__side">
            {paths.slice(1, 5).map((path, index) => {
              const imageIndex = index + 1;
              const showExtra = index === 3 && collageExtraCount > 0;
              return (
                <button
                  key={`${path}-${imageIndex}`}
                  type="button"
                  className="client-image-collage__tile"
                  onClick={() => { setActiveIndex(imageIndex); setLightboxOpen(true); }}
                  aria-label={`Open ${title} image ${imageIndex + 1}`}
                >
                  <img src={path} alt="" />
                  {showExtra && <span>+{collageExtraCount}</span>}
                </button>
              );
            })}
          </div>
        )}

        <Modal isOpen={lightboxOpen} onClose={() => setLightboxOpen(false)} title={title} size="xl">
          <div className="client-image-lightbox">
            <img src={activePath} alt={title} />
          </div>
        </Modal>
      </div>
    );
  }

  if (variant === 'strip') {
    const scrollStrip = (direction) => {
      const strip = stripRef.current;
      strip?.scrollBy({ left: direction * 360, behavior: 'smooth' });
    };

    return (
      <div className="client-image-strip-gallery">
        {stripControls.prev && (
          <button type="button" className="client-image-strip-gallery__nav client-image-strip-gallery__nav--prev" onClick={() => scrollStrip(-1)} aria-label="Previous images">
            <ChevronLeft size={20} />
          </button>
        )}
        <div className="client-image-strip-gallery__track" ref={stripRef}>
          {paths.map((path, index) => (
            <button
              key={`${path}-${index}`}
              type="button"
              className="client-image-strip-gallery__item"
              onClick={() => { setActiveIndex(index); setLightboxOpen(true); }}
              aria-label={`Open ${title} image ${index + 1}`}
            >
              <img src={path} alt="" onLoad={updateStripControls} />
            </button>
          ))}
        </div>
        {stripControls.next && (
          <button type="button" className="client-image-strip-gallery__nav client-image-strip-gallery__nav--next" onClick={() => scrollStrip(1)} aria-label="Next images">
            <ChevronRight size={20} />
          </button>
        )}

        <Modal isOpen={lightboxOpen} onClose={() => setLightboxOpen(false)} title={title} size="xl">
          <div className="client-image-lightbox">
            <img src={activePath} alt={title} />
          </div>
        </Modal>
      </div>
    );
  }

  return (
    <div className="client-image-gallery">
      {paths.length > 1 && (
        <div className="client-image-gallery__thumbs">
          {paths.slice(0, 6).map((path, index) => (
            <button
              key={`${path}-${index}`}
              type="button"
              className={`client-image-gallery__thumb ${index === activeIndex ? 'client-image-gallery__thumb--active' : ''}`}
              onClick={() => setActiveIndex(index)}
              aria-label={`View image ${index + 1}`}
            >
              <img src={path} alt="" />
            </button>
          ))}
        </div>
      )}

      <button type="button" className="client-image-gallery__main" onClick={() => setLightboxOpen(true)} aria-label={`Open ${title} image`}>
        <img src={activePath} alt={title} />
        <span className="client-image-gallery__expand"><Maximize2 size={16} /> View</span>
      </button>

      <Modal isOpen={lightboxOpen} onClose={() => setLightboxOpen(false)} title={title} size="xl">
        <div className="client-image-lightbox">
          <img src={activePath} alt={title} />
        </div>
      </Modal>
    </div>
  );
}
