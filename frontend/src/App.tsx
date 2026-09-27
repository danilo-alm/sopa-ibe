import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminPage } from './pages/AdminPage';
import { OrderPage } from './pages/OrderPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<OrderPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

