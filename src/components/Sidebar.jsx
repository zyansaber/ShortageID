import React from 'react';
import { BarChart3, Search, Package, FileText, Settings, ChevronLeft, ChevronRight, PieChart } from 'lucide-react';

const Sidebar = ({ activeView, setActiveView, collapsed, setCollapsed }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'shortage-identification', label: 'Shortage Identification', icon: Search },
    { id: 'kanban', label: 'Kanban', icon: Package },
    { id: 'summary', label: 'Summary', icon: FileText },
    { id: 'root-cause', label: 'Root Cause Solving', icon: Settings },
    { id: 'sap-bi', label: 'SAP BI Report', icon: PieChart }
  ];

  return (
    <div className={`bg-white border-r border-gray-200 shadow-sm transition-all duration-300 ${
      collapsed ? 'w-16' : 'w-64'
    }`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200 flex items-center justify-between">
        {!collapsed && (
          <h2 className="text-lg font-semibold text-gray-900">Shortage Management</h2>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-lg hover:bg-gray-100 text-gray-500"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
      
      {/* Navigation */}
      <nav className="px-4 space-y-2 mt-4">
        {menuItems.map((item) => {
          const IconComponent = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
                activeView === item.id
                  ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
              title={collapsed ? item.label : ''}
            >
              <IconComponent className="h-5 w-5 mr-3 flex-shrink-0" />
              {!collapsed && <span className="font-medium">{item.label}</span>}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default Sidebar;