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
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { UserAuth } from "../authenticator/AuthContext";
import "./SalesReport.css";

// Helper to format dates
function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

export default function SalesReport() {
  // Low stock notifier for Inventory sidebar
  const [lowStockCount, setLowStockCount] = useState(0);

  useEffect(() => {
    // Fetch low stock count from ingredient-list and stock_movement
    const fetchLowStock = async () => {
      const { data: ingredients, error: ingError } = await supabase
        .from("ingredient-list")
        .select("id");
      if (ingError || !ingredients) return;
      const { data: movements, error: movError } = await supabase
        .from("stock_movement")
        .select("ingredient_id, type, quantity");
      if (movError || !movements) return;
      const summary = {};
      for (const ing of ingredients) summary[ing.id] = 0;
      for (const m of movements) {
        if (summary[m.ingredient_id] !== undefined) {
          summary[m.ingredient_id] +=
            m.type === "in" ? m.quantity : -m.quantity;
        }
      }
      const count = Object.values(summary).filter(
        (q) => q > 0 && q <= 5
      ).length;
      setLowStockCount(count);
    };
    fetchLowStock();
    const sub = supabase
      .channel("stock-movement-lowstock")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "stock_movement" },
        fetchLowStock
      )
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, []);
  const { session, signOut } = UserAuth();
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
  // Refs for PDF export
  const salesRef = useRef(null);
  const summaryRef = useRef(null);

  useEffect(() => {
    if (session === null) {
      window.location.href = "/login";
    }
  }, [session]);

  // Fetch orders and total sales whenever date range changes
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch all orders
        const { data: ordersData, error: ordersError } = await supabase
          .from("orders")
          .select("id, total_price");
        setOrders(ordersData || []);
        // Fetch menu-list
        const { data: menuListData, error: menuListError } = await supabase
          .from("menu-list")
          .select("id, item_name, price");
        setMenuList(menuListData || []);
        // Build menu cost map from menu_ingredients
        const costMap = {};
        for (const menu of menuListData || []) {
          const { data: menuIngredients } = await supabase
            .from("menu_ingredients")
            .select("total_cost")
            .eq("menu_id", menu.id);
          let totalCost = 0;
          if (menuIngredients) {
            totalCost = menuIngredients.reduce(
              (sum, ing) => sum + (parseFloat(ing.total_cost) || 0),
              0
            );
          }
          costMap[menu.item_name] = totalCost;
        }
        setMenuIngredientCosts(costMap);

        // Fetch all order_items for the orders
        const orderIds = (ordersData || []).map((order) => order.id);
        let orderItemsData = [];
        if (orderIds.length > 0) {
          const { data: orderItems, error: orderItemsError } = await supabase
            .from("order_items")
            .select("id, order_id, menu_item_id, quantity, price")
            .in("order_id", orderIds);
          orderItemsData = orderItems || [];
        }

        // Build lookup maps for menu-list
        const menuIdToName = {};
        const menuIdToPrice = {};
        (menuListData || []).forEach((menu) => {
          menuIdToName[menu.id] = menu.item_name;
          menuIdToPrice[menu.id] = parseFloat(menu.price) || 0;
        });

        // Count products and revenue
        const productCount = {};
        const productRevenue = {};
        for (const item of orderItemsData) {
          const menuId = item.menu_item_id;
          const itemName = menuIdToName[menuId] || `Unknown (${menuId})`;
          const price = menuIdToPrice[menuId] || 0;
          const quantity = item.quantity || 1;
          productCount[itemName] = (productCount[itemName] || 0) + quantity;
          productRevenue[itemName] =
            (productRevenue[itemName] || 0) + price * quantity;
        }

        // Add-ons (optional)
        const addOnRevenue = {};
        for (const item of orderItemsData) {
          const { data: addOns } = await supabase
            .from("order_item_add_ons")
            .select("name, price")
            .eq("order_item_id", item.id);
          if (addOns) {
            for (const addOn of addOns) {
              addOnRevenue[addOn.name] =
                (addOnRevenue[addOn.name] || 0) + parseFloat(addOn.price || 0);
            }
          }
        }

        // Combine products and add-ons
        const allProducts = { ...productCount, ...addOnRevenue };
        const allRevenue = { ...productRevenue, ...addOnRevenue };
        const sorted = Object.entries(allProducts)
          .map(([name, count]) => ({
            name,
            count: productCount[name] || 0,
            revenue: allRevenue[name] || 0,
            isAddOn: !!addOnRevenue[name],
          }))
          .sort((a, b) => b.revenue - a.revenue);

        setBestSellers(sorted);
        console.log("Best sellers computed:", sorted);

        // Calculate total sales
        let totalSalesValue = 0;
        if (ordersData && ordersData.length > 0) {
          totalSalesValue = ordersData.reduce(
            (acc, order) => acc + (parseFloat(order.total_price) || 0),
            0
          );
        }
        setTotalSales(totalSalesValue);
      } catch (error) {
        console.error("Error in fetchData for SalesReport:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Calculate summary values
  // Calculate summary values
  const totalOrders = orders && orders.length ? orders.length : 0;
  // Total items sold: sum of all counts from bestSellers
  const totalItemsSold = bestSellers.reduce((acc, item) => acc + item.count, 0);

  // Calculate total profit from best sellers
  // Total profit: sum of (revenue - cost) for each menu item (exclude add-ons)
  const totalProfit =
    bestSellers && bestSellers.length > 0
      ? bestSellers.reduce((acc, item) => {
          if (!item.isAddOn) {
            const unitCost = menuIngredientCosts[item.name] || 0;
            return acc + (item.revenue - unitCost * item.count);
          }
          return acc;
        }, 0)
      : 0;

  // Export data as PDF
  const handleExport = async () => {
    let exportRef = tab === "sales" ? salesRef : summaryRef;
    const element = exportRef.current;
    if (!element) return;
    try {
      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "px",
        format: "a4",
      });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      // Calculate image dimensions to fit A4
      const imgWidth = pageWidth - 40;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 20, 20, imgWidth, imgHeight);
      pdf.save(tab === "sales" ? "sales-report.pdf" : "table-summary.pdf");
    } catch (err) {
      alert("Failed to export PDF: " + err.message);
    }
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
          <a
            href="/admin/ingredients-dashboard"
            className={`nav-item${lowStockCount > 0 ? " nav-item-red" : ""}`}
            style={{
              position: "relative",
              background: lowStockCount > 0 ? "rgba(255, 0, 0, 0.45)" : undefined,
              color: lowStockCount > 0 ? "#222" : undefined,
              fontWeight: lowStockCount > 0 ? "bold" : undefined,
              transition: "background 0.2s",
            }}
          >
            {lowStockCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  left: "-10px",
                  top: "10%",
                  transform: "translateY(-50%)",
                  background: "rgba(255, 0, 0, 155)",
                  color: "white",
                  borderRadius: "50%",
                  padding: "2px 8px",
                  fontSize: "0.8em",
                  fontWeight: "bold",
                  zIndex: 2,
                  boxShadow: "0 0 2px #0002",
                }}
              >
                {lowStockCount}
              </span>
            )}
            Inventory
          </a>
          <a href="/admin/sales-report" className="nav-item active">
            Sales Report
          </a>
          <button
            className="nav-item logout"
            onClick={async () => {
              await signOut();
              window.location.href = "/login";
            }}
          >
            Log out
          </button>
        </nav>
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
          <div ref={salesRef} className="salesreport-row-flex">
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
          <div ref={summaryRef} className="salesreport-summary-tab">
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
                    bestSellers
                      .filter((item) => !item.isAddOn)
                      .map((item, idx) => {
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
