import './Input.css';

export default function Input({
  label, id, type = 'text', error, className = '', ...props
}) {
  return (
    <div className={`input-group ${className}`}>
      {label && <label htmlFor={id} className="input-label">{label}</label>}
      {type === 'textarea' ? (
        <textarea id={id} className={`input-field input-textarea ${error ? 'input-field--error' : ''}`} {...props} />
      ) : type === 'select' ? (
        <select id={id} className={`input-field ${error ? 'input-field--error' : ''}`} {...props} />
      ) : (
        <input id={id} type={type} className={`input-field ${error ? 'input-field--error' : ''}`} {...props} />
      )}
      {error && <span className="input-error">{error}</span>}
    </div>
  );
}
