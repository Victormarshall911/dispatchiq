import { Toaster } from 'react-hot-toast';

export default function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 3500,
        style: {
          background: '#16161A',
          color: '#e2e8f0',
          border: '1px solid #1e293b',
          borderRadius: '12px',
          fontSize: '13px',
          fontWeight: 500,
          padding: '12px 16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        },
        success: {
          iconTheme: {
            primary: '#10b981',
            secondary: '#000',
          },
        },
        error: {
          iconTheme: {
            primary: '#ef4444',
            secondary: '#fff',
          },
          style: {
            borderColor: '#991b1b40',
          },
        },
      }}
    />
  );
}
