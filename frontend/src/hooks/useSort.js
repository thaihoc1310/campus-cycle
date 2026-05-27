import { useState } from 'react';

export default function useSort(defaultSortBy = 'created_at', defaultSortOrder = 'desc') {
  const [sortBy, setSortBy] = useState(defaultSortBy);
  const [sortOrder, setSortOrder] = useState(defaultSortOrder);

  const handleSort = (nextSortBy) => {
    if (nextSortBy === sortBy) {
      setSortOrder((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortBy(nextSortBy);
    setSortOrder('asc');
  };

  return { sortBy, sortOrder, handleSort };
}

