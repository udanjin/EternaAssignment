import { useEffect, useState } from 'react';
import { Table, Button, Typography, Tag, message } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import { api } from '../lib/api';
import type { TablePaginationConfig } from 'antd/es/table';
import { CreateInvoiceModal } from '../components/CreateInvoiceModal';
import { InvoiceDetailModal } from '../components/InvoiceDetailModal';

const { Title, Text } = Typography;

interface Invoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  issueDate: string;
  status: 'DRAFT' | 'ISSUED' | 'PAID' | 'CANCELLED';
  total: number;
}

export function InvoicesPage() {
  const [data, setData] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailInvoiceId, setDetailInvoiceId] = useState<string | null>(null);

  const fetchData = async (page = 1, limit = 10) => {
    setLoading(true);
    try {
      const response = await api.get(`/invoices?page=${page}&limit=${limit}`);
      setData(response.data.data);
      setPagination({
        ...pagination,
        current: page,
        pageSize: limit,
        total: response.data.meta.total,
      });
    } catch (error) {
      message.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(pagination.current, pagination.pageSize);
  }, []);

  const handleTableChange = (newPagination: TablePaginationConfig) => {
    fetchData(newPagination.current, newPagination.pageSize);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'default';
      case 'ISSUED': return 'blue';
      case 'PAID': return 'green';
      case 'CANCELLED': return 'volcano';
      default: return 'default';
    }
  };

  const columns = [
    {
      title: 'Invoice #',
      dataIndex: 'invoiceNumber',
      key: 'invoiceNumber',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'Customer',
      dataIndex: 'customerName',
      key: 'customerName',
    },
    {
      title: 'Issue Date',
      dataIndex: 'issueDate',
      key: 'issueDate',
      render: (val: string) => new Date(val).toLocaleDateString(),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (val: string) => (
        <Tag color={getStatusColor(val)}>{val}</Tag>
      ),
    },
    {
      title: 'Total (IDR)',
      dataIndex: 'total',
      key: 'total',
      render: (val: number) => `Rp ${val.toLocaleString('id-ID')}`,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Invoice) => (
        <Button type="text" icon={<EyeOutlined />} onClick={() => setDetailInvoiceId(record.id)} />
      ),
    },
  ];

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
      <div className="flex justify-between items-center mb-6">
        <Title level={3} className="!mb-0">Invoices</Title>
        <Button type="primary" onClick={() => setCreateModalOpen(true)}>Create Invoice</Button>
      </div>

      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        pagination={pagination}
        loading={loading}
        onChange={handleTableChange}
        scroll={{ x: true }}
      />

      <CreateInvoiceModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => fetchData(pagination.current, pagination.pageSize)}
      />

      <InvoiceDetailModal
        invoiceId={detailInvoiceId}
        onClose={() => setDetailInvoiceId(null)}
        onSuccess={() => fetchData(pagination.current, pagination.pageSize)}
      />
    </div>
  );
}
