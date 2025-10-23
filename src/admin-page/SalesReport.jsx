import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import "./SalesReport.css";

// Helper to format dates
function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

export default function SalesReport() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Date range state
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1); // first day of the month
    return formatDate(d);
  });
  const [endDate, setEndDate] = useState(() => formatDate(new Date()));

  // Orders, best sellers, menu list, and total sales
  const [orders, setOrders] = useState([]);
  const [bestSellers, setBestSellers] = useState([]);
  const [menuList, setMenuList] = useState([]);
  const [menuIngredientCosts, setMenuIngredientCosts] = useState({});
  const [loading, setLoading] = useState(false);
  const [totalSales, setTotalSales] = useState(0);

  // Active tab: 'sales' or 'summary'
  const [tab, setTab] = useState("sales");

  // Fetch orders and total sales whenever date range changes
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      try {
        // Convert date strings to proper timestamps for comparison
        const startDateTime = new Date(
          startDate + "T00:00:00.000Z"
        ).toISOString();
        const endDateTime = new Date(endDate + "T23:59:59.999Z").toISOString();

        // 1️⃣ Fetch orders from orders table
        const { data: ordersData, error: ordersError } = await supabase
          .from("orders")
          .select("id, created_at, order_items, total_price")
          .gte("created_at", startDateTime)
          .lte("created_at", endDateTime)
          .order("created_at", { ascending: false });

        if (ordersError) {
          setOrders([]);
          setBestSellers([]);
        } else {
          setOrders(ordersData || []);
        }

        // 2️⃣ Fetch menu-list with ingredients_item for cost calculation
        const { data: menuListData, error: menuListError } = await supabase
          .from("menu-list")
          .select("id, item_name, price, ingredients_item");

        if (menuListError) {
        } else {
          setMenuList(menuListData || []);
        }

        // 3️⃣ Build menu cost map from ingredients_item
        const costMap = {};
        if (menuListData) {
          menuListData.forEach((menu) => {
            let totalCost = 0;
            let ingredients = menu.ingredients_item;

            if (typeof ingredients === "string") {
              try {
                ingredients = JSON.parse(ingredients);
              } catch {
                ingredients = [];
              }
            }

            if (Array.isArray(ingredients)) {
              totalCost = ingredients.reduce(
                (sum, ing) => sum + (parseFloat(ing.total_cost) || 0),
                0
              );
            }
            costMap[menu.item_name] = totalCost;
          });
        }
        setMenuIngredientCosts(costMap);

        // 4️⃣ Process orders data to count products
        // 4️⃣ Process orders data to count products - FIXED VERSION
        if (ordersData && ordersData.length > 0) {
          const productCount = {};
          const productRevenue = {};

          // Create a price map from menu list
          const menuPriceMap = {};
          if (menuListData) {
            menuListData.forEach((menu) => {
              menuPriceMap[menu.item_name] = parseFloat(menu.price) || 0;
            });
          }

          console.log("🏷️ Menu prices:", menuPriceMap);

          ordersData.forEach((order) => {
            let items = order.order_items;
            if (typeof items === "string") {
              try {
                items = JSON.parse(items);
              } catch {
                items = [];
              }
            }

            if (Array.isArray(items)) {
              items.forEach((item) => {
                const itemName = item.item_name;
                const quantity = item.quantity || 1;

                // FIX: Use menu price since order_items doesn't have price field
                const price = menuPriceMap[itemName] || 0;

                console.log(
                  `📦 ${itemName}: quantity=${quantity}, menu price=${price}, revenue=${
                    price * quantity
                  }`
                );

                productCount[itemName] =
                  (productCount[itemName] || 0) + quantity;
                productRevenue[itemName] =
                  (productRevenue[itemName] || 0) + price * quantity;
              });
            }
          });

          // Sort by quantity sold
          const sorted = Object.entries(productCount)
            .map(([name, count]) => ({
              name,
              count,
              revenue: productRevenue[name] || 0,
            }))
            .sort((a, b) => b.count - a.count);

          console.log("✅ Fixed best sellers with revenue:", sorted);
          setBestSellers(sorted);
        } else {
          setBestSellers([]);
        }

        // 5️⃣ Calculate total sales
        // 5️⃣ Calculate total sales - FIXED VERSION
        let totalSalesValue = 0;
        if (ordersData && ordersData.length > 0) {
          // Use total_price from orders table since it's available and correct
          totalSalesValue = ordersData.reduce(
            (acc, order) => acc + (parseFloat(order.total_price) || 0),
            0
          );
          console.log(
            "💰 Total sales from orders.total_price:",
            totalSalesValue
          );
        }
        setTotalSales(totalSalesValue);
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate]);

  // Calculate summary values
  const totalOrders = orders.length;
  let totalItemsSold = 0;
  orders.forEach((order) => {
    let items = order.order_items;
    if (typeof items === "string") {
      try {
        items = JSON.parse(items);
      } catch {
        items = [];
      }
    }
    if (Array.isArray(items)) {
      items.forEach((item) => {
        totalItemsSold += item.quantity || 1;
      });
    }
  });

  // Calculate total profit from best sellers
  const totalProfit = bestSellers.reduce((acc, item) => {
    const unitCost = menuIngredientCosts[item.name] || 0;
    return acc + (item.revenue - unitCost * item.count);
  }, 0);

  // Export data helper
  const handleExport = () => {
    const dataStr =
      tab === "sales"
        ? JSON.stringify({ orders, bestSellers }, null, 2)
        : JSON.stringify(
            {
              summary: bestSellers.map((item) => {
                const unitCost = menuIngredientCosts[item.name] || 0;
                return {
                  name: item.name,
                  quantity_sold: item.count,
                  unit_price: item.count > 0 ? item.revenue / item.count : 0,
                  total_sales: item.revenue,
                  unit_cost: unitCost,
                  profit: item.revenue - unitCost * item.count,
                };
              }),
            },
            null,
            2
          );

    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = tab === "sales" ? "sales-report.json" : "table-summary.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="opswat-admin">
      {/* Sidebar */}
      <aside className={`ops-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="ops-logo">Minute Admin</div>
        <nav className="sidebar-nav-links">
          <a href="/admin-user-management" className="nav-item">
            User Management
          </a>
          <a href="/admin/menu-management" className="nav-item">
            Menu Management
          </a>
          <a href="/admin/ingredients-dashboard" className="nav-item">
            Inventory
          </a>
          <a href="/admin/sales-report" className="nav-item active">
            Sales Report
          </a>
        </nav>
        <div className="sidebar-logout-wrap">
          <button
            className="nav-item logout"
            onClick={() => navigate("/login")}
          >
            Log out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ops-main">
        {/* Header: title, date range, tabs, export */}
        <header className="ops-header salesreport-header-row">
          <h1>Sales Report</h1>

          <div className="salesreport-date-range-picker">
            <input
              className="date-picker"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              max={endDate}
            />
            <span className="salesreport-date-arrow">→</span>
            <input
              className="date-picker"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
              max={formatDate(new Date())}
            />
          </div>

          <div className="salesreport-tab-btn-row">
            <button
              className={`salesreport-tab-btn${
                tab === "sales" ? " active" : ""
              }`}
              onClick={() => setTab("sales")}
            >
              Sales
            </button>
            <button
              className={`salesreport-tab-btn${
                tab === "summary" ? " active" : ""
              }`}
              onClick={() => setTab("summary")}
            >
              Table Summary
            </button>
            <button className="salesreport-export-btn" onClick={handleExport}>
              <span role="img" aria-label="Export">
                📤
              </span>{" "}
              Export
            </button>
          </div>
        </header>

        {/* Tab Content */}
        {tab === "sales" ? (
          <div className="salesreport-row-flex">
            {/* Metrics Column */}
            <div className="salesreport-metrics-col">
              <div className="salesreport-metric-card">
                <div className="metric-label">Current Total Revenue</div>
                <div className="metric-value">
                  ₱
                  {totalSales.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              </div>
              <div className="salesreport-metric-card">
                <div className="metric-label">Current Total Profit</div>
                <div className="metric-value">
                  ₱
                  {totalProfit.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              </div>

              <table className="summary-table summary-table-margin">
                <thead>
                  <tr>
                    <th></th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Total Sales</td>
                    <td>{`₱${totalSales.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`}</td>
                  </tr>
                  <tr>
                    <td>Total Orders</td>
                    <td>{totalOrders}</td>
                  </tr>
                  <tr>
                    <td>Total Items Sold</td>
                    <td>{totalItemsSold}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Chart Column */}
            <div className="salesreport-chart-container salesreport-chart-container-margin">
              {loading ? (
                <div>Loading chart...</div>
              ) : bestSellers.length === 0 ? (
                <div>No sales data for selected range.</div>
              ) : (
                <div className="salesreport-bar-chart-outer salesreport-bar-chart-outer-responsive">
                  <div className="salesreport-bar-chart-title">
                    Best Sellers Bar Chart
                  </div>
                  <div className="salesreport-bar-chart-area-responsive">
                    <Bar
                      data={{
                        labels: bestSellers.map((item) => item.name),
                        datasets: [
                          {
                            label: "Sold",
                            data: bestSellers.map((item) => item.count),
                            backgroundColor: "#ff9800",
                            borderRadius: 8,
                            maxBarThickness: 60,
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false },
                          title: { display: false },
                          tooltip: { enabled: true },
                        },
                        layout: { padding: 16 },
                        scales: {
                          x: {
                            grid: { color: "#ccc", borderDash: [4, 4] },
                            ticks: { color: "#222", font: { size: 14 } },
                          },
                          y: {
                            beginAtZero: true,
                            grid: { color: "#bbb", borderDash: [4, 4] },
                            ticks: { color: "#222", font: { size: 14 } },
                          },
                        },
                        animation: false,
                      }}
                      height={400}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="salesreport-summary-tab">
            <h2>Table Summary</h2>
            <div className="salesreport-summary-table-wrapper">
              <table className="salesreport-summary-table">
                <thead>
                  <tr>
                    <th>No.</th>
                    <th>Menu Item</th>
                    <th>Qty Sold</th>
                    <th>Unit Price</th>
                    <th>Total Sales</th>
                    <th>Unit Cost</th>
                    <th>Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {bestSellers.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: "center" }}>
                        No sales data available for the selected date range.
                      </td>
                    </tr>
                  ) : (
                    bestSellers.map((item, idx) => {
                      // Calculate average unit price from actual orders data
                      const unitPrice =
                        item.count > 0 ? item.revenue / item.count : 0;
                      const totalSales = item.revenue;
                      const unitCost = menuIngredientCosts[item.name] || 0;
                      const profit = totalSales - unitCost * item.count;

                      return (
                        <tr key={item.name}>
                          <td>{idx + 1}</td>
                          <td>{item.name}</td>
                          <td>{item.count}</td>
                          <td>₱{unitPrice.toFixed(2)}</td>
                          <td>₱{totalSales.toFixed(2)}</td>
                          <td>₱{unitCost.toFixed(2)}</td>
                          <td>₱{profit.toFixed(2)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {bestSellers.length > 0 && (
                  <tfoot>
                    <tr className="salesreport-summary-total-row">
                      <td colSpan="2">TOTAL</td>
                      <td>
                        {bestSellers.reduce((acc, item) => acc + item.count, 0)}
                      </td>
                      <td>-</td>
                      <td>
                        ₱
                        {bestSellers
                          .reduce((acc, item) => acc + item.revenue, 0)
                          .toFixed(2)}
                      </td>
                      <td>-</td>
                      <td>₱{totalProfit.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
