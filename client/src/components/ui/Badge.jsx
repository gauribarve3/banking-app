import './Badge.css';

export default function Badge({ children, variant = 'neutral', size = 'sm' }) {
  return (
    <span className={`badge badge--${variant} badge--${size}`}>
      {children}
    </span>
  );
}
