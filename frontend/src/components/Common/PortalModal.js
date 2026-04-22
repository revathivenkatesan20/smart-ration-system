import React from 'react';
import ReactDOM from 'react-dom';

const PortalModal = ({ isOpen, onClose, children, maxWidth = 500, title, padding = '20px 24px' }) => {
  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal animate-scale-in" 
        style={{ maxWidth, padding: 0 }} 
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 style={{ margin: 0 }}>{title}</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{ padding }}>
          {children}
        </div>
      </div>
    </div>,
    document.getElementById('portal-root')
  );
};

export default PortalModal;
