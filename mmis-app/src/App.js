import React, { useState, useEffect } from 'react';
import { AlertTriangle, Package, Wrench, ArrowLeft, ArrowRight, FileText, Bell, Search, Filter, BarChart3, TrendingDown } from 'lucide-react';

// Initial mock data structure
const INITIAL_DATA = {
  inventory: [
    { itemID: 'P001', name: 'Ball Bearing 6205', desc: 'Standard ball bearing', type: 'Part', currentStock: 45, minQuantityAlert: 20, lifeCycle: 90, unitOfMeasure: 'pieces', createdAt: Date.now() },
    { itemID: 'P002', name: 'V-Belt A50', desc: 'V-belt for pulley systems', type: 'Part', currentStock: 8, minQuantityAlert: 15, lifeCycle: 120, unitOfMeasure: 'pieces', createdAt: Date.now() },
    { itemID: 'P003', name: 'Hydraulic Oil 5L', desc: 'Industrial hydraulic oil', type: 'Part', currentStock: 25, minQuantityAlert: 10, lifeCycle: 180, unitOfMeasure: 'liters', createdAt: Date.now() },
    { itemID: 'T001', name: 'Torque Wrench', desc: '10-100 Nm torque wrench', type: 'Tool', currentStock: 12, minQuantityAlert: 5, lifeCycle: null, unitOfMeasure: 'pieces', createdAt: Date.now() },
    { itemID: 'T002', name: 'Digital Multimeter', desc: 'Fluke 87V multimeter', type: 'Tool', currentStock: 8, minQuantityAlert: 3, lifeCycle: null, unitOfMeasure: 'pieces', createdAt: Date.now() },
    { itemID: 'P004', name: 'Air Filter Element', desc: 'Compressor air filter', type: 'Part', currentStock: 3, minQuantityAlert: 12, lifeCycle: 60, unitOfMeasure: 'pieces', createdAt: Date.now() },
  ],
  machines: [
    ...Array.from({ length: 20 }, (_, i) => ({ machineID: `A-${String(i + 1).padStart(2, '0')}`, category: 'A', name: `A-${String(i + 1).padStart(2, '0')}`, lineProduct: 'Assembly Line' })),
    ...Array.from({ length: 20 }, (_, i) => ({ machineID: `B-${String(i + 1).padStart(2, '0')}`, category: 'B', name: `B-${String(i + 1).padStart(2, '0')}`, lineProduct: 'Processing Line' })),
    ...Array.from({ length: 20 }, (_, i) => ({ machineID: `C-${String(i + 1).padStart(2, '0')}`, category: 'C', name: `C-${String(i + 1).padStart(2, '0')}`, lineProduct: 'Packaging Line' })),
  ],
  employees: [
    { employeeID: 'E001', name: 'John Smith', designation: 'Senior Technician', sector: 'Mechanical', shift: 'Morning' },
    { employeeID: 'E002', name: 'Sarah Johnson', designation: 'Electrical Engineer', sector: 'Electrical', shift: 'Afternoon' },
    { employeeID: 'E003', name: 'Mike Davis', designation: 'Maintenance Tech', sector: 'Mechanical', shift: 'Night' },
    { employeeID: 'E004', name: 'Admin User', designation: 'Warehouse Manager', sector: 'Management', shift: 'Morning' },
  ],
  transactions: [],
  stockingHistory: [],
};

const MACHINE_CATEGORIES = ['A', 'B', 'C'];

export default function MMIS() {
  const [data, setData] = useState(INITIAL_DATA);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [pendingAction, setPendingAction] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [remarks, setRemarks] = useState('');
  const [workflowStep, setWorkflowStep] = useState('select-item');

  // Load data from storage on mount
  useEffect(() => {
    loadData();
  }, []);

  // Save data to storage whenever it changes
  useEffect(() => {
    saveData();
  }, [data]);

  const loadData = async () => {
    try {
      const result = await window.storage.get('mmis-data');
      if (result && result.value) {
        setData(JSON.parse(result.value));
      }
    } catch (error) {
      console.log('No existing data, using initial data');
    }
  };

  const saveData = async () => {
    try {
      await window.storage.set('mmis-data', JSON.stringify(data));
    } catch (error) {
      console.error('Error saving data:', error);
    }
  };

  const lowStockItems = data.inventory.filter(item => item.currentStock < item.minQuantityAlert);

  const handleActionSelect = (action) => {
    setPendingAction(action);
    setCurrentView('select-employee');
  };

  const handleEmployeeSelect = (employee) => {
    setCurrentUser(employee);
    if (pendingAction === 'request') {
      setCurrentView('request');
      setWorkflowStep('select-item');
    } else if (pendingAction === 'return') {
      setCurrentView('return');
    } else if (pendingAction === 'restock') {
      setCurrentView('restock');
    }
    setPendingAction(null);
  };

  const handleRequest = () => {
    if (!selectedItem || !selectedCategory || !selectedMachine || quantity <= 0) {
      alert('Please complete all fields');
      return;
    }

    const item = data.inventory.find(i => i.itemID === selectedItem);
    if (item.currentStock < quantity) {
      alert('Insufficient stock available');
      return;
    }

    const newTransaction = {
      transactionID: `T${Date.now()}`,
      itemID: selectedItem,
      employeeID: currentUser.employeeID,
      machineID: selectedMachine,
      quantityTaken: quantity,
      timestampOut: Date.now(),
      timestampIn: null,
      status: 'Active',
    };

    setData(prev => ({
      ...prev,
      inventory: prev.inventory.map(i =>
        i.itemID === selectedItem
          ? { ...i, currentStock: i.currentStock - quantity }
          : i
      ),
      transactions: [...prev.transactions, newTransaction],
    }));

    alert('Item requested successfully!');
    resetWorkflow();
  };

  const handleReturn = (transactionID) => {
    const transaction = data.transactions.find(t => t.transactionID === transactionID);
    if (!transaction) return;

    setData(prev => ({
      ...prev,
      inventory: prev.inventory.map(i =>
        i.itemID === transaction.itemID
          ? { ...i, currentStock: i.currentStock + transaction.quantityTaken }
          : i
      ),
      transactions: prev.transactions.map(t =>
        t.transactionID === transactionID
          ? { ...t, status: 'Completed', timestampIn: Date.now() }
          : t
      ),
    }));

    alert('Tool returned successfully!');
  };

  const handleRestock = () => {
    if (!selectedItem || quantity <= 0) {
      alert('Please select an item and enter quantity');
      return;
    }

    const newStockRecord = {
      restockID: `R${Date.now()}`,
      itemID: selectedItem,
      quantityAdded: quantity,
      timestamp: Date.now(),
      warehouseStaffID: currentUser.employeeID,
    };

    setData(prev => ({
      ...prev,
      inventory: prev.inventory.map(i =>
        i.itemID === selectedItem
          ? { ...i, currentStock: i.currentStock + quantity }
          : i
      ),
      stockingHistory: [...prev.stockingHistory, newStockRecord],
    }));

    alert('Stock replenished successfully!');
    resetWorkflow();
  };

  const handleDispute = (transactionID) => {
    const transaction = data.transactions.find(t => t.transactionID === transactionID);
    if (!transaction) return;

    const confirmed = window.confirm('Are you sure you want to dispute/cancel this transaction?');
    if (!confirmed) return;

    const item = data.inventory.find(i => i.itemID === transaction.itemID);
    
    setData(prev => ({
      ...prev,
      inventory: prev.inventory.map(i =>
        i.itemID === transaction.itemID && item.type === 'Part'
          ? { ...i, currentStock: i.currentStock + transaction.quantityTaken }
          : i
      ),
      transactions: prev.transactions.map(t =>
        t.transactionID === transactionID
          ? { ...t, status: 'Disputed' }
          : t
      ),
    }));

    alert('Transaction disputed and stock adjusted');
  };

  const resetWorkflow = () => {
    setSelectedCategory(null);
    setSelectedMachine(null);
    setSelectedItem(null);
    setQuantity(1);
    setWorkflowStep('select-item');
    setCurrentView('dashboard');
    setCurrentUser(null);
    setPendingAction(null);
  };

  const getActiveToolsForUser = () => {
    return data.transactions.filter(
      t => t.employeeID === currentUser?.employeeID &&
           t.status === 'Active' &&
           data.inventory.find(i => i.itemID === t.itemID)?.type === 'Tool'
    );
  };

  const calculateWeeklyReport = () => {
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const recentTransactions = data.transactions.filter(t => t.timestampOut >= oneWeekAgo);

    const partConsumption = {};
    const toolUsage = {};
    const categoryUsage = { A: 0, B: 0, C: 0 };

    recentTransactions.forEach(t => {
      const item = data.inventory.find(i => i.itemID === t.itemID);
      const machine = data.machines.find(m => m.machineID === t.machineID);
      
      if (item?.type === 'Part') {
        partConsumption[t.itemID] = (partConsumption[t.itemID] || 0) + t.quantityTaken;
      } else if (item?.type === 'Tool') {
        toolUsage[t.itemID] = (toolUsage[t.itemID] || 0) + 1;
      }

      if (machine) {
        categoryUsage[machine.category] += t.quantityTaken;
      }
    });

    const allUsage = [
      ...Object.entries(partConsumption).map(([id, qty]) => ({ id, qty, type: 'Part' })),
      ...Object.entries(toolUsage).map(([id, qty]) => ({ id, qty, type: 'Tool' })),
    ];
    
    const top5 = allUsage.sort((a, b) => b.qty - a.qty).slice(0, 5);

    return { partConsumption, toolUsage, categoryUsage, top5 };
  };

  // Employee Selection View
  if (currentView === 'select-employee') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-indigo-600 text-white p-6 shadow-lg">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Select Employee</h1>
              <p className="text-indigo-200 text-sm mt-1">
                {pendingAction === 'request' ? 'Who is requesting items?' : 
                 pendingAction === 'return' ? 'Who is returning tools?' : 
                 'Who is restocking inventory?'}
              </p>
            </div>
            <button
              onClick={() => {
                setCurrentView('dashboard');
                setPendingAction(null);
              }}
              className="bg-indigo-700 hover:bg-indigo-800 px-4 py-2 rounded-lg text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="space-y-3">
              {data.employees.map(emp => (
                <button
                  key={emp.employeeID}
                  onClick={() => handleEmployeeSelect(emp)}
                  className="w-full p-4 text-left bg-gray-50 hover:bg-indigo-50 border-2 border-gray-200 hover:border-indigo-300 rounded-lg transition-all"
                >
                  <div className="font-semibold text-gray-800">{emp.name}</div>
                  <div className="text-sm text-gray-600">{emp.designation} - {emp.sector}</div>
                  <div className="text-xs text-gray-500 mt-1">{emp.shift} Shift</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard View
  if (currentView === 'dashboard') {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-indigo-600 text-white p-6 shadow-lg">
          <div className="max-w-7xl mx-auto">
            <div className="text-center">
              <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Wrench className="text-indigo-600" size={32} />
              </div>
              <h1 className="text-3xl font-bold">MMIS</h1>
              <p className="text-indigo-200 text-sm mt-2">Machine Maintenance Inventory System</p>
            </div>
          </div>
        </div>

        {/* Low Stock Alerts */}
        {lowStockItems.length > 0 && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 max-w-7xl mx-auto mt-4">
            <div className="flex items-start">
              <AlertTriangle className="text-red-500 mr-3 flex-shrink-0" size={24} />
              <div>
                <h3 className="text-red-800 font-semibold">Low Stock Alert!</h3>
                <p className="text-red-700 text-sm mt-1">
                  {lowStockItems.length} item(s) below minimum quantity threshold
                </p>
                <div className="mt-2 space-y-1">
                  {lowStockItems.map(item => (
                    <div key={item.itemID} className="text-sm text-red-600">
                      {item.name}: {item.currentStock}/{item.minQuantityAlert} {item.unitOfMeasure}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Action Cards */}
        <div className="max-w-7xl mx-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <button
              onClick={() => handleActionSelect('request')}
              className="bg-white p-8 rounded-xl shadow-md hover:shadow-xl transition-all border-2 border-transparent hover:border-indigo-300"
            >
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <ArrowRight className="text-blue-600" size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-800 text-center">Request</h3>
              <p className="text-gray-600 text-center mt-2 text-sm">Take parts or tools</p>
            </button>

            <button
              onClick={() => handleActionSelect('return')}
              className="bg-white p-8 rounded-xl shadow-md hover:shadow-xl transition-all border-2 border-transparent hover:border-green-300"
            >
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <ArrowLeft className="text-green-600" size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-800 text-center">Return</h3>
              <p className="text-gray-600 text-center mt-2 text-sm">Return borrowed tools</p>
            </button>

            <button
              onClick={() => handleActionSelect('restock')}
              className="bg-white p-8 rounded-xl shadow-md hover:shadow-xl transition-all border-2 border-transparent hover:border-purple-300"
            >
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="text-purple-600" size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-800 text-center">Restock</h3>
              <p className="text-gray-600 text-center mt-2 text-sm">Replenish inventory</p>
            </button>
          </div>

          {/* Secondary Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button
              onClick={() => setCurrentView('transactions')}
              className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center"
            >
              <FileText className="text-indigo-600 mr-4" size={32} />
              <div className="text-left">
                <h3 className="text-lg font-bold text-gray-800">Transaction History</h3>
                <p className="text-gray-600 text-sm">View all orders and activities</p>
              </div>
            </button>

            <button
              onClick={() => setCurrentView('reports')}
              className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center"
            >
              <BarChart3 className="text-indigo-600 mr-4" size={32} />
              <div className="text-left">
                <h3 className="text-lg font-bold text-gray-800">Reports</h3>
                <p className="text-gray-600 text-sm">Weekly usage and analytics</p>
              </div>
            </button>
          </div>

          {/* Quick Stats */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-gray-600 text-sm">Total Items</div>
              <div className="text-2xl font-bold text-gray-800">{data.inventory.length}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-gray-600 text-sm">Active Tools Out</div>
              <div className="text-2xl font-bold text-blue-600">
                {data.transactions.filter(t => t.status === 'Active' && 
                  data.inventory.find(i => i.itemID === t.itemID)?.type === 'Tool').length}
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-gray-600 text-sm">Low Stock Items</div>
              <div className="text-2xl font-bold text-red-600">{lowStockItems.length}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-gray-600 text-sm">Total Transactions</div>
              <div className="text-2xl font-bold text-gray-800">{data.transactions.length}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Request View
  if (currentView === 'request') {
    const filteredInventory = data.inventory.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.itemID.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const machinesInCategory = selectedCategory
      ? data.machines.filter(m => m.category === selectedCategory)
      : [];

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-indigo-600 text-white p-6 shadow-lg">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Request Item</h1>
              <p className="text-indigo-200 text-sm mt-1">Employee: {currentUser?.name} | Take parts or tools from inventory</p>
            </div>
            <button
              onClick={() => {
                resetWorkflow();
                setCurrentView('dashboard');
              }}
              className="bg-indigo-700 hover:bg-indigo-800 px-4 py-2 rounded-lg text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto p-6">
          {/* Progress Steps */}
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <div className="flex items-center justify-between">
              <div className={`flex-1 text-center ${workflowStep === 'select-item' ? 'text-indigo-600 font-semibold' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center ${workflowStep === 'select-item' ? 'bg-indigo-600 text-white' : 'bg-gray-300'}`}>1</div>
                Select Item
              </div>
              <div className="flex-1 border-t-2 border-gray-300 mx-2"></div>
              <div className={`flex-1 text-center ${workflowStep === 'select-category' ? 'text-indigo-600 font-semibold' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center ${workflowStep === 'select-category' ? 'bg-indigo-600 text-white' : 'bg-gray-300'}`}>2</div>
                Category
              </div>
              <div className="flex-1 border-t-2 border-gray-300 mx-2"></div>
              <div className={`flex-1 text-center ${workflowStep === 'select-machine' ? 'text-indigo-600 font-semibold' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center ${workflowStep === 'select-machine' ? 'bg-indigo-600 text-white' : 'bg-gray-300'}`}>3</div>
                Machine
              </div>
              <div className="flex-1 border-t-2 border-gray-300 mx-2"></div>
              <div className={`flex-1 text-center ${workflowStep === 'confirm' ? 'text-indigo-600 font-semibold' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center ${workflowStep === 'confirm' ? 'bg-indigo-600 text-white' : 'bg-gray-300'}`}>4</div>
                Confirm
              </div>
            </div>
          </div>

          {/* Step 1: Select Item */}
          {workflowStep === 'select-item' && (
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Select Item</h2>
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredInventory.map(item => (
                  <button
                    key={item.itemID}
                    onClick={() => {
                      setSelectedItem(item.itemID);
                      setWorkflowStep('select-category');
                    }}
                    className="w-full p-4 text-left bg-gray-50 hover:bg-indigo-50 border-2 border-gray-200 hover:border-indigo-300 rounded-lg transition-all"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold text-gray-800">{item.name}</div>
                        <div className="text-sm text-gray-600">{item.itemID} - {item.type}</div>
                        <div className="text-sm text-gray-500 mt-1">{item.desc}</div>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold ${item.currentStock < item.minQuantityAlert ? 'text-red-600' : 'text-green-600'}`}>
                          {item.currentStock} {item.unitOfMeasure}
                        </div>
                        {item.currentStock < item.minQuantityAlert && (
                          <div className="text-xs text-red-500 mt-1">Low Stock!</div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Select Category */}
          {workflowStep === 'select-category' && (
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Select Machine Category</h2>
              <div className="grid grid-cols-3 gap-4">
                {MACHINE_CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedCategory(cat);
                      setWorkflowStep('select-machine');
                    }}
                    className="p-8 bg-gray-50 hover:bg-indigo-50 border-2 border-gray-200 hover:border-indigo-300 rounded-lg transition-all"
                  >
                    <div className="text-4xl font-bold text-gray-800 text-center">{cat}</div>
                    <div className="text-sm text-gray-600 text-center mt-2">Category {cat}</div>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setWorkflowStep('select-item')}
                className="mt-4 w-full p-3 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
              >
                Back
              </button>
            </div>
          )}

          {/* Step 3: Select Machine */}
          {workflowStep === 'select-machine' && (
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                Select Machine in Category {selectedCategory}
              </h2>
              <div className="grid grid-cols-4 gap-3 max-h-96 overflow-y-auto">
                {machinesInCategory.map(machine => (
                  <button
                    key={machine.machineID}
                    onClick={() => {
                      setSelectedMachine(machine.machineID);
                      setWorkflowStep('confirm');
                    }}
                    className="p-4 bg-gray-50 hover:bg-indigo-50 border-2 border-gray-200 hover:border-indigo-300 rounded-lg transition-all"
                  >
                    <div className="font-bold text-gray-800 text-center">{machine.name}</div>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setWorkflowStep('select-category')}
                className="mt-4 w-full p-3 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
              >
                Back
              </button>
            </div>
          )}

          {/* Step 4: Confirm */}
          {workflowStep === 'confirm' && (
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Confirm Request</h2>
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Item</div>
                  <div className="font-semibold text-gray-800">
                    {data.inventory.find(i => i.itemID === selectedItem)?.name}
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Machine</div>
                  <div className="font-semibold text-gray-800">{selectedMachine}</div>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <button
                  onClick={handleRequest}
                  className="w-full p-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors"
                >
                  Submit Request
                </button>
                <button
                  onClick={() => setWorkflowStep('select-machine')}
                  className="w-full p-3 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                >
                  Back
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Return View
  if (currentView === 'return') {
    const activeTools = getActiveToolsForUser();

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-indigo-600 text-white p-6 shadow-lg">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Return Tools</h1>
              <p className="text-indigo-200 text-sm mt-1">Employee: {currentUser?.name} | Return borrowed tools to inventory</p>
            </div>
            <button
              onClick={() => {
                setCurrentView('dashboard');
                setCurrentUser(null);
              }}
              className="bg-indigo-700 hover:bg-indigo-800 px-4 py-2 rounded-lg text-sm transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Your Active Tool Checkouts</h2>
            {activeTools.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Wrench size={48} className="mx-auto mb-4 opacity-50" />
                <p>No active tool checkouts</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeTools.map(transaction => {
                  const item = data.inventory.find(i => i.itemID === transaction.itemID);
                  const machine = data.machines.find(m => m.machineID === transaction.machineID);
                  return (
                    <div key={transaction.transactionID} className="bg-gray-50 p-4 rounded-lg border-2 border-gray-200">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-semibold text-gray-800">{item?.name}</div>
                          <div className="text-sm text-gray-600 mt-1">
                            Machine: {machine?.name} | Quantity: {transaction.quantityTaken}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Checked out: {new Date(transaction.timestampOut).toLocaleString()}
                          </div>
                        </div>
                        <button
                          onClick={() => handleReturn(transaction.transactionID)}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors ml-4"
                        >
                          Return
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Restock View
  if (currentView === 'restock') {
    const filteredInventory = data.inventory.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.itemID.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-indigo-600 text-white p-6 shadow-lg">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Restock Inventory</h1>
              <p className="text-indigo-200 text-sm mt-1">Employee: {currentUser?.name} | Replenish parts and tools</p>
            </div>
            <button
              onClick={() => {
                setCurrentView('dashboard');
                setCurrentUser(null);
                setSelectedItem(null);
                setQuantity(1);
                setSearchTerm('');
              }}
              className="bg-indigo-700 hover:bg-indigo-800 px-4 py-2 rounded-lg text-sm transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Select Item to Restock</h2>
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {!selectedItem ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredInventory.map(item => (
                  <button
                    key={item.itemID}
                    onClick={() => setSelectedItem(item.itemID)}
                    className="w-full p-4 text-left bg-gray-50 hover:bg-purple-50 border-2 border-gray-200 hover:border-purple-300 rounded-lg transition-all"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold text-gray-800">{item.name}</div>
                        <div className="text-sm text-gray-600">{item.itemID} - {item.type}</div>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold ${item.currentStock < item.minQuantityAlert ? 'text-red-600' : 'text-green-600'}`}>
                          {item.currentStock} {item.unitOfMeasure}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">Min: {item.minQuantityAlert}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Selected Item</div>
                  <div className="font-semibold text-gray-800">
                    {data.inventory.find(i => i.itemID === selectedItem)?.name}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Current Stock: {data.inventory.find(i => i.itemID === selectedItem)?.currentStock} {data.inventory.find(i => i.itemID === selectedItem)?.unitOfMeasure}
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Quantity to Add</label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleRestock}
                    className="flex-1 p-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    Confirm Restock
                  </button>
                  <button
                    onClick={() => {
                      setSelectedItem(null);
                      setQuantity(1);
                    }}
                    className="flex-1 p-4 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Transactions View
  if (currentView === 'transactions') {
    const filteredTransactions = data.transactions.filter(t => {
      if (filterStatus !== 'all' && t.status !== filterStatus) return false;
      const item = data.inventory.find(i => i.itemID === t.itemID);
      const employee = data.employees.find(e => e.employeeID === t.employeeID);
      const searchLower = searchTerm.toLowerCase();
      return (
        item?.name.toLowerCase().includes(searchLower) ||
        employee?.name.toLowerCase().includes(searchLower) ||
        t.machineID.toLowerCase().includes(searchLower)
      );
    });

    const isManagement = currentUser.sector === 'Management';

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-indigo-600 text-white p-6 shadow-lg">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Transaction History</h1>
              <p className="text-indigo-200 text-sm mt-1">View all orders and activities</p>
            </div>
            <button
              onClick={() => {
                setCurrentView('dashboard');
                setSearchTerm('');
                setFilterStatus('all');
              }}
              className="bg-indigo-700 hover:bg-indigo-800 px-4 py-2 rounded-lg text-sm transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-6">
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex gap-4 mb-6">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="p-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
              >
                <option value="all">All Status</option>
                <option value="Active">Active</option>
                <option value="Completed">Completed</option>
                <option value="Disputed">Disputed</option>
              </select>
            </div>

            <div className="space-y-3">
              {filteredTransactions.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FileText size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No transactions found</p>
                </div>
              ) : (
                filteredTransactions.map(transaction => {
                  const item = data.inventory.find(i => i.itemID === transaction.itemID);
                  const employee = data.employees.find(e => e.employeeID === transaction.employeeID);
                  const machine = data.machines.find(m => m.machineID === transaction.machineID);
                  
                  return (
                    <div key={transaction.transactionID} className="bg-gray-50 p-4 rounded-lg border-2 border-gray-200">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold text-gray-800">{item?.name}</span>
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              transaction.status === 'Active' ? 'bg-blue-100 text-blue-700' :
                              transaction.status === 'Completed' ? 'bg-green-100 text-green-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {transaction.status}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <div>Employee: {employee?.name} ({employee?.designation})</div>
                            <div>Machine: {machine?.name} ({machine?.category})</div>
                            <div>Quantity: {transaction.quantityTaken} {item?.unitOfMeasure}</div>
                            <div>Checked out: {new Date(transaction.timestampOut).toLocaleString()}</div>
                            {transaction.timestampIn && (
                              <div>Returned: {new Date(transaction.timestampIn).toLocaleString()}</div>
                            )}
                          </div>
                        </div>
                        {isManagement && transaction.status === 'Active' && (
                          <button
                            onClick={() => handleDispute(transaction.transactionID)}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors ml-4 text-sm"
                          >
                            Dispute
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Reports View
  if (currentView === 'reports') {
    const report = calculateWeeklyReport();

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-indigo-600 text-white p-6 shadow-lg">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Weekly Reports</h1>
              <p className="text-indigo-200 text-sm mt-1">Usage analytics and insights</p>
            </div>
            <button
              onClick={() => setCurrentView('dashboard')}
              className="bg-indigo-700 hover:bg-indigo-800 px-4 py-2 rounded-lg text-sm transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-6 space-y-6">
          {/* Category Usage */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Usage by Machine Category</h2>
            <div className="grid grid-cols-3 gap-4">
              {Object.entries(report.categoryUsage).map(([cat, qty]) => (
                <div key={cat} className="bg-gray-50 p-4 rounded-lg text-center">
                  <div className="text-3xl font-bold text-indigo-600">{qty}</div>
                  <div className="text-gray-600 mt-2">Category {cat}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Top 5 Most Used */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Top 5 Most Used Items</h2>
            <div className="space-y-3">
              {report.top5.map((usage, index) => {
                const item = data.inventory.find(i => i.itemID === usage.id);
                return (
                  <div key={usage.id} className="flex items-center gap-4 bg-gray-50 p-4 rounded-lg">
                    <div className="bg-indigo-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-800">{item?.name}</div>
                      <div className="text-sm text-gray-600">{usage.type}</div>
                    </div>
                    <div className="text-2xl font-bold text-indigo-600">{usage.qty}</div>
                  </div>
                );
              })}
              {report.top5.length === 0 && (
                <div className="text-center py-8 text-gray-500">No usage data for this week</div>
              )}
            </div>
          </div>

          {/* Parts Consumption */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Parts Consumption (Last 7 Days)</h2>
            <div className="space-y-2">
              {Object.entries(report.partConsumption).map(([itemID, qty]) => {
                const item = data.inventory.find(i => i.itemID === itemID);
                return (
                  <div key={itemID} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                    <span className="text-gray-800">{item?.name}</span>
                    <span className="font-semibold text-gray-800">{qty} {item?.unitOfMeasure}</span>
                  </div>
                );
              })}
              {Object.keys(report.partConsumption).length === 0 && (
                <div className="text-center py-8 text-gray-500">No parts consumed this week</div>
              )}
            </div>
          </div>

          {/* Tool Usage */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Tool Checkouts (Last 7 Days)</h2>
            <div className="space-y-2">
              {Object.entries(report.toolUsage).map(([itemID, count]) => {
                const item = data.inventory.find(i => i.itemID === itemID);
                return (
                  <div key={itemID} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                    <span className="text-gray-800">{item?.name}</span>
                    <span className="font-semibold text-gray-800">{count} times</span>
                  </div>
                );
              })}
              {Object.keys(report.toolUsage).length === 0 && (
                <div className="text-center py-8 text-gray-500">No tools checked out this week</div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}