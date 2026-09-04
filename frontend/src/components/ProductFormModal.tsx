import { Modal, Form, Input, InputNumber, Button, message } from 'antd';
import { useEffect } from 'react';
import { api } from '../lib/api';

interface ProductFormModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any; // If editing
}

export function ProductFormModal({ open, onClose, onSuccess, initialData }: ProductFormModalProps) {
  const [form] = Form.useForm();

  useEffect(() => {
    if (open) {
      if (initialData) {
        form.setFieldsValue(initialData);
      } else {
        form.resetFields();
      }
    }
  }, [open, initialData, form]);

  const handleSubmit = async (values: any) => {
    try {
      if (initialData?.id) {
        await api.patch(`/products/${initialData.id}`, values);
        message.success('Product updated successfully');
      } else {
        await api.post('/products', values);
        message.success('Product created successfully');
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Failed to save product';
      message.error(Array.isArray(msg) ? msg[0] : msg);
    }
  };

  return (
    <Modal
      title={initialData ? 'Edit Product' : 'Add New Product'}
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        className="mt-6"
      >
        <Form.Item
          name="sku"
          label="SKU"
          rules={[{ required: true, message: 'Please enter SKU' }]}
        >
          <Input placeholder="e.g. LAP-001" disabled={!!initialData} />
        </Form.Item>

        <Form.Item
          name="name"
          label="Product Name"
          rules={[{ required: true, message: 'Please enter product name' }]}
        >
          <Input placeholder="e.g. MacBook Pro M3" />
        </Form.Item>

        <Form.Item
          name="description"
          label="Description"
        >
          <Input.TextArea placeholder="Optional description" rows={3} />
        </Form.Item>

        <div className="flex gap-4">
          <Form.Item
            name="unitPrice"
            label="Unit Price (Rp)"
            className="flex-1"
            rules={[{ required: true, message: 'Please enter price' }]}
          >
            <InputNumber 
              className="w-full" 
              min={0 as any} 
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
              parser={(value) => value!.replace(/\$\s?|(\.*)/g, '') as any}
            />
          </Form.Item>

          <Form.Item
            name="quantityOnHand"
            label="Stock"
            className="flex-1"
            rules={[{ required: true, message: 'Please enter stock' }]}
          >
            <InputNumber className="w-full" min={0} />
          </Form.Item>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" htmlType="submit">
            {initialData ? 'Save Changes' : 'Create Product'}
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
