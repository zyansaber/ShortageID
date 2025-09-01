import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { BarChart3, FileText, Search, Target, Monitor, Kanban } from 'lucide-react';
import Dashboard from './components/Dashboard';
import SummaryTable from './components/SummaryTable';
import ShortageIdentification from './components/ShortageIdentification';
import RootCauseSolving from './components/RootCauseSolving';
import SAPBIReport from './components/SAPBIReport';
import DisplayPage from './components/DisplayPage';
import KanbanView from './components/KanbanView';

const NavigationBar = () => {
  const location = useLocation();
  
  const navItems = [
    { path: '/', label: 'Dashboard', icon: BarChart3 },
    { path: '/summary', label: 'Summary', icon: FileText },
    { path: '/identification', label: 'Shortage Identification', icon: Search },
    { path: '/root-cause', label: 'Root Cause Solving', icon: Target },
    { path: '/kanban', label: 'Kanban Board', icon: Kanban },
    { path: '/sap-report', label: 'SAP BI Report', icon: BarChart3 },
    { path: '/display', label: 'Display Page', icon: Monitor }
  ];

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <h1 className="text-xl font-bold text-gray-900">Shortage Management</h1>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navItems.map((item) => {
                const IconComponent = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      isActive
                        ? 'border-blue-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <IconComponent className="h-4 w-4 mr-2" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <NavigationBar />
        <main>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/summary" element={<SummaryTable />} />
            <Route path="/identification" element={<ShortageIdentification />} />
            <Route path="/root-cause" element={<RootCauseSolving />} />
            <Route path="/kanban" element={<KanbanView />} />
            <Route path="/sap-report" element={<SAPBIReport />} />
            <Route path="/display" element={<DisplayPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;