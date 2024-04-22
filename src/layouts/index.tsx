import { Outlet } from 'umi';
import { ConfigProvider } from 'antd';

export default function Layout() {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#000000',
          colorInfo: '#000000',
          colorLink: '#1677ff',
          borderRadius: 4,
          wireframe: true,
        },
      }}
    >
      <Outlet />
    </ConfigProvider>
  );
}
