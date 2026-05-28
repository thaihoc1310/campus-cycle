import { useState, useEffect } from 'react';

export const money = (value) => `$${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function itemFeePreview(item) {
  const price = Number(item?.price || 0);
  if (item?.type === 'donate') {
    return {
      itemPrice: 0,
      buyerPlatformFee: 0,
      sellerPlatformFee: 0,
      platformFee: 0,
      buyerTotal: 0,
      sellerReceives: 0,
    };
  }

  const platformFee = price * 0.2;
  const buyerPlatformFee = platformFee / 2;
  const sellerPlatformFee = platformFee - buyerPlatformFee;
  return {
    itemPrice: price,
    buyerPlatformFee,
    sellerPlatformFee,
    platformFee,
    buyerTotal: price + buyerPlatformFee,
    sellerReceives: price - sellerPlatformFee,
  };
}

export function imageUrl(path) {
  return path || '';
}

export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    const media = window.matchMedia(query);
    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}
