import { useState } from 'react';
import { Card, Form, Input, Button, Typography, Alert, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

const { Title, Text } = Typography;

export function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFinish = async (values: any) => {
    setLoading(true);
    setError(null);
    try {
      await api.post('/auth/register', values);
      message.success('Account created successfully');
      // Force a hard navigation to reload state, or navigate to dashboard
      window.location.href = '/products';
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <Card className="w-full max-w-md shadow-lg border-0 rounded-lg">
        <div className="text-center mb-8">
          <Title level={2} className="!mb-1">Create Account</Title>
          <Text type="secondary">Sign up for StockFlow</Text>
        </div>

        {error && (
          <Alert message={error} type="error" showIcon className="mb-6" />
        )}

        <Form
          name="register"
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
            rules={[
              { required: true, message: 'Please input your Password!' },
              { min: 8, message: 'Password must be at least 8 characters long' }
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Password" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" className="w-full" loading={loading}>
              Sign up
            </Button>
          </Form.Item>
        </Form>

        <div className="text-center mt-4">
          <Text type="secondary">
            Already have an account? <Link to="/login" className="text-blue-500 hover:underline">Log in</Link>
          </Text>
        </div>
      </Card>
    </div>
  );
}
