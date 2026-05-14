import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Navbar from './components/Navbar';

import Dashboard from './pages/Dashboard'; # This is the main dashboard page that shows an overview of the system and recent activity.
import QuestionManager from './pages/QuestionManager';
import GenerateTest from './pages/GenerateTest';
import TestPage from './pages/TestPage';
import ResultsPage from './pages/ResultsPage';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-ink-950 text-ink-100">
        <Navbar />

        <main className="lg:ml-60 pt-16 lg:pt-0">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/questions" element={<QuestionManager />} />
            <Route path="/generate-test" element={<GenerateTest />} />
            <Route path="/test/:id" element={<TestPage />} />
            <Route path="/results" element={<ResultsPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}