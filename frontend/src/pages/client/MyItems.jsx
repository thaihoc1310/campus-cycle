import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package } from 'lucide-react';
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

  return (
    <div className="client-page">
      <div className="client-section__header">
        <div>
          <h1 className="client-section__title">My Items</h1>
          <p className="client-section__copy">Track campus review status and public visibility.</p>
        </div>
        <Link className="btn btn--primary btn--md" to="/post-item">Post Item</Link>
      </div>

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
        <div className="client-empty">You have not posted any items yet.</div>
      )}
      <Pagination page={data.page} pages={data.pages} onPageChange={setPage} />
    </div>
  );
}

