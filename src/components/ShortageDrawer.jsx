import React, { useState } from 'react';
import { X, Calendar, User, Package, Clock, Edit2, Save } from 'lucide-react';
import { firebaseHelpers } from '../firebase/config';

const ShortageDrawer = ({ shortage, isOpen, onClose }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});

  React.useEffect(() => {
    if (shortage) {
      setEditData({
        assignedTeam: shortage.assignedTeam || '',
        eta: shortage.eta || '',
        transport: shortage.transport || '',
        notes: shortage.notes || ''
      });
    }
  }, [shortage]);

  const handleSave = async () => {
    try {
      await firebaseHelpers.updateShortage(shortage.id, {
        ...editData,
        lastUpdated: new Date().toISOString()
      });
      setIsEditing(false);
      onClose();
    } catch (error) {
      console.error('Error updating shortage:', error);
      alert('Error updating shortage');
    }
  };

  if (!isOpen || !shortage) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      
      <div className="absolute right-0 top-0 h-full w-96 bg-white shadow-xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Shortage Details</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <Edit2 className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto h-full pb-20">
          {/* Basic Info */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Basic Information</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500">Part Code</label>
                <p className="font-medium">{shortage.partCode}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">Description</label>
                <p className="text-sm text-gray-600">{shortage.displayName}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">Source</label>
                <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                  {shortage.source}
                </span>
              </div>
              <div>
                <label className="text-xs text-gray-500">Supplier</label>
                <p className="text-sm">{shortage.supplierName}</p>
              </div>
            </div>
          </div>

          {/* Shortage Reasons */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Shortage Reasons</h3>
            <div className="flex flex-wrap gap-2">
              {(shortage.reasonTags || []).map((reason, index) => (
                <span key={index} className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">
                  {reason}
                </span>
              ))}
            </div>
          </div>

          {/* Assignment */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Assignment</h3>
            {isEditing ? (
              <input
                type="text"
                value={editData.assignedTeam}
                onChange={(e) => setEditData({...editData, assignedTeam: e.target.value})}
                placeholder="Assigned Team"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-sm text-gray-600">{shortage.assignedTeam || 'Unassigned'}</p>
            )}
          </div>

          {/* ETA */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">ETA</h3>
            {isEditing ? (
              <input
                type="date"
                value={editData.eta}
                onChange={(e) => setEditData({...editData, eta: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <div>
                <p className="text-sm text-gray-600">{shortage.eta || 'Not set'}</p>
                {shortage.etaChangeCount > 0 && (
                  <p className="text-xs text-orange-600 mt-1">
                    Changed {shortage.etaChangeCount} times
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Transport */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Transport</h3>
            {isEditing ? (
              <select
                value={editData.transport}
                onChange={(e) => setEditData({...editData, transport: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select transport...</option>
                <option value="Airfreight">Airfreight</option>
                <option value="Seafreight">Seafreight</option>
                <option value="Local">Local</option>
              </select>
            ) : (
              <p className="text-sm text-gray-600">{shortage.transport || 'Not set'}</p>
            )}
          </div>

          {/* Notes */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Notes</h3>
            {isEditing ? (
              <textarea
                value={editData.notes}
                onChange={(e) => setEditData({...editData, notes: e.target.value})}
                placeholder="Add notes..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-sm text-gray-600">{shortage.notes || 'No notes'}</p>
            )}
          </div>

          {/* Timeline */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Timeline</h3>
            <div className="space-y-2 text-xs text-gray-500">
              <div className="flex items-center">
                <Calendar className="h-3 w-3 mr-2" />
                Created: {new Date(shortage.createdAt).toLocaleString()}
              </div>
              {shortage.lastUpdated && (
                <div className="flex items-center">
                  <Clock className="h-3 w-3 mr-2" />
                  Updated: {new Date(shortage.lastUpdated).toLocaleString()}
                </div>
              )}
              {shortage.resolvedAt && (
                <div className="flex items-center">
                  <Package className="h-3 w-3 mr-2" />
                  Resolved: {new Date(shortage.resolvedAt).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Save Button */}
        {isEditing && (
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t border-gray-200">
            <button
              onClick={handleSave}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShortageDrawer;