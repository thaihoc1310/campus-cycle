import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, PlusCircle } from 'lucide-react';
import api from '../../api/client';
import Pagination from '../../components/ui/Pagination.jsx';
import { money } from './clientUtils.js';
import './Client.css';

export default function MyItems() {
  const [data, setData] = useState({ items: [], page: 1, pages: 1 });
  const [page, setPage] = useState(1);

  useEffect(() => {
    api.get('/client/items/my', { params: { page, page_size: 12 } })
      .then((res) => setData(res.data))
      .catch(() => {});
  }, [page]);

  const statusCounts = useMemo(() => {
    const counts = {};
    data.items.forEach((item) => {
      counts[item.status] = (counts[item.status] || 0) + 1;
    });
    return counts;
  }, [data.items]);

  return (
    <div className="client-page">
      <div className="client-section__header">
        <div>
          <h1 className="client-section__title">My Items</h1>
          <p className="client-section__copy">Track campus review status and public visibility.</p>
        </div>
        <Link className="btn btn--primary btn--md" to="/post-item"><PlusCircle size={16} /> Post Item</Link>
      </div>

      {data.items.length > 0 && Object.keys(statusCounts).length > 0 && (
        <div className="client-status-summary">
          {Object.entries(statusCounts).map(([status, count]) => (
            <div key={status} className="client-status-summary__item">
              <span className={`client-status-summary__dot client-status-summary__dot--${status}`} />
              <span>{count} {status}</span>
            </div>
          ))}
        </div>
      )}

      {data.items.length ? (
        <div className="client-grid">
          {data.items.map((item) => (
            <Link key={item.id} to={`/items/${item.id}`} className="client-card">
              <div className="client-card__media">
                {item.main_image ? <img src={item.main_image} alt={item.title} /> : <Package size={54} />}
              </div>
              <div className="client-card__body">
                <div className="client-card__meta">
                  <span className={`badge badge--${item.status}`}>{item.status}</span>
                  <span>{item.type}</span>
                </div>
                <h2 className="client-card__title">{item.title}</h2>
                <div className="client-card__footer">
                  <span className="client-price">{money(item.price)}</span>
                  <span className="text-muted">{item.status === 'approved' ? 'public' : 'not public'}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="client-empty">
          <span className="client-empty__icon"><Package size={28} /></span>
          <span className="client-empty__title">No items posted yet</span>
          <span className="client-empty__copy">List your first item for campus reuse. All items go through admin review before going public.</span>
          <Link className="btn btn--primary btn--md" to="/post-item"><PlusCircle size={16} /> Post Your First Item</Link>
        </div>
      )}
      <Pagination page={data.page} pages={data.pages} onPageChange={setPage} />
    </div>
  );
}
