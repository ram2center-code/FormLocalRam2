import React, { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { ConfigProvider, App as AntApp, theme } from 'antd';
import thTH from 'antd/locale/th_TH';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { router } from './routes';
import { useAuthStore } from './store/authStore';
import { useSettingsStore } from './store/settingsStore';

// ตั้งค่า locale ภาษาไทยให้ dayjs
dayjs.locale('th');

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export const App: React.FC = () => {
  const { initializeAuth } = useAuthStore();
  const { fetchSettings, getFontFamily } = useSettingsStore();

  useEffect(() => {
    // กู้คืนสถานะการเข้าสู่ระบบผ่าน httpOnly refresh token cookie เมื่อเปิดแอป
    initializeAuth();
    // โหลดการตั้งค่าระบบ (เช่น ฟอนต์ระบบ)
    fetchSettings();
  }, [initializeAuth, fetchSettings]);

  const activeFontFamily = getFontFamily();

  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        locale={thTH}
        theme={{
          algorithm: theme.defaultAlgorithm,
          token: {
            colorPrimary: '#1677ff', // Brand blue
            borderRadius: 8,
            controlHeight: 40, // เหมาะกับการสัมผัสบน iPad (Touch Target)
            fontSize: 15,
            fontFamily: activeFontFamily,
          },
          components: {
            Button: {
              controlHeight: 40,
              controlHeightLG: 48,
              fontWeight: 500,
            },
            Input: {
              controlHeight: 40,
              controlHeightLG: 46,
            },
            Select: {
              controlHeight: 40,
              controlHeightLG: 46,
            },
          },
        }}
      >
        <AntApp>
          <RouterProvider router={router} />
        </AntApp>
      </ConfigProvider>
    </QueryClientProvider>
  );
};

export default App;
