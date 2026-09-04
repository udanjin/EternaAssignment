import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ConfigProvider
        theme={{
          token: {
            fontFamily: "'Inter', sans-serif",
            colorPrimary: '#18181b', // zinc-900
            colorInfo: '#18181b',
            borderRadius: 6,
            colorBgContainer: '#ffffff',
            colorBorder: '#e4e4e7',
          },
          components: {
            Button: {
              controlHeight: 40,
              fontWeight: 500,
            },
            Input: {
              controlHeight: 40,
            },
            Select: {
              controlHeight: 40,
            },
          },
        }}
      >
        <App />
      </ConfigProvider>
    </BrowserRouter>
  </StrictMode>,
)
