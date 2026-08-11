import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';
import ErrorBoundary from './components/ErrorBoundary';

// Public Pages
import Home from './pages/Home';
import Staff from './pages/Staff';
import Store from './pages/Store';
import Vote from './pages/Vote';
import Patrons from './pages/Patrons';
import Rules from './pages/Rules';
import Leaderboard from './pages/Leaderboard';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import McAdmin from './pages/McAdmin';
import Auth from './pages/Auth';
import ProductDetail from './pages/ProductDetail';
import CategoryDetail from './pages/CategoryDetail';
import NewsDetail from './pages/NewsDetail';
import NotFound from './pages/NotFound';

// Admin Pages
import Dashboard from './pages/admin/Dashboard';
import Orders from './pages/admin/Orders';
import PurchasesVerification from './pages/admin/PurchasesVerification';
import Inventory from './pages/admin/Inventory';
import StaffRanks from './pages/admin/StaffRanks';
import Settings from './pages/admin/Settings';

import { SettingsProvider } from './context/SettingsContext';

export default function App() {
  return (
    <ErrorBoundary>
      <SettingsProvider>
        <Router>
          <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Layout><Home /></Layout>} />
          <Route path="/news/:id" element={<Layout><NewsDetail /></Layout>} />
          <Route path="/staff" element={<Layout><Staff /></Layout>} />
          <Route path="/store" element={<Layout><Store /></Layout>} />
          <Route path="/category/:id" element={<Layout><CategoryDetail /></Layout>} />
          <Route path="/product/:id" element={<Layout><ProductDetail /></Layout>} />
          <Route path="/vote" element={<Layout><Vote /></Layout>} />
          <Route path="/patrons" element={<Layout><Patrons /></Layout>} />
          <Route path="/rules" element={<Layout><Rules /></Layout>} />
          <Route path="/leaderboard" element={<Layout><Leaderboard /></Layout>} />
          <Route path="/cart" element={<Layout><Cart /></Layout>} />
          <Route path="/checkout" element={<Layout><Checkout /></Layout>} />
          <Route path="/mcadmin" element={<McAdmin />} />
          <Route path="/login" element={<Layout><Auth /></Layout>} />
          <Route path="/register" element={<Layout><Auth /></Layout>} />

          {/* Admin Routes */}
          <Route path="/admin" element={<AdminLayout><Dashboard /></AdminLayout>} />
          <Route path="/admin/orders" element={<AdminLayout><Orders /></AdminLayout>} />
          <Route path="/admin/verify" element={<AdminLayout><PurchasesVerification /></AdminLayout>} />
          <Route path="/admin/inventory" element={<AdminLayout><Inventory /></AdminLayout>} />
          <Route path="/admin/staff" element={<AdminLayout><StaffRanks /></AdminLayout>} />
          <Route path="/admin/settings" element={<AdminLayout><Settings /></AdminLayout>} />

          {/* Fallback */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
      </SettingsProvider>
    </ErrorBoundary>
  );
}
