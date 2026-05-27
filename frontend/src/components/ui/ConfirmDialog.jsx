import Modal from './Modal.jsx';
import Button from './Button.jsx';

export default function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, loading }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title || 'Confirm'} size="sm">
      <p style={{ color: 'var(--gray-600)', marginBottom: 'var(--space-5)', fontSize: 'var(--font-size-sm)' }}>
        {message || 'Are you sure you want to proceed?'}
      </p>
      <div className="modal__actions">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="danger" onClick={onConfirm} disabled={loading}>
          {loading ? 'Deleting...' : 'Delete'}
        </Button>
      </div>
    </Modal>
  );
}
