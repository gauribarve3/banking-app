import './Card.css';

export default function Card({ children, className = '', padding = 'default', ...props }) {
  return (
    <div className={`card card--${padding} ${className}`} {...props}>
      {children}
    </div>
  );
}
