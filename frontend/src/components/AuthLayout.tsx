import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../lib/api';
import { Layout, Menu, Spin, Button, message } from 'antd';
import { ShoppingCartOutlined, FileTextOutlined, LogoutOutlined } from '@ant-design/icons';

const { Header, Content, Sider } = Layout;

export function AuthLayout() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await api.get('/auth/me');
        setUser(res.data);
      } catch (error) {
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
      message.success('Logged out');
      window.location.href = '/login';
    } catch (error) {
      message.error('Failed to logout');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Spin size="large" />
      </div>
    );
  }

  // Define sidebar menu items
  const menuItems = [
    {
      key: '/products',
      icon: <ShoppingCartOutlined />,
      label: 'Products',
      onClick: () => navigate('/products'),
    },
    {
      key: '/invoices',
      icon: <FileTextOutlined />,
      label: 'Invoices',
      onClick: () => navigate('/invoices'),
    },
  ];

  return (
    <Layout className="min-h-screen">
      <Sider
        breakpoint="lg"
        collapsedWidth="0"
        theme="light"
        className="border-r border-gray-200"
      >
        <div className="p-4 flex items-center justify-center font-bold text-lg text-blue-600 border-b border-gray-100 mb-2">
          StockFlow
        </div>
        <Menu
          theme="light"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
        />
      </Sider>
      
      <Layout>
        <Header className="bg-white px-6 flex justify-between items-center shadow-sm border-b border-gray-200">
          <div className="text-gray-800 font-medium hidden md:block">
            Dashboard
          </div>
          <div className="flex items-center gap-4 ml-auto">
            <span className="text-gray-600">{user?.email}</span>
            <Button type="text" icon={<LogoutOutlined />} onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </Header>
        
        <Content className="p-6 md:p-8 bg-gray-50 overflow-auto">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
