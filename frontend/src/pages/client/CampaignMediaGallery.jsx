import { Megaphone } from 'lucide-react';

function imagePath(image) {
  return image?.image_path || image;
}

export default function CampaignMediaGallery({ images, title }) {
  const list = images?.length ? images.slice(0, 5) : [];

  if (!list.length) {
    return (
      <div className="campaign-media-gallery campaign-media-gallery--empty">
        <Megaphone size={64} />
      </div>
    );
  }

  if (list.length === 1) {
    return (
      <div className="campaign-media-gallery campaign-media-gallery--single">
        <img className="campaign-media-gallery__main" src={imagePath(list[0])} alt={title} />
      </div>
    );
  }

  const secondaryImages = list.slice(1);
  return (
    <div className="campaign-media-gallery">
      <img className="campaign-media-gallery__main" src={imagePath(list[0])} alt={title} />
      <div className={`campaign-media-gallery__side campaign-media-gallery__side--${secondaryImages.length}`}>
        {secondaryImages.map((image, index) => (
          <img
            key={image.id || imagePath(image)}
            className="campaign-media-gallery__secondary"
            src={imagePath(image)}
            alt={`${title} ${index + 2}`}
          />
        ))}
      </div>
    </div>
  );
}
