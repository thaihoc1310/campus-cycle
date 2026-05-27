import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Megaphone } from 'lucide-react';
import api from '../../api/client';
import Input from '../../components/ui/Input.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import './Client.css';

export default function Campaigns() {
  const [data, setData] = useState({ items: [], page: 1, pages: 1 });
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ search: '', campaign_type: '' });

  const fetchCampaigns = useCallback(() => {
    api.get('/client/campaigns', { params: { page, page_size: 12, ...filters } })
      .then((res) => setData(res.data))
      .catch(() => {});
  }, [page, filters]);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  };

  return (
    <div className="client-page">
      <div className="client-section__header">
        <div>
          <h1 className="client-section__title">Campaigns</h1>
          <p className="client-section__copy">Fundraising campaigns accept money. Donation campaigns accept submitted donate items.</p>
        </div>
      </div>

      <div className="client-toolbar">
        <Input id="campaign-search" placeholder="Search campaigns..." value={filters.search} onChange={(e) => updateFilter('search', e.target.value)} />
        <Input id="campaign-type-filter" type="select" value={filters.campaign_type} onChange={(e) => updateFilter('campaign_type', e.target.value)}>
          <option value="">All campaign types</option>
          <option value="fundraising">Fundraising</option>
          <option value="donation">Donation</option>
        </Input>
        <div />
      </div>

      {data.items.length ? (
        <div className="client-grid">
          {data.items.map((campaign) => (
            <Link key={campaign.id} to={`/campaigns/${campaign.id}`} className="client-card">
              <div className="client-card__media">
                {campaign.main_image ? <img src={campaign.main_image} alt={campaign.title} /> : <Megaphone size={54} />}
              </div>
              <div className="client-card__body">
                <div className="client-card__meta">
                  <span className="badge badge--approved">{campaign.type}</span>
                  <span>{campaign.organization_name || 'Campus'}</span>
                </div>
                <h2 className="client-card__title">{campaign.title}</h2>
                <div className="client-card__footer">
                  <span className="text-muted">{campaign.type === 'fundraising' ? 'Donate money' : 'Donate item'}</span>
                  <span className="text-muted">View</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="client-empty">No approved campaigns match these filters.</div>
      )}
      <Pagination page={data.page} pages={data.pages} onPageChange={setPage} />
    </div>
  );
}

