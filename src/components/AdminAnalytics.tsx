import React, { useState, useEffect, useRef } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const val = payload[0].value;
    if (val === null) {
      return (
        <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-100 min-w-[160px]">
          <p className="text-sm text-gray-500 font-medium mb-1">Forecast / Future</p>
          <p className="text-xs text-gray-400 border-t border-gray-100 pt-2">{label}</p>
        </div>
      );
    }
    return (
      <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-100 min-w-[160px]">
        <p className="text-sm text-gray-500 font-medium mb-1">Revenue</p>
        <div className="flex items-center gap-2 mb-1">
          <p className="text-2xl font-bold text-gray-900">${val.toLocaleString()}</p>
        </div>
        <p className="text-xs text-gray-400 border-t border-gray-100 pt-2">{label}</p>
      </div>
    );
  }
  return null;
};

const COLORS = ['#0052cc', '#6b7280', '#d1d5db'];

export default function AdminAnalytics() {
  const { userRole, staffPermissions } = useAuth();
  const canEditProducts = userRole === 'superadmin' || (staffPermissions && staffPermissions.products === 'edit');

  const [salesData, setSalesData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [avgDealValue, setAvgDealValue] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('Month');
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  // Auto-scroll to show current date
  useEffect(() => {
    if (scrollRef.current && salesData.length > 0) {
      const container = scrollRef.current;
      const totalSlots = salesData.length;
      const futureSlots = 11;
      const scrollPosition = (container.scrollWidth * ((totalSlots - futureSlots - 3) / totalSlots));
      container.scrollLeft = scrollPosition;
    }
  }, [salesData]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const ordersSnap = await getDocs(collection(db, 'orders'));
        let revenue = 0;
        let orderCount = 0;
        const catStats: Record<string, number> = {};
        const productStats: Record<string, { quantity: number, revenue: number }> = {};

        const now = new Date();
        let startDate = new Date(0); // default all time
        const salesMap = new Map<string, { label: string, timestamp: number, sales: number | null }>();

        if (timeRange === 'Day') {
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          for (let i = 0; i <= now.getHours(); i++) {
            const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), i);
            const label = d.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
            salesMap.set(label, { label, timestamp: d.getTime(), sales: 0 });
          }
          for (let i = 1; i <= 11; i++) {
            const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + i);
            const label = d.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
            salesMap.set(label, { label, timestamp: d.getTime(), sales: null });
          }
        } else if (timeRange === 'Week') {
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
          for (let i = 6; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
            const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            salesMap.set(label, { label, timestamp: d.getTime(), sales: 0 });
          }
          for (let i = 1; i <= 11; i++) {
            const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
            const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            salesMap.set(label, { label, timestamp: d.getTime(), sales: null });
          }
        } else if (timeRange === 'Month') {
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
          for (let i = 29; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
            const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            salesMap.set(label, { label, timestamp: d.getTime(), sales: 0 });
          }
          for (let i = 1; i <= 11; i++) {
            const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
            const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            salesMap.set(label, { label, timestamp: d.getTime(), sales: null });
          }
        } else if (timeRange === 'Year') {
          startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
          for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            salesMap.set(label, { label, timestamp: d.getTime(), sales: 0 });
          }
          for (let i = 1; i <= 11; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
            const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            salesMap.set(label, { label, timestamp: d.getTime(), sales: null });
          }
        }

        ordersSnap.forEach(doc => {
          const order = doc.data();
          const orderDateObj = order.createdAt ? new Date(order.createdAt.toMillis()) : new Date(0);
          
          if (orderDateObj >= startDate && (order.status === 'delivered' || order.status === 'placed')) {
            revenue += order.total;
            orderCount++;
            
            let label = '';
            if (timeRange === 'Day') {
              label = orderDateObj.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
            } else if (timeRange === 'Year') {
              label = orderDateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            } else {
              label = orderDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }
            
            if (salesMap.has(label)) {
              const entry = salesMap.get(label)!;
              entry.sales = (entry.sales || 0) + order.total;
            } else {
              salesMap.set(label, { label, timestamp: orderDateObj.getTime(), sales: order.total });
            }

            order.items.forEach((item: any) => {
              const cat = item.category || 'Other';
              catStats[cat] = (catStats[cat] || 0) + item.quantity;
              
              if (!productStats[item.name]) productStats[item.name] = { quantity: 0, revenue: 0 };
              productStats[item.name].quantity += item.quantity;
              productStats[item.name].revenue += (item.price * item.quantity) || 0;
            });
          }
        });

        setTotalRevenue(revenue);
        setTotalOrders(orderCount);
        setAvgDealValue(orderCount > 0 ? revenue / orderCount : 0);

        // Format sales data for the chart
        const formattedSales = Array.from(salesMap.values())
          .sort((a, b) => a.timestamp - b.timestamp)
          .map(item => ({
            date: item.label,
            sales: item.sales !== null ? Number(item.sales.toFixed(2)) : null
          }));
        
        // If there's only one data point, duplicate it so the area chart renders properly
        if (formattedSales.length === 1) {
          formattedSales.unshift({ date: 'Previous', sales: 0 });
        }

        if (formattedSales.length === 0) {
          setSalesData([]);
        } else {
          setSalesData(formattedSales);
        }

        // Format category data
        const formattedCats = Object.keys(catStats).map(name => ({
          name,
          value: catStats[name]
        })).sort((a, b) => b.value - a.value).slice(0, 3);

        if (formattedCats.length === 0) {
          setCategoryData([]);
        } else {
          setCategoryData(formattedCats);
        }

        const formattedProducts = Object.keys(productStats).map(name => ({
          name: name.length > 20 ? name.substring(0, 20) + '...' : name,
          quantity: productStats[name].quantity,
          revenue: productStats[name].revenue
        })).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
        
        setTopProducts(formattedProducts);

        // Fetch low stock items
        const dishesSnap = await getDocs(collection(db, 'dishes'));
        const lowStock = dishesSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter((dish: any) => dish.stock !== undefined && dish.stock < 10)
          .sort((a: any, b: any) => a.stock - b.stock)
          .slice(0, 5);
        setLowStockItems(lowStock);

      } catch (error) {
        console.error("Error fetching analytics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [timeRange]);

  const handleExportCSV = () => {
    if (salesData.length === 0) {
      alert("No data to export.");
      return;
    }
    const headers = ["Date", "Revenue"];
    const csvContent = [
      headers.join(","),
      ...salesData.map(row => `${row.date},${row.sales}`)
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `sales_report_${timeRange.toLowerCase()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUpdateStock = async (id: string, currentStock: number) => {
    const newStockStr = prompt(`Enter new stock for this item (current: ${currentStock}):`, currentStock.toString());
    if (newStockStr === null) return;
    
    const newStock = parseInt(newStockStr, 10);
    if (isNaN(newStock) || newStock < 0) {
      alert("Invalid stock value.");
      return;
    }

    try {
      await updateDoc(doc(db, 'dishes', id), { stock: newStock });
      setLowStockItems(prev => prev.map(item => item.id === id ? { ...item, stock: newStock } : item).filter(item => item.stock < 10));
    } catch (error) {
      console.error("Error updating stock:", error);
      alert("Failed to update stock.");
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading analytics...</div>;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-headline font-bold text-3xl text-gray-900">Sales Timeline</h2>
          <p className="text-gray-500 mt-1">Visualize revenue trends and seasonal growth dynamics.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center bg-gray-50/80 rounded-lg p-1 text-sm font-medium border border-gray-100">
            {['Day', 'Week', 'Month', 'Year'].map((range) => (
              <button 
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-md transition-colors whitespace-nowrap ${timeRange === range ? 'bg-white text-gray-900 shadow-sm border border-gray-200/50' : 'text-gray-500 hover:text-gray-900'}`}
              >
                {range}
              </button>
            ))}
          </div>
          <button onClick={handleExportCSV} className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm font-bold shadow-sm whitespace-nowrap">
            <span className="material-symbols-outlined text-[18px]">download</span>
            Export CSV
          </button>
        </div>
      </div>

      {/* Low Stock Alerts */}
      {lowStockItems.length > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 md:p-6 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined">warning</span>
            </div>
            <div>
              <h3 className="font-bold text-red-900">Low Stock Alerts</h3>
              <p className="text-sm text-red-700 mt-1">
                {lowStockItems.length} products are running low on inventory.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStockItems.map(item => (
              <button 
                key={item.id} 
                onClick={() => canEditProducts && handleUpdateStock(item.id, item.stock)}
                className={`bg-white text-red-700 text-xs font-bold px-3 py-1.5 rounded-lg border border-red-100 shadow-sm flex items-center gap-1 ${canEditProducts ? 'hover:bg-red-50 transition-colors cursor-pointer' : 'opacity-80 cursor-default'}`}
                title={canEditProducts ? "Click to update stock" : "Low stock"}
                disabled={!canEditProducts}
              >
                {item.name} ({item.stock} left)
                {canEditProducts && <span className="material-symbols-outlined text-[14px]">edit</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-xs font-bold text-gray-500 tracking-wider uppercase mb-2">Total Revenue</p>
          <div className="flex items-baseline gap-3">
            <h3 className="text-3xl font-extrabold text-gray-900">${totalRevenue.toLocaleString()}</h3>
            <span className="text-sm font-bold text-emerald-600 flex items-center">
              <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
              0%
            </span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-xs font-bold text-gray-500 tracking-wider uppercase mb-2">Avg. Order Value</p>
          <div className="flex items-baseline gap-3">
            <h3 className="text-3xl font-extrabold text-gray-900">${avgDealValue.toLocaleString(undefined, {maximumFractionDigits: 0})}</h3>
            <span className="text-sm font-bold text-emerald-600 flex items-center">
              <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
              0%
            </span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-xs font-bold text-gray-500 tracking-wider uppercase mb-2">Total Orders</p>
          <div className="flex items-baseline gap-3">
            <h3 className="text-3xl font-extrabold text-gray-900">{totalOrders.toLocaleString()}</h3>
            <span className="text-sm font-medium text-gray-400 flex items-center">
              — Stable
            </span>
          </div>
        </div>
      </div>

      {/* Main Chart */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-lg text-gray-900">Monthly Revenue</h3>
            <span className="material-symbols-outlined text-gray-400 text-sm cursor-pointer" title="Revenue from delivered orders">info</span>
          </div>
          <div className="flex items-center bg-gray-50 rounded-lg p-1 text-sm font-medium overflow-x-auto scrollbar-hide">
            {['Day', 'Week', 'Month', 'Year', 'Date Range'].map((range) => (
              <button 
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${timeRange === range ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
        
        <div 
          className={`w-full overflow-x-auto scrollbar-hide ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          ref={scrollRef}
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeave}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
        >
          <div style={{ minWidth: `${Math.max(salesData.length * 60, 800)}px`, height: '350px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#9ca3af', fontSize: 12 }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                  tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}
                />
                <Tooltip 
                  content={<CustomTooltip />} 
                  cursor={{ stroke: '#111827', strokeWidth: 1, strokeDasharray: '' }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="sales" 
                  stroke="#0ea5e9" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorSales)" 
                  activeDot={{ r: 6, fill: '#0ea5e9', stroke: '#fff', strokeWidth: 2 }}
                  connectNulls={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-gray-50/50 p-6 md:p-8 rounded-2xl border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-xl text-gray-900">Top Selling Products</h3>
            <button className="text-gray-400 hover:text-gray-600 flex items-center">
              <span className="material-symbols-outlined">arrow_drop_down</span>
            </button>
          </div>
          <div className="space-y-4">
            {topProducts.length > 0 ? topProducts.map((product, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#e6f0ff] text-[#0052cc] flex items-center justify-center shrink-0 font-bold">
                    {idx + 1}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">{product.name}</h4>
                    <p className="text-xs text-gray-500">{product.quantity} units sold</p>
                  </div>
                </div>
                <div className="font-bold text-gray-900">
                  ${product.revenue.toLocaleString()}
                </div>
              </div>
            )) : (
              <div className="text-sm text-gray-500 text-center py-4">No product data available</div>
            )}
          </div>
        </div>

        {/* Regional Distribution */}
        <div className="bg-gray-50/50 p-6 md:p-8 rounded-2xl border border-gray-100">
          <h3 className="font-bold text-xl text-gray-900 mb-6">Sales by Category</h3>
          <div className="flex items-center justify-between">
            <div className="w-[160px] h-[160px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-extrabold text-gray-900">
                  {categoryData.length > 0 ? Math.round((categoryData[0].value / categoryData.reduce((a, b) => a + b.value, 0)) * 100) : 0}%
                </span>
              </div>
            </div>
            <div className="flex-1 ml-8 space-y-4">
              {categoryData.map((entry, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                    <span className="text-sm font-medium text-gray-900">{entry.name}</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {Math.round((entry.value / categoryData.reduce((a, b) => a + b.value, 0)) * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
