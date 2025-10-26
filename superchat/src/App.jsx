import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';

import { auth } from './firebase.js';
import { useAuthStateCustom } from './hooks.js';

import AuthButton from './AuthButton.jsx';
import SignInPage from './SignInPage.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';
import MainDashboard from './MainDashboard.jsx';

function App() {
  const [user] = useAuthStateCustom(auth);

  return (
    <Router>
      <div className="App min-h-screen flex flex-col bg-gray-900 text-white">
        <header className="App-header bg-gray-800 shadow-lg z-10 border-b border-gray-700">
          <div className="header-row flex justify-between items-center p-4 max-w-7xl mx-auto w-full">
            <h1 className='text-2xl font-extrabold text-blue-400'>⚡️ SuperChat</h1>
            <nav className="flex space-x-4 items-center">
              <Link to="/" className="text-gray-300 hover:text-blue-400 transition">Home</Link>
              {user && <Link to="/dashboard" className="text-gray-300 hover:text-blue-400 transition">Dashboard</Link>}
            </nav>
            <AuthButton user={user} />
          </div>
        </header>

        <section className="main-content flex-1 max-w-7xl mx-auto w-full p-4">
          <Routes>
            <Route path="/" element={<SignInPage />} />
            <Route path="/dashboard/*" element={<ProtectedRoute user={user}><MainDashboard /></ProtectedRoute>} />
            <Route path="/chat" element={<Navigate to="/dashboard/public" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </section>
      </div>
    </Router>
  );
}

export default App;