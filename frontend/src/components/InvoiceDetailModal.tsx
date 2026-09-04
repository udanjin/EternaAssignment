import { Modal, Button, Typography, Tag, message, Table, Descriptions, Divider, Space } from 'antd';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const { Title, Text } = Typography;

interface InvoiceDetailModalProps {
  invoiceId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function InvoiceDetailModal({ invoiceId, onClose, onSuccess }: InvoiceDetailModalProps) {
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchInvoice = async () => {
    if (!invoiceId) return;
    setLoading(true);
    try {
      const res = await api.get(`/invoices/${invoiceId}`);
      setInvoice(res.data);
    } catch (err) {
      message.error('Failed to load invoice details');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (invoiceId) {
      fetchInvoice();
    } else {
      setInvoice(null);
    }
  }, [invoiceId]);

  const handleAction = async (action: 'issue' | 'pay' | 'cancel') => {
    setActionLoading(true);
    try {
      await api.post(`/invoices/${invoiceId}/${action}`);
      message.success(`Invoice ${action}ed successfully`);
      onSuccess();
      fetchInvoice();
    } catch (error: any) {
      const msg = error.response?.data?.message || `Failed to ${action} invoice`;
      message.error(msg);
    } finally {
      setActionLoading(false);
    }
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

  const itemColumns = [
    {
      title: 'Product',
      dataIndex: 'productName',
      key: 'productName',
    },
    {
      title: 'Qty',
      dataIndex: 'quantity',
      key: 'quantity',
    },
    {
      title: 'Unit Price',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      render: (val: number) => `Rp ${val.toLocaleString('id-ID')}`,
    },
    {
      title: 'Total',
      dataIndex: 'lineTotal',
      key: 'lineTotal',
      render: (val: number) => `Rp ${val.toLocaleString('id-ID')}`,
    },
  ];

  return (
    <Modal
      open={!!invoiceId}
      onCancel={onClose}
      footer={null}
      width={800}
      destroyOnClose
    >
      {loading || !invoice ? (
        <div className="p-10 text-center text-gray-500">Loading...</div>
      ) : (
        <div className="mt-4">
          <div className="flex justify-between items-start mb-6">
            <div>
              <Title level={4} className="!mb-1">{invoice.invoiceNumber}</Title>
              <Tag color={getStatusColor(invoice.status)}>{invoice.status}</Tag>
            </div>
            <Space>
              {invoice.status === 'DRAFT' && (
                <>
                  <Button danger onClick={() => handleAction('cancel')} loading={actionLoading}>Cancel</Button>
                  <Button type="primary" onClick={() => handleAction('issue')} loading={actionLoading}>Issue Invoice</Button>
                </>
              )}
              {invoice.status === 'ISSUED' && (
                <>
                  <Button danger onClick={() => handleAction('cancel')} loading={actionLoading}>Cancel</Button>
                  <Button className="bg-green-600 hover:bg-green-500 text-white border-none" onClick={() => handleAction('pay')} loading={actionLoading}>Mark Paid</Button>
                </>
              )}
            </Space>
          </div>

          <Descriptions bordered size="small" column={2} className="mb-6">
            <Descriptions.Item label="Customer">{invoice.customerName}</Descriptions.Item>
            <Descriptions.Item label="Issue Date">{new Date(invoice.issueDate).toLocaleDateString()}</Descriptions.Item>
            {invoice.notes && (
              <Descriptions.Item label="Notes" span={2}>{invoice.notes}</Descriptions.Item>
            )}
          </Descriptions>

          <Table
            dataSource={invoice.items}
            columns={itemColumns}
            rowKey="id"
            pagination={false}
            size="small"
            className="mb-6"
          />

          <div className="flex justify-end">
            <div className="w-64">
              <div className="flex justify-between mb-2">
                <Text type="secondary">Subtotal:</Text>
                <Text>Rp {invoice.subtotal.toLocaleString('id-ID')}</Text>
              </div>
              <div className="flex justify-between mb-2">
                <Text type="secondary">Tax (11%):</Text>
                <Text>Rp {invoice.taxAmount.toLocaleString('id-ID')}</Text>
              </div>
              <Divider className="my-2" />
              <div className="flex justify-between text-lg">
                <Text strong>Total:</Text>
                <Text className="text-blue-600" strong>Rp {invoice.total.toLocaleString('id-ID')}</Text>
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
