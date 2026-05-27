import { useState, useEffect, useCallback } from 'react';
import api from '../../api/client';
import PageHeader from '../../components/admin/PageHeader.jsx';
import SearchBar from '../../components/ui/SearchBar.jsx';
import Table from '../../components/ui/Table.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import './Management.css';

const columns = [
  { key: 'id', label: 'ID' },
  { key: 'buyer', label: 'Buyer' },
  { key: 'seller', label: 'Seller' },
  { key: 'item', label: 'Item' },
  { key: 'amount', label: 'Amount' },
  { key: 'platform_fee', label: 'Fee' },
  { key: 'fund_amount', label: 'Fund' },
  { key: 'status', label: 'Status' },
  { key: 'date', label: 'Date' },
];

export default function TransactionsPage() {
  const [data, setData] = useState({ items: [], total: 0, page: 1, pages: 1 });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get('/transactions', { params: { page, page_size: 10, search } });
      setData(res.data);
    } catch { /* ignore */ }
  }, [page, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString() : '—';
  const fmtMoney = (v) => `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  return (
    <div>
      <PageHeader title="Transactions" />
      <div className="management-toolbar">
        <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search by buyer name/email..." />
      </div>

      <Table columns={columns} data={data.items} renderRow={(item) => (
        <tr key={item.id}>
          <td style={{ fontSize: 'var(--font-size-xs)', fontFamily: 'monospace' }}>{String(item.id).slice(0, 8)}…</td>
          <td>{item.buyer_name || '—'}</td>
          <td>{item.seller_name || '—'}</td>
          <td>{item.item_title || '—'}</td>
          <td><strong>{fmtMoney(item.amount)}</strong></td>
          <td>{fmtMoney(item.platform_fee)}</td>
          <td>{fmtMoney(item.fund_amount)}</td>
          <td><span className={`badge badge--${item.status}`}>{item.status}</span></td>
          <td>{fmtDate(item.created_at)}</td>
        </tr>
      )} />

      <Pagination page={data.page} pages={data.pages} onPageChange={setPage} />
    </div>
  );
}
