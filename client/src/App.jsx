// ============================================================================
// App.jsx — Main Application Router & Layout
// ============================================================================
// WHY a central layout component?
//   Instead of importing the Sidebar into every page, we define the layout
//   shell here. The Sidebar stays fixed on the left, and React Router's
//   <Routes> component swaps out the main content area based on the URL.
// ============================================================================

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Explorer from './pages/Explorer';
import ApiTester from './pages/ApiTester';
import History from './pages/History';
import QueryInterface from './pages/QueryInterface';

function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        <Sidebar />
        
        <main className="main-content">
          {/* 
            React Router handles rendering the correct page component 
            based on the current URL path.
          */}
          <Routes>
            <Route path="/" element={<Explorer />} />
            <Route path="/tester" element={<ApiTester />} />
            <Route path="/history" element={<History />} />
            <Route path="/query" element={<QueryInterface />} />
            
            {/* Catch-all route redirects to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
