import { useState } from 'react';
import './FraudWarningModal.css';

export default function FraudWarningModal({ isOpen, warnings, onCancel, onProceed, isLoading }) {
  const [acknowledgement, setAcknowledgement] = useState('');

  if (!isOpen || !warnings || warnings.length === 0) return null;

  const canProceed = acknowledgement === 'I UNDERSTAND';

  return (
    <div className="fraud-overlay" onClick={onCancel}>
      <div className="fraud-modal" onClick={(e) => e.stopPropagation()}>
        {/* Pulsing alert header */}
        <div className="fraud-modal__header">
          <div className="fraud-modal__icon-wrap">
            <svg className="fraud-modal__icon" width="48" height="48" viewBox="0 0 48 48" fill="none">
              <path d="M24 4L4 42h40L24 4z" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" fill="rgba(220, 38, 38, 0.1)"/>
              <path d="M24 18v10M24 32v2" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
            </svg>
          </div>
          <h2 className="fraud-modal__title">⚠️ Fraud Alert — Transaction Flagged</h2>
          <p className="fraud-modal__subtitle">
            Our security system has detected suspicious patterns in this transfer. Please review carefully before proceeding.
          </p>
        </div>

        {/* Warning items */}
        <div className="fraud-warnings">
          {warnings.map((w, i) => (
            <div key={i} className="fraud-warning-item">
              <div className="fraud-warning-item__badge">
                {w.code === 'UNUSUAL_AMOUNT' && '💰'}
                {w.code === 'NEW_ACCOUNT' && '🆕'}
                {w.code === 'LATE_NIGHT' && '🌙'}
              </div>
              <div className="fraud-warning-item__content">
                <strong>{w.title}</strong>
                <p>{w.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Acknowledgement section */}
        <div className="fraud-acknowledge">
          <div className="fraud-acknowledge__info">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M8 5v3M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span>To proceed, type <strong>"I UNDERSTAND"</strong> below to confirm you are aware of the risks.</span>
          </div>
          <input
            type="text"
            className="fraud-acknowledge__input"
            placeholder='Type "I UNDERSTAND" to proceed'
            value={acknowledgement}
            onChange={(e) => setAcknowledgement(e.target.value)}
            autoFocus
          />
          <div className="fraud-acknowledge__progress">
            <div
              className="fraud-acknowledge__progress-bar"
              style={{ width: `${Math.min((acknowledgement.length / 12) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="fraud-modal__actions">
          <button className="fraud-btn fraud-btn--cancel" onClick={onCancel}>
            Cancel Transfer
          </button>
          <button
            className="fraud-btn fraud-btn--proceed"
            disabled={!canProceed || isLoading}
            onClick={() => {
              if (canProceed) {
                onProceed();
                setAcknowledgement('');
              }
            }}
          >
            {isLoading ? (
              <span className="fraud-btn__spinner" />
            ) : (
              'Proceed Anyway'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
