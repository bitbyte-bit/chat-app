import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from './store';
import Login from './pages/Login';
import Register from './pages/Register';
import Chat from './pages/Chat';
import Profile from './pages/Profile';
import Groups from './pages/Groups';
import './App.css';

function App() {
  const { token } = useSelector((state: RootState) => state.auth);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/chat" element={token ? <Chat /> : <Navigate to="/login" />} />
        <Route path="/profile/: userId" element={token ? <Profile /> : <Navigate to="/login" />} />
        <Route path="/groups" element={token ? <Groups /> : <Navigate to="/login" />} />
        <Route path="/" element={token ? <Navigate to="/chat" /> : <Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;