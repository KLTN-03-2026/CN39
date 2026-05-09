import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '~/context/AuthContext';
import { Toaster } from 'react-hot-toast';
import LandingPage from '~/pages/LandingPage';
import Dashboard from '~/pages/Dashboard';
import MyRoadmaps from '~/pages/MyRoadmaps';
import NewRoadmap from '~/pages/NewRoadmap';
import RoadmapView from '~/pages/RoadmapView';
import LearnView from '~/pages/LearnView';
import ResourcesLibrary from '~/pages/ResourcesLibrary';
import Bookmarks from '~/pages/Bookmarks';
import Login from '~/pages/Login';
import Register from '~/pages/Register';
import AppLayout from '~/components/AppLayout';

// Component bảo vệ Route - Chỉ cho phép khi đã đăng nhập
const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Component bảo vệ Route - Chỉ cho phép khi CHƯA đăng nhập
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
};

function App() {
  return (
    <AuthProvider>
      <Toaster 
        position="top-right" 
        toastOptions={{
          style: {
            background: '#fff',
            border: '1px solid #e6e8ea',
            color: '#2d3337',
            fontWeight: '500',
            borderRadius: '12px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.06)'
          },
          success: {
            style: { borderLeft: '4px solid #00687b' },
            iconTheme: { primary: '#00687b', secondary: '#fff' },
          },
          error: {
            style: { borderLeft: '4px solid #ac3149' },
            iconTheme: { primary: '#ac3149', secondary: '#fff' },
          }
        }} 
      />
      <BrowserRouter>
        <Routes>
          {/* Public Only — không có sidebar */}
          <Route path="/" element={<PublicRoute><LandingPage /></PublicRoute>} />
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          
          {/* Protected — có sidebar layout */}
          <Route element={<PrivateRoute><AppLayout /></PrivateRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/my-roadmaps" element={<MyRoadmaps />} />
            <Route path="/new-roadmap" element={<NewRoadmap />} />
            <Route path="/roadmap/preview/:slug" element={<RoadmapView />} />
            <Route path="/roadmap/learn/:id/:topicId" element={<LearnView />} />
            <Route path="/roadmap/:id" element={<RoadmapView />} />
            <Route path="/resources" element={<ResourcesLibrary />} />
            <Route path="/bookmarks" element={<Bookmarks />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App;
