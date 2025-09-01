import React, { useState, useEffect } from 'react';
import { Search, CheckCircle, Clock, AlertTriangle, X } from 'lucide-react';
import { firebaseHelpers } from '../firebase/config';

const RootCauseSolving = () => {
  const [rootCauses, setRootCauses] = useState([]);
  const [filteredRootCauses, setFilteredRootCauses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Root cause mapping rules
  const rootCauseMapping = {
    'Spare Parts (Longtree)': 'Spare parts MIN/MRP confirmation',
    'No Requirement': 'Add into BoM or Kanban',
    'No part code': 'Add Part code',
    'Lead days too long': 'Change the Lead days'
  };

  useEffect(() => {
    const unsubscribe = firebaseHelpers.getShortages((snapshot) => {
      const data = snapshot.val();
      if (data) {
        const shortagesList = Object.entries(data).map(([id, shortage]) => ({
          id,
          ...shortage
        }));

        // Process shortages to create root cause items
        const rootCauseItems = [];
        
        shortagesList.forEach(shortage => {
          (shortage.reasonTags || []).forEach(reason => {
            if (rootCauseMapping[reason]) {
              // Get display description - use customPartName for "not found" materials
              const description = shortage.customPartName || shortage.displayName;
              
              rootCauseItems.push({
                id: `${shortage.id}_${reason}`,
                shortageId: shortage.id,
                partCode: shortage.partCode,
                description: description,
                source: shortage.source,
                reason: reason,
                rootCause: rootCauseMapping[reason],
                solutionCompleted: shortage.rootCauseSolutions?.[reason]?.completed || false,
                completedDate: shortage.rootCauseSolutions?.[reason]?.completedDate || null,
                notes: shortage.rootCauseSolutions?.[reason]?.notes || ''
              });
            }
          });
        });

        setRootCauses(rootCauseItems);
      } else {
        setRootCauses([]);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let filtered = [...rootCauses];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.partCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.rootCause.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort by completion status (incomplete first), then by part code
    filtered.sort((a, b) => {
      if (a.solutionCompleted !== b.solutionCompleted) {
        return a.solutionCompleted ? 1 : -1;
      }
      return a.partCode.localeCompare(b.partCode);
    });

    setFilteredRootCauses(filtered);
  }, [rootCauses, searchTerm]);

  const handleSolutionToggle = async (item) => {
    try {
      const shortage = await firebaseHelpers.getShortage(item.shortageId);
      const rootCauseSolutions = shortage.rootCauseSolutions || {};
      
      rootCauseSolutions[item.reason] = {
        completed: !item.solutionCompleted,
        completedDate: !item.solutionCompleted ? new Date().toISOString() : null,
        notes: item.notes
      };

      await firebaseHelpers.updateShortage(item.shortageId, {
        rootCauseSolutions: rootCauseSolutions,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating solution status:', error);
      alert('Error updating solution status');
    }
  };

  // UPDATED: 删除 root cause（无确认弹窗，真实删除数据库对应键）
  const handleDeleteRow = async (item) => {
    try {
      // 先读当前，待会判断是否还剩其它原因
      const shortage = await firebaseHelpers.getShortage(item.shortageId);
      const current = shortage?.rootCauseSolutions || {};

      // 1) 删除当前 reason（RTDB: 设置路径为 null 即删除该键）
      const updates = {
        [`rootCauseSolutions/${item.reason}`]: null,
        lastUpdated: new Date().toISOString(),
      };
      await firebaseHelpers.updateShortage(item.shortageId, updates);

      // 2) 如果删完后空了，则把整个 rootCauseSolutions 置为 null（清理空对象）
      const remainingKeys = Object.keys(current).filter(k => k !== item.reason);
      if (remainingKeys.length === 0) {
        await firebaseHelpers.updateShortage(item.shortageId, {
          rootCauseSolutions: null,
          lastUpdated: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Error deleting root cause item:', error);
      alert('Error deleting root cause item');
    }
  };

  const getSourceColor = (source) => {
    switch (source) {
      case 'kanban': return 'text-blue-600 bg-blue-50';
      case 'bom': return 'text-green-600 bg-green-50';
      case 'longtree': return 'text-purple-600 bg-purple-50';
      case 'other': return 'text-orange-600 bg-orange-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getCompletionStats = () => {
    const total = rootCauses.length;
    const completed = rootCauses.filter(item => item.solutionCompleted).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { total, completed, percentage };
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-gray-500">Loading root cause data...</div>
      </div>
    );
  }

  const stats = getCompletionStats();

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Root Cause Solving</h1>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-500">
            {stats.completed} of {stats.total} solutions completed ({stats.percentage}%)
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Root Causes</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total - stats.completed}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by part code, description, or root cause..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        {filteredRootCauses.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No root cause items found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Part Code
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Source
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Root Cause
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Solution Completed
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRootCauses.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {item.partCode}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {item.description}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSourceColor(item.source)}`}>
                        {item.source}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {item.rootCause}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        onClick={() => handleSolutionToggle(item)}
                        className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          item.solutionCompleted
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <CheckCircle className={`h-3 w-3 ${item.solutionCompleted ? 'text-green-600' : 'text-gray-400'}`} />
                        <span>{item.solutionCompleted ? 'Completed' : 'Pending'}</span>
                      </button>
                      {item.completedDate && (
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(item.completedDate).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        onClick={() => handleDeleteRow(item)}
                        className="flex items-center justify-center w-8 h-8 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full transition-colors"
                        title="Delete row"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default RootCauseSolving;
