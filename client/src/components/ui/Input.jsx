import './Input.css';

export default function Input({
  label,
  id,
  type = 'text',
  error,
  prefix,
  className = '',
  ...props
}) {
  return (
    <div className={`input-group ${error ? 'input-group--error' : ''} ${className}`}>
      {label && (
        <label htmlFor={id} className="input-group__label">
          {label}
        </label>
      )}
      <div className="input-group__wrapper">
        {prefix && <span className="input-group__prefix">{prefix}</span>}
        <input
          id={id}
          type={type}
          className={`input-group__input ${prefix ? 'input-group__input--prefixed' : ''}`}
          {...props}
        />
      </div>
      {error && <span className="input-group__error">{error}</span>}
    </div>
  );
}
