import { Plus } from 'lucide-react';
import Button from '../ui/Button.jsx';
import './PageHeader.css';

export default function PageHeader({ title, onCreateClick, createLabel = 'Create' }) {
  return (
    <div className="page-header">
      <h1 className="page-header__title">{title}</h1>
      {onCreateClick && (
        <Button variant="primary" size="md" onClick={onCreateClick}>
          <Plus size={18} />
          {createLabel}
        </Button>
      )}
    </div>
  );
}
