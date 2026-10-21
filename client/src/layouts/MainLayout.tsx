import React, { useState } from 'react';
import {
  Layout,
  Menu,
  Button,
  Avatar,
  Dropdown,
  Space,
  Typography,
  Tag,
  Grid,
  Drawer,
  theme,
} from 'antd';
import {
  DashboardOutlined,
  CheckSquareOutlined,
  FormOutlined,
  UserOutlined,
  ApartmentOutlined,
  FileSearchOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MenuOutlined,
  SettingOutlined,
  BookOutlined,
  QuestionCircleOutlined,
  SmileOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const { Header, Sider, Content, Footer } = Layout;
const { Text } = Typography;
const { useBreakpoint } = Grid;

export const MainLayout: React.FC = () => {
  const { token } = theme.useToken();
  const screens = useBreakpoint();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // ตรวจจับหน้าจอ iPad / Tablet (หน้าจอ < 992px ถือว่าเป็น tablet/iPad หรือมือถือ)
  const isTabletOrMobile = !screens.lg;

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  // เมนูนำทางตามสิทธิ์ของผู้ใช้
  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined style={{ fontSize: 18 }} />,
      label: 'แดชบอร์ด (Dashboard)',
    },
    {
      key: '/tasks',
      icon: <CheckSquareOutlined style={{ fontSize: 18 }} />,
      label: 'งานของฉัน (My Tasks)',
    },
    {
      key: '/department-forms',
      icon: <ApartmentOutlined style={{ fontSize: 18 }} />,
      label: 'คลังฟอร์มตามแผนก (Forms Portal)',
    },
    {
      key: '/child-screening',
      icon: <SmileOutlined style={{ fontSize: 18 }} />,
      label: 'ชุดคัดกรองเด็กและวัยรุ่น (Child Suite)',
    },
    {
      key: '/forms',
      icon: <FormOutlined style={{ fontSize: 18 }} />,
      label: 'จัดการแบบฟอร์ม (Studio)',
    },
    {
      key: '/docs',
      icon: <BookOutlined style={{ fontSize: 18 }} />,
      label: 'คู่มือการใช้งาน (Docs)',
    },
    ...(user?.role === 'ADMIN'
      ? [
          {
            type: 'divider' as const,
          },
          {
            key: 'admin-group',
            label: 'ผู้ดูแลระบบ (Admin)',
            type: 'group' as const,
            children: [
              {
                key: '/users',
                icon: <UserOutlined style={{ fontSize: 18 }} />,
                label: 'จัดการผู้ใช้งาน (Users)',
              },
              {
                key: '/departments',
                icon: <ApartmentOutlined style={{ fontSize: 18 }} />,
                label: 'จัดการแผนก (Departments)',
              },
              {
                key: '/audit-logs',
                icon: <FileSearchOutlined style={{ fontSize: 18 }} />,
                label: 'บันทึกประวัติ (Audit Logs)',
              },
              {
                key: '/settings',
                icon: <SettingOutlined style={{ fontSize: 18 }} />,
                label: 'ตั้งค่าระบบ (Settings)',
              },
            ],
          },
        ]
      : []),
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
    if (isTabletOrMobile) {
      setMobileDrawerOpen(false);
    }
  };

  const userDropdownItems = [
    {
      key: 'user-info',
      label: (
        <div style={{ padding: '4px 0' }}>
          <div style={{ fontWeight: 600 }}>{user?.fullName}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            @{user?.username} ({user?.department?.name || 'ไม่มีแผนก'})
          </Text>
        </div>
      ),
      disabled: true,
    },
    ...(user?.role === 'ADMIN'
      ? [
          {
            key: 'settings-shortcut',
            icon: <SettingOutlined />,
            label: 'ตั้งค่าระบบ (Settings)',
            onClick: () => navigate('/settings'),
          },
        ]
      : []),
    {
      key: 'docs-shortcut',
      icon: <BookOutlined />,
      label: 'คู่มือการใช้งาน (Docs)',
      onClick: () => navigate('/docs'),
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'ออกจากระบบ',
      danger: true,
      onClick: handleLogout,
    },
  ];

  const sidebarContent = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Brand Header */}
      <div
        style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          gap: 12,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          cursor: 'pointer',
        }}
        onClick={() => navigate('/dashboard')}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            backgroundColor: token.colorPrimary,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            flexShrink: 0,
          }}
        >
          <FormOutlined />
        </div>
        {(!collapsed || isTabletOrMobile) && (
          <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
            <div style={{ fontWeight: 700, fontSize: 17, lineHeight: 1.2 }}>FormLocal</div>
            <div style={{ fontSize: 11, color: token.colorTextSecondary }}>Internal Builder</div>
          </div>
        )}
      </div>

      {/* Main Navigation Menu */}
      <Menu
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={handleMenuClick}
        style={{
          flex: 1,
          borderRight: 0,
          paddingTop: 12,
          fontSize: 15,
        }}
      />
    </div>
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* 1. Desktop Sider */}
      {!isTabletOrMobile && (
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={(value) => setCollapsed(value)}
          trigger={null}
          width={250}
          theme="light"
          style={{
            borderRight: `1px solid ${token.colorBorderSecondary}`,
            position: 'sticky',
            top: 0,
            height: '100vh',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
          }}
        >
          {sidebarContent}
        </Sider>
      )}

      {/* 2. iPad / Tablet Drawer Sider */}
      {isTabletOrMobile && (
        <Drawer
          placement="left"
          open={mobileDrawerOpen}
          onClose={() => setMobileDrawerOpen(false)}
          styles={{ body: { padding: 0 } }}
          width={280}
        >
          {sidebarContent}
        </Drawer>
      )}

      <Layout>
        {/* Top Header */}
        <Header
          style={{
            padding: screens.xs ? '0 12px' : '0 20px',
            background: token.colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            position: 'sticky',
            top: 0,
            zIndex: 10,
            height: 64,
          }}
        >
          {/* Left: Collapse toggle button & Title */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: screens.xs ? 8 : 12,
              minWidth: 0,
              flex: 1,
              marginRight: 8,
              overflow: 'hidden',
            }}
          >
            {isTabletOrMobile ? (
              <Button
                type="text"
                icon={<MenuOutlined style={{ fontSize: 18 }} />}
                onClick={() => setMobileDrawerOpen(true)}
                style={{ width: 38, height: 38, flexShrink: 0 }}
                aria-label="เปิดเมนู"
              />
            ) : (
              <Button
                type="text"
                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={() => setCollapsed(!collapsed)}
                style={{ width: 40, height: 40, flexShrink: 0 }}
                aria-label="ย่อ/ขยายเมนู"
              />
            )}
            <Text
              strong
              style={{
                fontSize: screens.xs ? 15 : 16,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: 'block',
              }}
            >
              {screens.xs
                ? (
                    menuItems
                      .flatMap((item: any) => item.children || [item])
                      .find((item: any) => item?.key === location.pathname)?.label || 'ระบบฟอร์มภายใน'
                  ).replace(/\s*\([^)]*\)$/, '')
                : menuItems
                    .flatMap((item: any) => item.children || [item])
                    .find((item: any) => item?.key === location.pathname)?.label || 'ระบบฟอร์มภายใน'}
            </Text>
          </div>

          {/* Right: User Profile & Actions */}
          <Space size={screens.xs ? 6 : 'middle'} align="center" wrap={false} style={{ flexShrink: 0 }}>
            {user?.department?.name && screens.sm && (
              <Tag color="cyan" style={{ margin: 0, borderRadius: 6, padding: '2px 8px' }}>
                {user.department.name}
              </Tag>
            )}

            <Tag
              color={user?.role === 'ADMIN' ? 'volcano' : 'blue'}
              style={{ margin: 0, borderRadius: 6, fontWeight: 500 }}
            >
              {user?.role}
            </Tag>

            <Button
              type="text"
              icon={<QuestionCircleOutlined style={{ fontSize: 17, color: '#1677ff' }} />}
              onClick={() => navigate('/docs')}
              title="คู่มือการใช้งานระบบ FormLocal"
              style={{
                borderRadius: 8,
                backgroundColor: location.pathname === '/docs' ? '#e6f4ff' : undefined,
                height: 38,
                padding: screens.xs ? '4px 8px' : undefined,
              }}
            >
              {screens.md && <span style={{ color: '#1677ff', fontWeight: 500 }}>คู่มือการใช้งาน</span>}
            </Button>

            <Dropdown menu={{ items: userDropdownItems }} trigger={['click']} placement="bottomRight">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: 8,
                  transition: 'background-color 0.2s',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                <Avatar
                  style={{
                    backgroundColor: user?.role === 'ADMIN' ? '#f56a00' : '#1890ff',
                    flexShrink: 0,
                  }}
                  size={36}
                >
                  {user?.fullName ? user.fullName[0].toUpperCase() : 'U'}
                </Avatar>
                {screens.sm && (
                  <Text
                    style={{
                      fontWeight: 500,
                      maxWidth: 240,
                      whiteSpace: 'nowrap',
                    }}
                    ellipsis={{ tooltip: user?.fullName }}
                  >
                    {user?.fullName}
                  </Text>
                )}
              </div>
            </Dropdown>
          </Space>
        </Header>

        {/* Content Area */}
        <Content
          style={{
            margin: screens.xs ? '12px 8px' : '20px 20px',
            padding: screens.xs ? '14px 12px' : '24px',
            minHeight: 'calc(100vh - 170px)',
            background: token.colorBgContainer,
            borderRadius: screens.xs ? 8 : 12,
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <Outlet />
        </Content>

        {/* Footer */}
        <Footer
          style={{
            textAlign: 'center',
            padding: '14px 24px 18px 24px',
            color: token.colorTextSecondary,
            fontSize: 13,
            background: 'transparent',
          }}
        >
          FormLocal ©{new Date().getFullYear()} — Powered By: <strong style={{ color: token.colorPrimary }}>Pantamit.Y</strong>
        </Footer>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
