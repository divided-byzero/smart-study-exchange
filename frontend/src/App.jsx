import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import ColdStartBanner from './components/ColdStartBanner.jsx';
import api from './services/api';

import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import VerifyEmail from './pages/VerifyEmail.jsx';
import Marketplace from './pages/Marketplace.jsx';
import BookDetails from './pages/BookDetails.jsx';
import UploadBook from './pages/UploadBook.jsx';
import Notes from './pages/Notes.jsx';
import NoteDetails from './pages/NoteDetails.jsx';
import AiAssistant from './pages/AiAssistant.jsx';
import QuizPractice from './pages/QuizPractice.jsx';
import SmartSearch from './pages/SmartSearch.jsx';
import Messages from './pages/Messages.jsx';
import Profile from './pages/Profile.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import NotFound from './pages/NotFound.jsx';

export default function App() {
  // Fire a silent warm-up ping as soon as the app loads, so Render's free-tier
  // backend has a head start waking up before the person even submits a form.
  // Failures here are expected/harmless (that's exactly the cold-start case).
  useEffect(() => {
    api.get('/health').catch(() => {});
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <ColdStartBanner />
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/marketplace/:id" element={<BookDetails />} />
          <Route path="/upload-book" element={<ProtectedRoute><UploadBook /></ProtectedRoute>} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/notes/:id" element={<NoteDetails />} />
          <Route path="/ai-assistant" element={<ProtectedRoute><AiAssistant /></ProtectedRoute>} />
          <Route path="/quiz/:quizId" element={<ProtectedRoute><QuizPractice /></ProtectedRoute>} />
          <Route path="/search" element={<SmartSearch />} />
          <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
          <Route path="/messages/:userId" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
