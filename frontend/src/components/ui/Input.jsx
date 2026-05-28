import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import './Input.css';

function CustomSelect({ id, value, onChange, children, disabled, error, ...rest }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Parse <option> children into flat array of { value, label }
  const options = [];
  const parseChildren = (nodes) => {
    if (!nodes) return;
    const arr = Array.isArray(nodes) ? nodes : [nodes];
    arr.forEach((child) => {
      if (!child) return;
      if (child.type === 'option') {
        options.push({
          value: child.props.value ?? '',
          label: child.props.children ?? '',
        });
      } else if (Array.isArray(child)) {
        parseChildren(child);
      } else if (child.props?.children) {
        parseChildren(child.props.children);
      }
    });
  };
  parseChildren(children);

  const selected = options.find((o) => String(o.value) === String(value));

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!open || !ref.current) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  const handleSelect = (optValue) => {
    if (disabled) return;
    onChange?.({ target: { value: optValue } });
    setOpen(false);
  };

  return (
    <div className="custom-select" ref={ref} {...rest}>
      <button
        type="button"
        id={id}
        className={`custom-select__trigger input-field ${error ? 'input-field--error' : ''} ${open ? 'custom-select__trigger--open' : ''}`}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={`custom-select__value ${!selected?.value && selected ? 'custom-select__value--placeholder' : ''}`}>
          {selected?.label || 'Select...'}
        </span>
        <ChevronDown size={16} className={`custom-select__chevron ${open ? 'custom-select__chevron--open' : ''}`} />
      </button>
      {open && (
        <ul className="custom-select__dropdown" role="listbox" aria-activedescendant={value ? `${id}-opt-${value}` : undefined}>
          {options.map((opt) => {
            const isSelected = String(opt.value) === String(value);
            return (
              <li
                key={opt.value}
                id={`${id}-opt-${opt.value}`}
                role="option"
                aria-selected={isSelected}
                className={`custom-select__option ${isSelected ? 'custom-select__option--selected' : ''}`}
                onClick={() => handleSelect(opt.value)}
              >
                <span>{opt.label}</span>
                {isSelected && <Check size={14} />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function Input({
  label, id, type = 'text', error, className = '', children, ...props
}) {
  return (
    <div className={`input-group ${className}`}>
      {label && <label htmlFor={id} className="input-label">{label}</label>}
      {type === 'textarea' ? (
        <textarea id={id} className={`input-field input-textarea ${error ? 'input-field--error' : ''}`} {...props} />
      ) : type === 'select' ? (
        <CustomSelect id={id} error={error} {...props}>{children}</CustomSelect>
      ) : (
        <input id={id} type={type} className={`input-field ${error ? 'input-field--error' : ''}`} {...props} />
      )}
      {error && <span className="input-error">{error}</span>}
    </div>
  );
}
