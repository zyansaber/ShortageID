import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, CheckCircle, Calendar, Printer, Package } from 'lucide-react';
import { firebaseHelpers } from '../firebase/config';

const SummaryTable = () => {
  const [shortages, setShortages] = useState([]);
  const [filteredShortages, setFilteredShortages] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('unresolved'); // Default to unresolved
  const [sourceFilter, setSourceFilter] = useState('all');
  const [teamFilter, setTeamFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [editingETA, setEditingETA] = useState(null);
  const [editingTransport, setEditingTransport] = useState(null);
  const [editingTeam, setEditingTeam] = useState(null);
  const [editingSource, setEditingSource] = useState(null);
  const [partImages, setPartImages] = useState({});

  // Simplified workflow steps - Requisition needs to be clicked
  const workflowSteps = [
    { id: 'created', label: 'Created', icon: Plus },
    { id: 'requisition', label: 'Requisition', icon: Plus },
    { id: 'ordering', label: 'Ordering', icon: Calendar },
    { id: 'received', label: 'Goods Received', icon: CheckCircle }
  ];

  const transportOptions = ['Airfreight', 'Seafreight', 'Local'];
  const teamOptions = ['Planning team', 'Purchase', 'Design', 'Store'];
  const sourceOptions = ['bom', 'kanban', 'longtree', 'other'];

  const getTransportColor = (transport) => {
    switch (transport) {
      case 'Airfreight': return 'bg-red-100 text-red-800';
      case 'Seafreight': return 'bg-blue-100 text-blue-800';
      case 'Local': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTimeSpentColor = (timeSpent) => {
    if (timeSpent <= 3) return 'bg-green-50';
    if (timeSpent <= 7) return 'bg-yellow-50';
    if (timeSpent <= 14) return 'bg-orange-50';
    return 'bg-red-100';
  };

  const getTimeSpentTextColor = (timeSpent) => {
    if (timeSpent <= 3) return 'text-green-800';
    if (timeSpent <= 7) return 'text-yellow-800';
    if (timeSpent <= 14) return 'text-orange-800';
    return 'text-red-800';
  };

  // Calculate ETA change count - only count changes after first ETA is set
  const calculateETAChangeCount = (shortage) => {
    if (!shortage.etaHistory || shortage.etaHistory.length <= 1) {
      return 0; // No changes if no history or only initial entry
    }
    
    // Find first non-empty ETA entry
    let firstValidETAIndex = -1;
    for (let i = 0; i < shortage.etaHistory.length; i++) {
      if (shortage.etaHistory[i].eta && shortage.etaHistory[i].eta.trim() !== '') {
        firstValidETAIndex = i;
        break;
      }
    }
    
    // If no valid ETA found, return 0
    if (firstValidETAIndex === -1) {
      return 0;
    }
    
    // Count changes after the first valid ETA
    return Math.max(0, shortage.etaHistory.length - firstValidETAIndex - 1);
  };

  useEffect(() => {
    const unsubscribe = firebaseHelpers.getShortages((snapshot) => {
      const data = snapshot.val();
      if (data) {
        const shortagesList = Object.entries(data).map(([id, shortage]) => ({
          id,
          ...shortage,
          timeSpent: calculateTimeSpent(shortage),
          etaChangeCount: calculateETAChangeCount(shortage)
        }));
        
        // Load images for all shortages
        shortagesList.forEach(async (shortage) => {
          if (shortage.partCode && shortage.partCode !== 'No part code' && !partImages[shortage.partCode]) {
            try {
              const imageUrl = await firebaseHelpers.getPartImage(shortage.partCode);
              if (imageUrl) {
                setPartImages(prev => ({ ...prev, [shortage.partCode]: imageUrl }));
              }
            } catch (error) {
              // Silently handle image loading errors
              setPartImages(prev => ({ ...prev, [shortage.partCode]: null }));
            }
          }
        });
        
        setShortages(shortagesList);
      } else {
        setShortages([]);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [partImages]);

  const calculateTimeSpent = (shortage) => {
    // Use shortageDate if available, otherwise use createdAt
    const created = new Date(shortage.shortageDate || shortage.createdAt);
    const resolved = shortage.resolvedAt ? new Date(shortage.resolvedAt) : new Date();
    const diffTime = Math.abs(resolved - created);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  useEffect(() => {
    let filtered = [...shortages];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(shortage =>
        shortage.partCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (shortage.displayName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (shortage.customPartName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (shortage.supplierName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (shortage.assignedTeam || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter === 'resolved') {
      filtered = filtered.filter(shortage => shortage.status === 'received');
    } else if (statusFilter === 'unresolved') {
      filtered = filtered.filter(shortage => shortage.status !== 'received');
    }

    // Source filter
    if (sourceFilter !== 'all') {
      filtered = filtered.filter(shortage => shortage.source === sourceFilter);
    }

    // Team filter
    if (teamFilter !== 'all') {
      filtered = filtered.filter(shortage => shortage.assignedTeam === teamFilter);
    }

    // Sort by shortage date (newest first), fallback to createdAt
    filtered.sort((a, b) => {
      const dateA = new Date(a.shortageDate || a.createdAt);
      const dateB = new Date(b.shortageDate || b.createdAt);
      return dateB - dateA;
    });

    setFilteredShortages(filtered);
  }, [shortages, searchTerm, statusFilter, sourceFilter, teamFilter]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'created': return 'text-gray-600 bg-gray-50';
      case 'requisition': return 'text-red-600 bg-red-50';
      case 'ordering': return 'text-blue-600 bg-blue-50';
      case 'received': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
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

  const getSourceLabel = (source) => {
    switch (source) {
      case 'bom': return 'BoM';
      case 'kanban': return 'Kanban';
      case 'longtree': return 'Longtree';
      case 'other': return 'Other';
      default: return source;
    }
  };

  const getCurrentStepIndex = (status) => {
    const stepMap = {
      'created': 0,
      'requisition': 1,
      'ordering': 2,
      'received': 3
    };
    return stepMap[status] || 0;
  };

  const handleStepClick = async (shortageId, stepId, currentStatus) => {
    if (stepId === currentStatus) return;
    
    try {
      const updates = { 
        status: stepId,
        lastUpdated: new Date().toISOString()
      };
      
      if (stepId === 'received') {
        updates.resolvedAt = new Date().toISOString();
      }
      
      await firebaseHelpers.updateShortage(shortageId, updates);
    } catch (error) {
      console.error('Error updating shortage status:', error);
      alert('Error updating status');
    }
  };

  const handleETAUpdate = async (shortageId, newETA) => {
    try {
      const shortage = shortages.find(s => s.id === shortageId);
      let etaHistory = shortage.etaHistory || [];
      
      // If this is the first ETA being set (no previous valid ETA), initialize history
      if (etaHistory.length === 0) {
        etaHistory = [{
          eta: newETA,
          date: new Date().toISOString(),
          changedBy: 'User',
          isInitial: true
        }];
      } else {
        // Add new ETA change to history
        etaHistory.push({
          eta: newETA,
          date: new Date().toISOString(),
          changedBy: 'User'
        });
      }

      // Auto-update status to ordering when ETA is set
      const updates = {
        eta: newETA,
        etaHistory: etaHistory,
        status: 'ordering', // Automatically set to ordering when ETA is set
        lastUpdated: new Date().toISOString()
      };

      await firebaseHelpers.updateShortage(shortageId, updates);
      
      setEditingETA(null);
    } catch (error) {
      console.error('Error updating ETA:', error);
      alert('Error updating ETA');
    }
  };

  const handleTransportUpdate = async (shortageId, transport) => {
    try {
      await firebaseHelpers.updateShortage(shortageId, {
        transport: transport,
        lastUpdated: new Date().toISOString()
      });
      setEditingTransport(null);
    } catch (error) {
      console.error('Error updating transport:', error);
      alert('Error updating transport');
    }
  };

  const handleTeamUpdate = async (shortageId, team) => {
    try {
      await firebaseHelpers.updateShortage(shortageId, {
        assignedTeam: team,
        lastUpdated: new Date().toISOString()
      });
      setEditingTeam(null);
    } catch (error) {
      console.error('Error updating team:', error);
      alert('Error updating team');
    }
  };

  const handleSourceUpdate = async (shortageId, source) => {
    try {
      await firebaseHelpers.updateShortage(shortageId, {
        source: source,
        lastUpdated: new Date().toISOString()
      });
      setEditingSource(null);
    } catch (error) {
      console.error('Error updating source:', error);
      alert('Error updating source');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'created': return 'Created';
      case 'requisition': return 'Requisition';
      case 'ordering': return 'Ordering';
      case 'received': return 'Goods Received';
      default: return status;
    }
  };

  // Get display description - use customPartName for "not found" materials
  const getDisplayDescription = (shortage) => {
    if (shortage.customPartName) {
      return shortage.customPartName;
    }
    return shortage.displayName;
  };

  // Get unique teams for filter dropdown
  const getUniqueTeams = () => {
    const teams = [...new Set(shortages.map(s => s.assignedTeam).filter(Boolean))];
    return teams.sort();
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-gray-500">Loading shortage cases...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Summary</h1>
        <div className="flex items-center space-x-4">
          <button
            onClick={handlePrint}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Printer className="h-4 w-4" />
            <span>Print PDF</span>
          </button>
          <div className="text-sm text-gray-500">
            {filteredShortages.length} of {shortages.length} cases
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by part code, description, supplier, or assigned team..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filters:</span>
          </div>

          {/* Status Filter - Button Style */}
          <div className="flex space-x-2">
            <button
              onClick={() => setStatusFilter('unresolved')}
              className={`px-3 py-1 rounded text-sm ${
                statusFilter === 'unresolved' 
                  ? 'bg-red-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Unresolved
            </button>
            <button
              onClick={() => setStatusFilter('resolved')}
              className={`px-3 py-1 rounded text-sm ${
                statusFilter === 'resolved' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Goods Received
            </button>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded text-sm ${
                statusFilter === 'all' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              All
            </button>
          </div>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded text-sm"
          >
            <option value="all">All Sources</option>
            <option value="kanban">Kanban</option>
            <option value="bom">BoM</option>
            <option value="longtree">Longtree</option>
            <option value="other">Other</option>
          </select>

          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded text-sm"
          >
            <option value="all">All Teams</option>
            {getUniqueTeams().map(team => (
              <option key={team} value={team}>{team}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        {filteredShortages.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No shortage cases found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                    Created / Time Spent
                  </th>
                  <th className="px-4 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                    Part Code
                  </th>
                  <th className="px-4 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-4 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                    Source
                  </th>
                  <th className="px-4 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                    Assigned Team
                  </th>
                  <th className="px-4 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                    Shortage Reason
                  </th>
                  <th className="px-4 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                    ETA
                  </th>
                  <th className="px-4 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                    Transport
                  </th>
                  <th className="px-4 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredShortages.map((shortage) => (
                  <React.Fragment key={shortage.id}>
                    {/* Main Row */}
                    <tr className="hover:bg-gray-50">
                      <td className={`px-4 py-4 text-base ${getTimeSpentColor(shortage.timeSpent)}`}>
                        <div className={`p-2 rounded ${getTimeSpentTextColor(shortage.timeSpent)} font-semibold text-lg`}>
                          <div>{new Date(shortage.shortageDate || shortage.createdAt).toLocaleDateString()}</div>
                          <div className="text-xl">{shortage.timeSpent} days</div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-base">
                        <div className="flex items-center space-x-3">
                          {/* Part Image - Small for table row */}
                          <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                            {partImages[shortage.partCode] && shortage.partCode !== 'No part code' ? (
                              <img
                                src={partImages[shortage.partCode]}
                                alt={shortage.partCode}
                                className="w-full h-full object-cover rounded"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div className={`flex items-center justify-center w-full h-full ${partImages[shortage.partCode] && shortage.partCode !== 'No part code' ? 'hidden' : 'flex'}`}>
                              <Package className="h-4 w-4 text-gray-400" />
                            </div>
                          </div>
                          <span className="font-medium text-gray-900 text-base">{shortage.partCode}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-base text-gray-600">
                        {getDisplayDescription(shortage)}
                      </td>
                      <td className="px-4 py-4 text-base">
                        {editingSource === shortage.id ? (
                          <select
                            defaultValue={shortage.source || ''}
                            onChange={(e) => handleSourceUpdate(shortage.id, e.target.value)}
                            onBlur={() => setEditingSource(null)}
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                            autoFocus
                          >
                            <option value="">Select source...</option>
                            {sourceOptions.map(option => (
                              <option key={option} value={option}>{getSourceLabel(option)}</option>
                            ))}
                          </select>
                        ) : (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingSource(shortage.id);
                            }}
                            className={`px-2 py-1 rounded-full text-sm font-medium cursor-pointer hover:opacity-80 ${getSourceColor(shortage.source)}`}
                          >
                            {getSourceLabel(shortage.source)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-base">
                        {editingTeam === shortage.id ? (
                          <select
                            defaultValue={shortage.assignedTeam || ''}
                            onChange={(e) => handleTeamUpdate(shortage.id, e.target.value)}
                            onBlur={() => setEditingTeam(null)}
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                            autoFocus
                          >
                            <option value="">Select team...</option>
                            {teamOptions.map(option => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        ) : (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingTeam(shortage.id);
                            }}
                            className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded text-base"
                          >
                            {shortage.assignedTeam || 'Assign team'}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-base">
                        <div className="flex flex-wrap gap-1">
                          {(shortage.reasonTags || []).slice(0, 2).map((reason, index) => (
                            <span key={index} className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm">
                              {reason}
                            </span>
                          ))}
                          {(shortage.reasonTags || []).length > 2 && (
                            <span className="text-sm text-gray-500">+{(shortage.reasonTags || []).length - 2}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-base">
                        {editingETA === shortage.id ? (
                          <input
                            type="date"
                            defaultValue={shortage.eta}
                            onBlur={(e) => handleETAUpdate(shortage.id, e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleETAUpdate(shortage.id, e.target.value)}
                            className="w-32 px-2 py-1 border border-gray-300 rounded text-sm"
                            autoFocus
                          />
                        ) : (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingETA(shortage.id);
                            }}
                            className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded text-base"
                          >
                            {shortage.eta || 'Set ETA'}
                            {shortage.etaChangeCount > 0 && (
                              <span className="ml-1 text-sm text-orange-600">
                                ({shortage.etaChangeCount} changes)
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-base">
                        {editingTransport === shortage.id ? (
                          <select
                            defaultValue={shortage.transport || ''}
                            onChange={(e) => handleTransportUpdate(shortage.id, e.target.value)}
                            onBlur={() => setEditingTransport(null)}
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                            autoFocus
                          >
                            <option value="">Select...</option>
                            {transportOptions.map(option => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        ) : (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingTransport(shortage.id);
                            }}
                            className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded text-base"
                          >
                            {shortage.transport ? (
                              <span className={`px-2 py-1 rounded text-sm font-medium ${getTransportColor(shortage.transport)}`}>
                                {shortage.transport}
                              </span>
                            ) : (
                              'Set Transport'
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-base">
                        <span className={`px-2 py-1 rounded-full text-sm font-medium ${getStatusColor(shortage.status)}`}>
                          {getStatusLabel(shortage.status)}
                        </span>
                      </td>
                    </tr>
                    
                    {/* Workflow Row */}
                    <tr>
                      <td colSpan="9" className="px-4 py-3 bg-gray-50">
                        <div className="flex items-center justify-start max-w-md">
                          {workflowSteps.map((step, index) => {
                            const currentStepIndex = getCurrentStepIndex(shortage.status);
                            const isCompleted = index <= currentStepIndex;
                            const isCurrent = index === currentStepIndex;
                            const IconComponent = step.icon;
                            
                            return (
                              <div key={step.id} className="flex items-center">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStepClick(shortage.id, step.id, shortage.status);
                                  }}
                                  className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors ${
                                    isCompleted
                                      ? 'bg-green-500 border-green-500 text-white'
                                      : isCurrent
                                      ? 'bg-blue-500 border-blue-500 text-white'
                                      : 'bg-white border-gray-300 text-gray-400 hover:border-gray-400'
                                  }`}
                                >
                                  <IconComponent className="h-4 w-4" />
                                </button>
                                
                                <div className="ml-2 text-sm text-gray-600">
                                  {step.label}
                                </div>
                                
                                {index < workflowSteps.length - 1 && (
                                  <div className={`ml-4 w-8 h-0.5 ${
                                    index < currentStepIndex ? 'bg-green-500' : 'bg-gray-300'
                                  }`} />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SummaryTable;