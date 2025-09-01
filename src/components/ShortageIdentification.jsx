import React, { useState, useEffect } from 'react';
import { Search, Plus, AlertCircle, Package, X } from 'lucide-react';
import { firebaseHelpers } from '../firebase/config';
import { shortageReasons } from '../data/mockShortageData';

const ShortageIdentification = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [reasonTags, setReasonTags] = useState([]);
  const [assignedTo, setAssignedTo] = useState('');
  const [shortageDate, setShortageDate] = useState(new Date().toISOString().split('T')[0]);
  const [newMaterialName, setNewMaterialName] = useState('');
  const [suggestedReason, setSuggestedReason] = useState('');
  const [itemImages, setItemImages] = useState({});

  // Get all existing shortage reasons from Firebase data and predefined reasons
  const getAllExistingReasons = () => {
    // Use predefined reasons as base
    return shortageReasons;
  };

  const availableReasons = getAllExistingReasons();
  // Align with SummaryTable team options
  const assignmentOptions = ['Planning team', 'Purchase', 'Design', 'Store'];

  // Load image for a part code
  const loadPartImage = async (partCode) => {
    if (!partCode || itemImages[partCode] !== undefined) return;
    
    try {
      const imageUrl = await firebaseHelpers.getPartImage(partCode);
      setItemImages(prev => ({ ...prev, [partCode]: imageUrl }));
    } catch (error) {
      setItemImages(prev => ({ ...prev, [partCode]: null }));
    }
  };

  // Real-time search using original Firebase method
  useEffect(() => {
    if (searchTerm.length > 2 && !selectedItem) {
      setIsLoading(true);
      setShowDropdown(true);
      
      const unsubscribe = firebaseHelpers.searchMaterials(searchTerm, (results) => {
        const formattedResults = results.map(([partCode, item]) => ({
          partCode,
          ...item
        }));
        
        setSearchResults(formattedResults);
        
        // Load images for search results
        formattedResults.forEach(item => {
          if (item.partCode) {
            loadPartImage(item.partCode);
          }
        });
        
        setIsLoading(false);
      });

      return () => unsubscribe();
    } else {
      setSearchResults([]);
      setShowDropdown(false);
    }
  }, [searchTerm, selectedItem]);

  const getSourceFlag = (item) => {
    if (item.Source) {
      const source = item.Source.toLowerCase();
      if (source === 'kanban') return 'Kanban';
      if (source === 'bom') return 'BoM';
      if (source === 'longtree') return 'Longtree';
      return 'Other';
    }
    return 'None';
  };

  const handleItemSelect = (item) => {
    setSelectedItem(item);
    setShowDropdown(false);
    setSearchTerm(`${item.partCode} · ${item.Description || 'No description'} · ${getSourceFlag(item)}`);
    
    // Load image for selected item
    if (item.partCode) {
      loadPartImage(item.partCode);
    }
    
    // Auto-set suggested reason based on existing data
    if (item.ShortageReason) {
      setSuggestedReason(item.ShortageReason);
      setReasonTags([item.ShortageReason]);
    } else {
      // Auto-set reason tags based on source
      const source = getSourceFlag(item);
      if (source === 'Other') {
        setSuggestedReason('No Requirement');
        setReasonTags(['No Requirement']);
      } else if (source === 'None') {
        setSuggestedReason('No part code');
        setReasonTags(['No part code']);
      } else {
        setSuggestedReason('');
        setReasonTags([]);
      }
    }
  };

  const handleNotFoundSelect = () => {
    const notFoundItem = {
      partCode: '',
      Description: '',
      Source: 'none',
      SupplierName: 'N/A'
    };
    setSelectedItem(notFoundItem);
    setShowDropdown(false);
    setSuggestedReason('No part code');
    setReasonTags(['No part code']);
    setNewMaterialName('');
  };

  const handleReasonToggle = (reason) => {
    if (reasonTags.includes(reason)) {
      setReasonTags(reasonTags.filter(tag => tag !== reason));
    } else {
      setReasonTags([...reasonTags, reason]);
    }
  };

  const handleCreateShortageCase = async () => {
    if (!selectedItem) return;

    if (reasonTags.length === 0) {
      alert('Please select at least one shortage reason');
      return;
    }

    // For "None" source, require either part code or material name
    if (getSourceFlag(selectedItem) === 'None' && !selectedItem.partCode && !newMaterialName) {
      alert('Please enter part name for new material');
      return;
    }

    try {
      const displayName = getSourceFlag(selectedItem) === 'None' && newMaterialName 
        ? newMaterialName 
        : (selectedItem.Description || selectedItem.partCode);

      const shortageData = {
        partCode: selectedItem.partCode || 'No part code',
        displayName: displayName,
        source: getSourceFlag(selectedItem).toLowerCase(),
        supplierName: selectedItem.SupplierName || 'N/A',
        shortageDate: shortageDate,
        reasonTags: reasonTags,
        status: 'created',
        assignedTo: assignedTo,
        assignedTeam: assignedTo, // Use same value for both fields
        originalData: selectedItem,
        createdAt: shortageDate + 'T00:00:00.000Z', // Use shortage date as created date
        customPartName: newMaterialName, // Store custom part name for not found materials
        activity: [{
          type: 'create',
          by: 'Current User',
          at: new Date().toISOString()
        }]
      };

      await firebaseHelpers.createShortageCase(shortageData);
      alert('Shortage case created successfully!');
      
      // Reset form
      setSelectedItem(null);
      setSearchTerm('');
      setReasonTags([]);
      setAssignedTo('');
      setNewMaterialName('');
      setSuggestedReason('');
    } catch (error) {
      console.error('Error creating shortage case:', error);
      alert('Error creating shortage case');
    }
  };

  const renderSourceBanner = (source) => {
    if (source === 'Other') {
      return (
        <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <span className="text-sm font-medium text-orange-800">Not in requirement</span>
          </div>
        </div>
      );
    }
    if (source === 'None') {
      return (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <span className="text-sm font-medium text-red-800">Not in requirement / No part code</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderDetailFields = (item, source) => {
    const commonFields = [
      { label: 'Supplier Name', value: item.SupplierName || 'N/A' },
      { label: 'Stock LG0001', value: item.StockLG0001 || 0 },
      { label: 'Open PO Qty', value: item.OpenPOQty || 0 }
    ];

    let specificFields = [];

    switch (source) {
      case 'Kanban':
        specificFields = [
          { label: 'Kanban ID', value: item.KanbanID || 'N/A' },
          { label: 'Min Qty', value: item.MinQty || 0 },
          { label: 'Max Qty', value: item.MaxQty || 0 },
          { label: 'Lead Time Days', value: item.LeadTimeDays || 0 },
          { label: 'Avg Min Cover Days', value: item.AvgMinCoverDays || 0 },
          { label: 'Days Covered', value: item.DaysCovered || 0 },
          { label: 'Requisition Without PO', value: item.RequisitionWithoutPO || 0 },
          { label: 'Requisition Without PO Open Qty', value: item.RequisitionWithoutPOOpenQty || 0 }
        ];
        break;
      case 'BoM':
        specificFields = [
          { label: 'Recent 3M Issue Qty', value: item.Recent3MIssueQty || 0 },
          { label: 'Next Open PO Date', value: item.NextOpenPODate || 'N/A' },
          { label: 'First Overdue PO Date', value: item.FirstOverduePODate || 'N/A' },
          { label: 'Requisition Without PO', value: item.RequisitionWithoutPO || 0 },
          { label: 'Requisition Without PO Open Qty', value: item.RequisitionWithoutPOOpenQty || 0 },
          { label: 'PR Next Due Date', value: item.PRNextDueDate || 'N/A' },
          { label: 'PR First Overdue Date', value: item.PRFirstOverdueDate || 'N/A' }
        ];
        break;
      case 'Longtree':
        specificFields = [
          { label: 'Safety Stock', value: item.SafetyStock || 0 }
        ];
        break;
      case 'Other':
        specificFields = [
          { label: 'Lead Time Days', value: item.LeadTimeDays || 0 }
        ];
        break;
    }

    const allFields = [...commonFields, ...specificFields];

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {allFields.map((field, index) => (
          <div key={index} className="text-sm">
            <span className="text-gray-500">{field.label}:</span>
            <div className="font-medium text-gray-900">{field.value}</div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Shortage Identification</h1>
      
      {/* Search Bar with Dropdown */}
      <div className="mb-6 relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => searchTerm.length > 2 && !selectedItem && setShowDropdown(true)}
            placeholder="Search by part code or material description..."
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
          />
          {selectedItem && (
            <button
              onClick={() => {
                setSelectedItem(null);
                setSearchTerm('');
                setReasonTags([]);
                setNewMaterialName('');
                setSuggestedReason('');
              }}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Dropdown Results - Only show when no item is selected */}
        {showDropdown && !selectedItem && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500">Searching...</div>
            ) : (
              <>
                {searchResults.map((item, index) => (
                  <div
                    key={index}
                    onClick={() => handleItemSelect(item)}
                    className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                  >
                    <div className="flex items-center space-x-3">
                      {/* Small image for dropdown */}
                      <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                        {itemImages[item.partCode] ? (
                          <img
                            src={itemImages[item.partCode]}
                            alt={item.partCode}
                            className="w-full h-full object-cover rounded"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div className={`flex items-center justify-center w-full h-full ${itemImages[item.partCode] ? 'hidden' : 'flex'}`}>
                          <Package className="h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {item.partCode} · {item.Description || 'No description'} · {getSourceFlag(item)}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          Supplier: {item.SupplierName || 'N/A'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {searchResults.length > 0 && (
                  <div
                    onClick={handleNotFoundSelect}
                    className="p-3 hover:bg-gray-50 cursor-pointer border-t border-gray-200 bg-gray-50"
                  >
                    <div className="font-medium text-gray-700 flex items-center space-x-2">
                      <Package className="h-4 w-4" />
                      <span>Not found material</span>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">Create new material entry</div>
                  </div>
                )}
                
                {searchResults.length === 0 && searchTerm.length > 2 && (
                  <div
                    onClick={handleNotFoundSelect}
                    className="p-3 hover:bg-gray-50 cursor-pointer"
                  >
                    <div className="font-medium text-gray-700 flex items-center space-x-2">
                      <Package className="h-4 w-4" />
                      <span>Not found material</span>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">Create new material entry</div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Detail Card - Always visible when item is selected */}
      {selectedItem && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          {renderSourceBanner(getSourceFlag(selectedItem))}
          
          {/* Card Header with Image */}
          <div className="mb-4 flex items-start space-x-4">
            {/* Large image for card */}
            <div className="flex-shrink-0 w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center">
              {selectedItem.partCode && itemImages[selectedItem.partCode] ? (
                <img
                  src={itemImages[selectedItem.partCode]}
                  alt={selectedItem.partCode}
                  className="w-full h-full object-cover rounded-lg"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div className={`flex items-center justify-center w-full h-full ${selectedItem.partCode && itemImages[selectedItem.partCode] ? 'hidden' : 'flex'}`}>
                <Package className="h-8 w-8 text-gray-400" />
              </div>
            </div>
            
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900">
                {selectedItem.partCode || 'New Material'} – {selectedItem.Description || 'No description'}
              </h3>
              <div className="mt-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Source: {getSourceFlag(selectedItem)}
                </span>
              </div>
            </div>
          </div>

          {/* Part Name Input for None source or when partCode is empty */}
          {(getSourceFlag(selectedItem) === 'None' || !selectedItem.partCode) && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Part Name *
              </label>
              <input
                type="text"
                value={newMaterialName}
                onChange={(e) => setNewMaterialName(e.target.value)}
                placeholder="Enter part name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Supplier */}
          <div className="mb-4">
            <span className="text-sm text-gray-500">Supplier:</span>
            <div className="font-medium text-gray-900">{selectedItem.SupplierName || 'N/A'}</div>
          </div>

          {/* Shortage Date */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Shortage Date
            </label>
            <input
              type="date"
              value={shortageDate}
              onChange={(e) => setShortageDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Shortage Reason with Suggestion */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Shortage Reason *
              {suggestedReason && (
                <span className="ml-2 text-sm text-blue-600 font-normal">
                  (Suggested: {suggestedReason})
                </span>
              )}
            </label>
            <div className="flex flex-wrap gap-2">
              {availableReasons.map(reason => (
                <button
                  key={reason}
                  onClick={() => handleReasonToggle(reason)}
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    reasonTags.includes(reason)
                      ? 'bg-red-600 text-white'
                      : reason === suggestedReason
                      ? 'bg-blue-100 text-blue-800 border border-blue-300'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>
          </div>

          {/* Assignment */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assign To
            </label>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select assignee</option>
              {assignmentOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          {/* Detailed Information - Always visible */}
          <div className="mb-6 pt-6 border-t border-gray-200">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Detailed Information</h4>
            {renderDetailFields(selectedItem, getSourceFlag(selectedItem))}
          </div>

          {/* Action Button */}
          <div className="flex items-center space-x-4">
            <button
              onClick={handleCreateShortageCase}
              className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              <Plus className="h-4 w-4" />
              <span>Create shortage case</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShortageIdentification;