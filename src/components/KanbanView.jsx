import React, { useState, useEffect } from 'react';
import { Search, Filter, Package, AlertCircle, X, Info } from 'lucide-react';
import { firebaseHelpers } from '../firebase/config';

const KanbanView = () => {
  const [kanbanData, setKanbanData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    stockBelowMin: false,
    hasOpenPO: false,
    supplier: 'all'
  });
  const [sortBy, setSortBy] = useState('kanbanId');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [supplierOptions, setSupplierOptions] = useState([]);

  // Natural sort function for Kanban IDs (1, 2, 3, ..., 9, 10, 11)
  const naturalSort = (a, b) => {
    const aNum = parseInt(a.match(/\d+/)?.[0] || '0');
    const bNum = parseInt(b.match(/\d+/)?.[0] || '0');
    return aNum - bNum;
  };

  useEffect(() => {
    console.log('Starting to fetch data from Firebase...');
    setDebugInfo('Connecting to Firebase...');
    
    try {
      const unsubscribe = firebaseHelpers.getShortageData((snapshot) => {
        console.log('Firebase callback triggered');
        setDebugInfo('Firebase callback received');
        
        const data = snapshot.val();
        console.log('Raw Firebase data:', data);
        
        if (data) {
          setDebugInfo(`Found ${Object.keys(data).length} total items in database`);
          
          const entries = Object.entries(data);
          
          // Filter only items where Source = "kanban"
          const kanbanItems = entries
            .filter(([partCode, item]) => {
              return item.Source === 'kanban';
            })
            .map(([partCode, item]) => ({
              partCode,
              ...item,
              daysCovered: item.DaysCovered || 0,
              stockLevel: getStockLevel(item)
            }));
          
          // Extract unique suppliers
          const suppliers = [...new Set(kanbanItems.map(item => item.SupplierName).filter(Boolean))];
          setSupplierOptions(suppliers);
          
          setKanbanData(kanbanItems);
          setDebugInfo(`Found ${kanbanItems.length} Kanban items out of ${entries.length} total items`);
        } else {
          setKanbanData([]);
          setSupplierOptions([]);
        }
        setIsLoading(false);
      });

      return () => unsubscribe();
    } catch (err) {
      console.error('Error setting up Firebase listener:', err);
      setError(err.message);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let filtered = [...kanbanData];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.partCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.Description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.MaterialSummary || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(item.KanbanID || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Stock filter
    if (filters.stockBelowMin) {
      filtered = filtered.filter(item => 
        (item.StockLG0001 || 0) < (item.MinQty || 0)
      );
    }

    // Open PO filter
    if (filters.hasOpenPO) {
      filtered = filtered.filter(item => (item.OpenPOQty || 0) > 0);
    }

    // Supplier filter
    if (filters.supplier !== 'all') {
      filtered = filtered.filter(item => item.SupplierName === filters.supplier);
    }

    // Sort with natural sorting for Kanban IDs
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'kanbanId':
          const aKanban = String(a.KanbanID || '');
          const bKanban = String(b.KanbanID || '');
          return naturalSort(aKanban, bKanban);
        case 'daysCovered':
          return (a.DaysCovered || 0) - (b.DaysCovered || 0);
        case 'openPOQty':
          return (b.OpenPOQty || 0) - (a.OpenPOQty || 0);
        case 'stockLG0001':
          return (a.StockLG0001 || 0) - (b.StockLG0001 || 0);
        default:
          return 0;
      }
    });

    setFilteredData(filtered);
  }, [kanbanData, searchTerm, filters, sortBy]);

  const getStockLevel = (item) => {
    const stock = item.StockLG0001 || 0;
    const minQty = item.MinQty || 0;
    
    if (stock <= minQty) return 'red';
    if (stock <= minQty * 1.1) return 'amber';
    return 'normal';
  };

  const getCardColor = (stockLevel) => {
    switch (stockLevel) {
      case 'red': return 'border-l-4 border-l-red-500 bg-red-50';
      case 'amber': return 'border-l-4 border-l-amber-500 bg-amber-50';
      default: return 'border-l-4 border-l-green-500 bg-white';
    }
  };

  const handleCreateShortage = async (item) => {
    const shortageData = {
      partCode: item.partCode,
      displayName: item.Description || item.partCode,
      source: 'kanban',
      supplierName: item.SupplierName || 'N/A',
      reasonTags: ['Other'],
      assignedTo: '',
      originalData: item
    };

    try {
      await firebaseHelpers.createShortageCase(shortageData);
      alert('Shortage case created successfully!');
    } catch (error) {
      console.error('Error creating shortage case:', error);
      alert('Error creating shortage case');
    }
  };

  const handleShowDetails = (item) => {
    setSelectedItem(item);
    setShowDetails(true);
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-500 mb-2">Loading Kanban data...</div>
          <div className="text-xs text-gray-400">{debugInfo}</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-2">Error loading data</div>
          <div className="text-xs text-gray-400">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Kanban</h1>
      
      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by part code, material name, or Kanban ID..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filters:</span>
          </div>
          
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={filters.stockBelowMin}
              onChange={(e) => setFilters({...filters, stockBelowMin: e.target.checked})}
              className="rounded"
            />
            <span className="text-sm text-gray-700">Stock &lt; MinQty</span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={filters.hasOpenPO}
              onChange={(e) => setFilters({...filters, hasOpenPO: e.target.checked})}
              className="rounded"
            />
            <span className="text-sm text-gray-700">Open PO &gt; 0</span>
          </label>

          <select
            value={filters.supplier}
            onChange={(e) => setFilters({...filters, supplier: e.target.value})}
            className="px-3 py-1 border border-gray-300 rounded text-sm"
          >
            <option value="all">All Suppliers</option>
            {supplierOptions.map(supplier => (
              <option key={supplier} value={supplier}>{supplier}</option>
            ))}
          </select>

          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded text-sm"
            >
              <option value="kanbanId">Kanban ID</option>
              <option value="daysCovered">Days Covered (asc)</option>
              <option value="openPOQty">Open PO Qty (desc)</option>
              <option value="stockLG0001">Stock LG0001 (asc)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      {filteredData.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {kanbanData.length === 0 
            ? "No Kanban materials found in database." 
            : "No materials match your search criteria."
          }
          <div className="text-xs mt-2">
            Total Kanban items in database: {kanbanData.length}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredData.map((item, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg shadow-sm border ${getCardColor(item.stockLevel)}`}
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-gray-900 text-sm">
                  {item.KanbanID ? `${item.KanbanID} - ${item.partCode}` : item.partCode}
                </h3>
                {item.stockLevel === 'red' && (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                )}
              </div>
              
              <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                {item.Description || 'No description'}
              </p>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Stock:</span>
                  <span className="font-medium">{item.StockLG0001 || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Min Qty:</span>
                  <span>{item.MinQty || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Open PO:</span>
                  <span>{item.OpenPOQty || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Days Covered:</span>
                  <span>{item.DaysCovered || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Lead Time:</span>
                  <span>{item.LeadTimeDays || 0} days</span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex items-center mb-2">
                  <Package className="h-3 w-3 text-gray-400 mr-1" />
                  <span className="text-xs text-gray-600 truncate">
                    {item.SupplierName || 'N/A'}
                  </span>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCreateShortage(item)}
                    className="flex-1 bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700"
                  >
                    Create shortage case
                  </button>
                  <button 
                    onClick={() => handleShowDetails(item)}
                    className="px-2 py-1 border border-gray-300 rounded text-xs hover:bg-gray-50 flex items-center"
                  >
                    <Info className="h-3 w-3 mr-1" />
                    Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Details Modal */}
      {showDetails && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedItem.KanbanID} - {selectedItem.partCode}
              </h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                {Object.entries(selectedItem).map(([key, value]) => (
                  <div key={key} className="flex flex-col">
                    <span className="text-gray-500 font-medium">{key}:</span>
                    <span className="text-gray-900">{String(value || 'N/A')}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KanbanView;