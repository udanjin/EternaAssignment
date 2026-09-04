import { Modal, Form, Input, Button, message, Select, Space, Typography, InputNumber, Divider } from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { useEffect, useState, useMemo } from 'react';
import { api } from '../lib/api';

const { Text } = Typography;

interface CreateInvoiceModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateInvoiceModal({ open, onClose, onSuccess }: CreateInvoiceModalProps) {
  const [form] = Form.useForm();
  const [products, setProducts] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Watch form values to calculate totals dynamically
  const items = Form.useWatch('items', form) || [];

  useEffect(() => {
    if (open) {
      form.resetFields();
      form.setFieldsValue({ items: [{}] });
      fetchProducts();
    }
  }, [open, form]);

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products?limit=100');
      setProducts(res.data.data);
    } catch (err) {
      message.error('Failed to load products');
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      setSubmitting(true);
      await api.post('/invoices', {
        customerName: values.customerName,
        issueDate: new Date().toISOString(),
        notes: values.notes,
        items: values.items.map((i: any) => ({
          productId: i.productId,
          quantity: i.quantity,
        })),
      });
      message.success('Invoice created successfully');
      onSuccess();
      onClose();
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Failed to create invoice';
      message.error(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setSubmitting(false);
    }
  };

  const calculateTotals = useMemo(() => {
    let subtotal = 0;
    items.forEach((item: any) => {
      if (item && item.productId && item.quantity) {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          subtotal += product.unitPrice * item.quantity;
        }
      }
    });
    const tax = Math.floor(subtotal * 0.11);
    const total = subtotal + tax;

    return { subtotal, tax, total };
  }, [items, products]);

  return (
    <Modal
      title="Create New Invoice"
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnClose
      width={700}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        className="mt-6"
      >
        <Form.Item
          name="customerName"
          label="Customer Name"
          rules={[{ required: true, message: 'Please enter customer name' }]}
        >
          <Input placeholder="e.g. TechCorp Indonesia" />
        </Form.Item>

        <Divider plain>Line Items</Divider>

        <Form.List name="items">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...restField }) => (
                <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                  <Form.Item
                    {...restField}
                    name={[name, 'productId']}
                    rules={[{ required: true, message: 'Missing product' }]}
                  >
                    <Select placeholder="Select Product" style={{ width: 300 }}>
                      {products.map(p => (
                        <Select.Option key={p.id} value={p.id}>
                          {p.name} (Stock: {p.quantityOnHand})
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                  <Form.Item
                    {...restField}
                    name={[name, 'quantity']}
                    rules={[{ required: true, message: 'Missing qty' }]}
                  >
                    <InputNumber placeholder="Qty" min={1} />
                  </Form.Item>
                  {fields.length > 1 ? (
                    <MinusCircleOutlined onClick={() => remove(name)} className="text-red-500 ml-2" />
                  ) : null}
                </Space>
              ))}
              <Form.Item>
                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                  Add Item
                </Button>
              </Form.Item>
            </>
          )}
        </Form.List>

        <Form.Item name="notes" label="Notes">
          <Input.TextArea rows={2} placeholder="Optional notes for customer" />
        </Form.Item>

        <div className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
          <div className="flex justify-between mb-2">
            <Text type="secondary">Subtotal:</Text>
            <Text strong>Rp {calculateTotals.subtotal.toLocaleString('id-ID')}</Text>
          </div>
          <div className="flex justify-between mb-2">
            <Text type="secondary">Tax (11%):</Text>
            <Text strong>Rp {calculateTotals.tax.toLocaleString('id-ID')}</Text>
          </div>
          <Divider className="my-2" />
          <div className="flex justify-between text-lg">
            <Text strong>Total:</Text>
            <Text className="text-blue-600" strong>Rp {calculateTotals.total.toLocaleString('id-ID')}</Text>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button type="primary" htmlType="submit" loading={submitting}>
            Create Draft Invoice
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
