import React, { useState, useEffect } from 'react';
import { Package, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { firebaseHelpers } from '../firebase/config';

const DisplayPage = () => {
  const [shortages, setShortages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [partImages, setPartImages] = useState({});

  // Auto-refresh at 8:55 AM Melbourne time
  useEffect(() => {
    const checkAndRefresh = () => {
      const now = new Date();
      // Convert to Melbourne time (UTC+10/UTC+11 depending on DST)
      const melbourneTime = new Date(now.toLocaleString("en-US", {timeZone: "Australia/Melbourne"}));
      const hours = melbourneTime.getHours();
      const minutes = melbourneTime.getMinutes();
      
      // Refresh at 8:55 AM Melbourne time
      if (hours === 8 && minutes === 55) {
        window.location.reload();
      }
    };

    // Check every minute
    const interval = setInterval(checkAndRefresh, 60000);
    
    // Update current time every second
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(timeInterval);
    };
  }, []);

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
    const created = new Date(shortage.shortageDate || shortage.createdAt);
    const resolved = shortage.resolvedAt ? new Date(shortage.resolvedAt) : new Date();
    const diffTime = Math.abs(resolved - created);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const calculateETAChangeCount = (shortage) => {
    if (!shortage.etaHistory || shortage.etaHistory.length <= 1) {
      return 0;
    }
    
    let firstValidETAIndex = -1;
    for (let i = 0; i < shortage.etaHistory.length; i++) {
      if (shortage.etaHistory[i].eta && shortage.etaHistory[i].eta.trim() !== '') {
        firstValidETAIndex = i;
        break;
      }
    }
    
    if (firstValidETAIndex === -1) {
      return 0;
    }
    
    return Math.max(0, shortage.etaHistory.length - firstValidETAIndex - 1);
  };

  const getTimeSpentColor = (timeSpent) => {
    if (timeSpent <= 3) return 'bg-green-50 border-green-200';
    if (timeSpent <= 7) return 'bg-yellow-50 border-yellow-200';
    if (timeSpent <= 14) return 'bg-orange-50 border-orange-200';
    return 'bg-red-100 border-red-300';
  };

  const getTimeSpentTextColor = (timeSpent) => {
    if (timeSpent <= 3) return 'text-green-800';
    if (timeSpent <= 7) return 'text-yellow-800';
    if (timeSpent <= 14) return 'text-orange-800';
    return 'text-red-800';
  };

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

  const getTransportColor = (transport) => {
    switch (transport) {
      case 'Airfreight': return 'bg-red-100 text-red-800';
      case 'Seafreight': return 'bg-blue-100 text-blue-800';
      case 'Local': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
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

  const getDisplayDescription = (shortage) => {
    if (shortage.customPartName) {
      return shortage.customPartName;
    }
    return shortage.displayName;
  };

  // Sort shortages by shortage date (newest first)
  const sortedShortages = [...shortages].sort((a, b) => {
    const dateA = new Date(a.shortageDate || a.createdAt);
    const dateB = new Date(b.shortageDate || b.createdAt);
    return dateB - dateA;
  });

  // Get Melbourne time for display
  const getMelbourneTime = () => {
    return new Date(currentTime.toLocaleString("en-US", {timeZone: "Australia/Melbourne"}));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500 text-xl">Loading shortage cases...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6 p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Shortage Management Display</h1>
            <p className="text-lg text-gray-600">Real-time shortage tracking and monitoring</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500 mb-1">Melbourne Time</div>
            <div className="text-2xl font-mono font-bold text-gray-900">
              {getMelbourneTime().toLocaleTimeString()}
            </div>
            <div className="text-sm text-gray-600">
              {getMelbourneTime().toLocaleDateString()}
            </div>
            <div className="text-xs text-blue-600 mt-2">
              Auto-refresh at 8:55 AM daily
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Package className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Cases</p>
              <p className="text-3xl font-bold text-gray-900">{shortages.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Resolved</p>
              <p className="text-3xl font-bold text-gray-900">
                {shortages.filter(s => s.status === 'received').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Open Cases</p>
              <p className="text-3xl font-bold text-gray-900">
                {shortages.filter(s => s.status !== 'received').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-orange-100 rounded-lg">
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Days Open</p>
              <p className="text-3xl font-bold text-gray-900">
                {shortages.length > 0 
                  ? Math.round(shortages.reduce((sum, s) => sum + s.timeSpent, 0) / shortages.length)
                  : 0
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Shortage Cases Grid - Full Text Display */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">All Shortage Cases</h2>
          <p className="text-gray-600 mt-1">Complete overview of all shortage cases - full text display</p>
        </div>

        {sortedShortages.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-xl">No shortage cases found</p>
          </div>
        ) : (
          <div className="p-6">
            {/* Grid Layout - Larger cards to show full text */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {sortedShortages.map((shortage) => (
                <div key={shortage.id} className={`border rounded-lg p-5 ${getTimeSpentColor(shortage.timeSpent)} hover:shadow-md transition-shadow`}>
                  {/* Header - Time and Status */}
                  <div className="flex justify-between items-center mb-4">
                    <div className={`px-3 py-1 rounded font-bold text-sm ${getTimeSpentTextColor(shortage.timeSpent)}`}>
                      {shortage.timeSpent} days
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(shortage.status)}`}>
                      {getStatusLabel(shortage.status)}
                    </span>
                  </div>

                  {/* Part Info - Full display */}
                  <div className="flex items-start space-x-3 mb-4">
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
                        <Package className="h-5 w-5 text-gray-400" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-base text-gray-900 break-words">{shortage.partCode}</div>
                      <div className="text-sm text-gray-600 break-words mt-1">{getDisplayDescription(shortage)}</div>
                    </div>
                  </div>

                  {/* Full info layout */}
                  <div className="space-y-3 text-sm mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Source:</span>
                      <span className={`px-2 py-1 rounded text-sm ${getSourceColor(shortage.source)}`}>
                        {getSourceLabel(shortage.source)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Team:</span>
                      <span className="text-gray-700 break-words">{shortage.assignedTeam || 'None'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">ETA:</span>
                      <div className="text-gray-700 break-words text-right">
                        {shortage.eta || 'Not set'}
                        {shortage.etaChangeCount > 0 && (
                          <span className="text-orange-600 ml-1">({shortage.etaChangeCount} changes)</span>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Transport:</span>
                      {shortage.transport ? (
                        <span className={`px-2 py-1 rounded text-sm ${getTransportColor(shortage.transport)}`}>
                          {shortage.transport}
                        </span>
                      ) : (
                        <span className="text-gray-400">Not set</span>
                      )}
                    </div>
                  </div>

                  {/* Shortage Reasons - Full display */}
                  {shortage.reasonTags && shortage.reasonTags.length > 0 && (
                    <div className="mb-4">
                      <div className="text-gray-500 text-sm mb-2">Reasons:</div>
                      <div className="flex flex-wrap gap-2">
                        {shortage.reasonTags.map((reason, index) => (
                          <span key={index} className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm break-words">
                            {reason}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Date - Bottom */}
                  <div className="text-sm text-gray-500 text-center pt-3 border-t border-gray-200">
                    {new Date(shortage.shortageDate || shortage.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DisplayPage;