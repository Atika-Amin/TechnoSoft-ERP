import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createBrowserRouter, RouterProvider } from 'react-router';
import LandingPage from './features/landing/pages/LandingPage';
import LoginPage from './features/auth/pages/LoginPage';
import ChartOfAccountsPage from './features/accounts/pages/ChartOfAccountsPage';
import VoucherPage from './features/vouchers/pages/VoucherPage';
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './routes/ProtectedRoute';
import './index.css';

const queryClient = new QueryClient();

const placeholder = (text: string) => (
  <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">
    {text}
  </div>
);

const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <MainLayout />,
        children: [
          { path: '/home', element: placeholder('Welcome to Technosoft. Choose a module from the sidebar.') },
          { path: '/accounts/chart', element: <ChartOfAccountsPage /> },
          { path: '/accounts/vouchers', element: <VoucherPage /> },
          { path: '*', element: placeholder('This page is coming soon.') },
        ],
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>,
);
