import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '~/context/AuthContext';
import { Toaster } from 'react-hot-toast';
import Dashboard from '~/pages/Dashboard';
import RoadmapView from '~/pages/RoadmapView';
import Login from '~/pages/Login';
import Register from '~/pages/Register';

// Component bảo vệ Route
const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

function App() {
  return (
    <AuthProvider>
      <Toaster 
        position="top-right" 
        toastOptions={{
          style: {
            background: '#ffdf00',
            border: '2px solid #000',
            color: '#000',
            fontWeight: 'bold',
            borderRadius: '4px',
            boxShadow: '4px 4px 0 rgba(0,0,0,1)'
          },
          success: {
            style: { background: '#a7f3d0' },
            iconTheme: { primary: '#059669', secondary: '#fff' },
          },
          error: {
            style: { background: '#fecaca' },
            iconTheme: { primary: '#dc2626', secondary: '#fff' },
          }
        }} 
      />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/roadmap/:id?" element={<PrivateRoute><RoadmapView /></PrivateRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App;
