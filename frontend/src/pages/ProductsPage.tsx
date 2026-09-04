import { useEffect, useState } from 'react';
import { Table, Button, Typography, Tag, message, Popconfirm, Dropdown } from 'antd';
import { MoreOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { api } from '../lib/api';
import type { TablePaginationConfig } from 'antd/es/table';
import { ProductFormModal } from '../components/ProductFormModal';

const { Title } = Typography;

interface Product {
  id: string;
  sku: string;
  name: string;
  unitPrice: number;
  quantityOnHand: number;
}

export function ProductsPage() {
  const [data, setData] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>();

  const fetchData = async (page = 1, limit = 10) => {
    setLoading(true);
    try {
      const response = await api.get(`/products?page=${page}&limit=${limit}`);
      setData(response.data.data);
      setPagination({
        ...pagination,
        current: page,
        pageSize: limit,
        total: response.data.meta.total,
      });
    } catch (error) {
      message.error('Failed to load products');
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

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/products/${id}`);
      message.success('Product deleted');
      fetchData(pagination.current, pagination.pageSize);
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Failed to delete product';
      message.error(msg);
    }
  };

  const openEdit = (record: Product) => {
    setEditingProduct(record);
    setModalOpen(true);
  };

  const openCreate = () => {
    setEditingProduct(undefined);
    setModalOpen(true);
  };

  const columns = [
    {
      title: 'SKU',
      dataIndex: 'sku',
      key: 'sku',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Price (IDR)',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      render: (val: number) => `Rp ${val.toLocaleString('id-ID')}`,
    },
    {
      title: 'Stock',
      dataIndex: 'quantityOnHand',
      key: 'quantityOnHand',
      render: (val: number) => {
        const color = val < 10 ? 'volcano' : 'green';
        return <Tag color={color}>{val}</Tag>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Product) => (
        <Dropdown
          menu={{
            items: [
              {
                key: 'edit',
                icon: <EditOutlined />,
                label: 'Edit',
                onClick: () => openEdit(record),
              },
              {
                key: 'delete',
                icon: <DeleteOutlined />,
                danger: true,
                label: (
                  <Popconfirm
                    title="Delete product?"
                    description="This action cannot be undone."
                    onConfirm={() => handleDelete(record.id)}
                  >
                    <div>Delete</div>
                  </Popconfirm>
                ),
              },
            ],
          }}
          trigger={['click']}
        >
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ];

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
      <div className="flex justify-between items-center mb-6">
        <Title level={3} className="!mb-0">Products</Title>
        <Button type="primary" onClick={openCreate}>Add Product</Button>
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

      <ProductFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initialData={editingProduct}
        onSuccess={() => fetchData(pagination.current, pagination.pageSize)}
      />
    </div>
  );
}

const { Text } = Typography;
