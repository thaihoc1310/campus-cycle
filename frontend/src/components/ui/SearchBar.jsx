import { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import './SearchBar.css';

export default function SearchBar({ value, onChange, placeholder = 'Search...' }) {
  const [localValue, setLocalValue] = useState(value || '');
  const timerRef = useRef(null);

  useEffect(() => { setLocalValue(value || ''); }, [value]);

  const handleChange = (e) => {
    const val = e.target.value;
    setLocalValue(val);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onChange(val), 400);
  };

  return (
    <div className="search-bar">
      <Search size={18} className="search-bar__icon" />
      <input
        type="text"
        className="search-bar__input"
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
      />
    </div>
  );
}
