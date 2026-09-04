import { useState } from 'react';
import { Card, Form, Input, Button, Typography, Alert, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

const { Title, Text } = Typography;

export function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFinish = async (values: any) => {
    setLoading(true);
    setError(null);
    try {
      await api.post('/auth/login', values);
      message.success('Logged in successfully');
      // Force a hard navigation to reload state, or navigate to dashboard
      window.location.href = '/products';
    } catch (err: any) {
      // The API returns generic "Invalid credentials" error per spec A9
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <Card className="w-full max-w-md shadow-lg border-0 rounded-lg">
        <div className="text-center mb-8">
          <Title level={2} className="!mb-1">StockFlow</Title>
          <Text type="secondary">Sign in to manage your inventory</Text>
        </div>

        {error && (
          <Alert message={error} type="error" showIcon className="mb-6" />
        )}

        <Form
          name="login"
          initialValues={{ remember: true }}
          onFinish={onFinish}
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: 'Please input your Email!' },
              { type: 'email', message: 'Please enter a valid email!' }
            ]}
          >
            <Input prefix={<UserOutlined />} placeholder="Email address" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Please input your Password!' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Password" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" className="w-full" loading={loading}>
              Log in
            </Button>
          </Form.Item>
        </Form>

        <div className="text-center mt-4">
          <Text type="secondary">
            Don't have an account? <Link to="/register" className="text-blue-500 hover:underline">Sign up</Link>
          </Text>
        </div>
      </Card>
    </div>
  );
}
