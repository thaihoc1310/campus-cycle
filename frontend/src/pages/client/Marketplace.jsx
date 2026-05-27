import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package } from 'lucide-react';
import api from '../../api/client';
import Input from '../../components/ui/Input.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import { itemFeePreview, money } from './clientUtils.js';
import './Client.css';

export default function Marketplace() {
  const [items, setItems] = useState({ items: [], page: 1, pages: 1 });
  const [categories, setCategories] = useState([]);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ search: '', item_type: '', category_id: '' });

  const fetchItems = useCallback(() => {
    api.get('/client/items', { params: { page, page_size: 12, ...filters } })
      .then((res) => setItems(res.data))
      .catch(() => {});
  }, [page, filters]);

  useEffect(() => { fetchItems(); }, [fetchItems]);
  useEffect(() => { api.get('/client/categories').then((res) => setCategories(res.data)).catch(() => {}); }, []);

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  };

  return (
    <div className="client-page">
      <div className="client-section__header">
        <div>
          <h1 className="client-section__title">Marketplace</h1>
          <p className="client-section__copy">Approved sell and donate listings. Donate listings still go through View and Buy with platform fee only.</p>
        </div>
      </div>

      <div className="client-toolbar">
        <Input id="item-search" placeholder="Search items..." value={filters.search} onChange={(e) => updateFilter('search', e.target.value)} />
        <Input id="item-type-filter" type="select" value={filters.item_type} onChange={(e) => updateFilter('item_type', e.target.value)}>
          <option value="">All types</option>
          <option value="sell">Sell</option>
          <option value="donate">Donate</option>
        </Input>
        <Input id="item-category-filter" type="select" value={filters.category_id} onChange={(e) => updateFilter('category_id', e.target.value)}>
          <option value="">All categories</option>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </Input>
      </div>

      {items.items.length ? (
        <div className="client-grid">
          {items.items.map((item) => {
            const preview = itemFeePreview(item);
            return (
              <Link key={item.id} to={`/items/${item.id}`} className="client-card">
                <div className="client-card__media">
                  {item.main_image ? <img src={item.main_image} alt={item.title} /> : <Package size={54} />}
                </div>
                <div className="client-card__body">
                  <div className="client-card__meta">
                    <span className={`badge badge--${item.type === 'donate' ? 'approved' : 'active'}`}>{item.type}</span>
                    <span>{item.category_name || 'Uncategorized'}</span>
                  </div>
                  <h2 className="client-card__title">{item.title}</h2>
                  <div className="client-card__footer">
                    <span className="client-price">{item.type === 'donate' ? money(preview.buyerTotal) : money(preview.buyerTotal)}</span>
                    <span className="text-muted">{item.type === 'donate' ? 'fee only' : 'buyer total'}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="client-empty">No approved items match these filters.</div>
      )}
      <Pagination page={items.page} pages={items.pages} onPageChange={setPage} />
    </div>
  );
}

