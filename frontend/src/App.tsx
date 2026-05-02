import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '~/context/AuthContext';
import LandingPage from '~/pages/LandingPage';
import Dashboard from '~/pages/Dashboard';
import RoadmapView from '~/pages/RoadmapViewNew';
import Login from '~/pages/Login';
import Register from '~/pages/Register';

// Component bảo vệ Route
const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/roadmap/preview/:slug" element={<RoadmapView />} />
          <Route path="/roadmap/:id" element={<PrivateRoute><RoadmapView /></PrivateRoute>} />
          <Route path="/roadmap" element={<PrivateRoute><RoadmapView /></PrivateRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
