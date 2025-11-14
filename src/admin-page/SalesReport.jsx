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
import { supabase } from "../supabaseClient";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { UserAuth } from "../authenticator/AuthContext";
import "./SalesReport.css";
import AdminSidebar from "./AdminSidebar"; // NEW

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

export default function SalesReport() {
  const { session } = UserAuth(); // Removed signOut (handled in AdminSidebar)

  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return formatDate(d);
  });
  const [endDate, setEndDate] = useState(() => formatDate(new Date()));

  const [orders, setOrders] = useState([]);
  const [bestSellers, setBestSellers] = useState([]);
  const [menuIngredientCosts, setMenuIngredientCosts] = useState({});
  const [loading, setLoading] = useState(false);
  const [totalSales, setTotalSales] = useState(0);
  const [tab, setTab] = useState("sales");
  const [showDatePicker, setShowDatePicker] = useState(false);

  const salesRef = useRef(null);
  const summaryRef = useRef(null);

  useEffect(() => {
    if (session === null) window.location.href = "/login";
  }, [session]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: ordersData } = await supabase
          .from("orders")
          .select("id, total_price");
        setOrders(ordersData || []);

        const { data: menuListData } = await supabase
          .from("menu-list")
          .select("id, item_name, price");

        const costMap = {};
        for (const menu of menuListData || []) {
          const { data: menuIngredients } = await supabase
            .from("menu_ingredients")
            .select("total_cost")
            .eq("menu_id", menu.id);
          costMap[menu.item_name] = (menuIngredients || []).reduce(
            (sum, ing) => sum + (parseFloat(ing.total_cost) || 0),
            0
          );
        }
        setMenuIngredientCosts(costMap);

        const orderIds = (ordersData || []).map((o) => o.id);
        let orderItemsData = [];
        if (orderIds.length) {
          const { data: orderItems } = await supabase
            .from("order_items")
            .select("id, order_id, menu_item_id, quantity, price")
            .in("order_id", orderIds);
          orderItemsData = orderItems || [];
        }

        const menuIdToName = {};
        const menuIdToPrice = {};
        (menuListData || []).forEach((m) => {
          menuIdToName[m.id] = m.item_name;
          menuIdToPrice[m.id] = parseFloat(m.price) || 0;
        });

        const productCount = {};
        const productRevenue = {};
        for (const item of orderItemsData) {
          const name =
            menuIdToName[item.menu_item_id] || `Unknown (${item.menu_item_id})`;
          const qty = item.quantity || 1;
          const price = menuIdToPrice[item.menu_item_id] || 0;
          productCount[name] = (productCount[name] || 0) + qty;
          productRevenue[name] = (productRevenue[name] || 0) + price * qty;
        }

        const addOnRevenue = {};
        for (const item of orderItemsData) {
          const { data: addOns } = await supabase
            .from("order_item_add_ons")
            .select("name, price")
            .eq("order_item_id", item.id);
          (addOns || []).forEach((a) => {
            addOnRevenue[a.name] =
              (addOnRevenue[a.name] || 0) + parseFloat(a.price || 0);
          });
        }

        const allProducts = { ...productCount, ...addOnRevenue };
        const allRevenue = { ...productRevenue, ...addOnRevenue };

        const sorted = Object.entries(allProducts)
          .map(([name]) => ({
            name,
            count: productCount[name] || 0,
            revenue: allRevenue[name] || 0,
            isAddOn: !!addOnRevenue[name],
          }))
          .sort((a, b) => b.revenue - a.revenue);
        setBestSellers(sorted);

        const totalSalesValue = (ordersData || []).reduce(
          (acc, o) => acc + (parseFloat(o.total_price) || 0),
          0
        );
        setTotalSales(totalSalesValue);
      } catch (err) {
        console.error("SalesReport fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const totalOrders = orders.length;
  const totalItemsSold = bestSellers.reduce((acc, item) => acc + item.count, 0);
  const totalProfit = bestSellers.reduce((acc, item) => {
    if (item.isAddOn) return acc;
    const unitCost = menuIngredientCosts[item.name] || 0;
    return acc + (item.revenue - unitCost * item.count);
  }, 0);

  const handleExport = async () => {
    const ref = tab === "sales" ? salesRef : summaryRef;
    if (!ref.current) return;
    try {
      const canvas = await html2canvas(ref.current, { scale: 2 });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "px",
        format: "a4",
      });
      const pageWidth = pdf.internal.pageSize.getWidth();
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
      <AdminSidebar active="sales-report" /> {/* NEW unified sidebar */}
      <main className="ops-main">
        <header className="ops-header salesreport-header">
          <h1 className="salesreport-title">Sales Report</h1>
          <div className="salesreport-controls-top">
            <div className="salesreport-right-controls">
              <button
                type="button"
                className="salesreport-date-single"
                onClick={() => setShowDatePicker((v) => !v)}
                aria-label="Change date range"
                title="Change date range"
              >
                {startDate} – {endDate}
              </button>
              {showDatePicker && (
                <div className="salesreport-date-popover">
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
              )}
            </div>
            <button
              className="salesreport-export-btn"
              onClick={handleExport}
              aria-label="Export"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#111"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="icon-download"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span>Export</span>
            </button>
          </div>
        </header>

        {tab === "sales" ? (
          <div ref={salesRef} className="salesreport-row-flex">
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
                    <td>
                      ₱
                      {totalSales.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
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
                        labels: bestSellers.map((i) => i.name),
                        datasets: [
                          {
                            label: "Sold",
                            data: bestSellers.map((i) => i.count),
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
                  {bestSellers.filter((i) => !i.isAddOn).length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: "center" }}>
                        No sales data available for the selected date range.
                      </td>
                    </tr>
                  ) : (
                    bestSellers
                      .filter((i) => !i.isAddOn)
                      .map((item, idx) => {
                        const unitPrice =
                          item.count > 0 ? item.revenue / item.count : 0;
                        const unitCost = menuIngredientCosts[item.name] || 0;
                        const profit = item.revenue - unitCost * item.count;
                        return (
                          <tr key={item.name}>
                            <td>{idx + 1}</td>
                            <td>{item.name}</td>
                            <td>{item.count}</td>
                            <td>₱{unitPrice.toFixed(2)}</td>
                            <td>₱{item.revenue.toFixed(2)}</td>
                            <td>₱{unitCost.toFixed(2)}</td>
                            <td>₱{profit.toFixed(2)}</td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
                {bestSellers.filter((i) => !i.isAddOn).length > 0 && (
                  <tfoot>
                    <tr className="salesreport-summary-total-row">
                      <td colSpan="2">TOTAL</td>
                      <td>
                        {bestSellers.reduce((acc, i) => acc + i.count, 0)}
                      </td>
                      <td>-</td>
                      <td>
                        ₱
                        {bestSellers
                          .reduce((acc, i) => acc + i.revenue, 0)
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
        <div className="salesreport-bottom-spacer"></div>
        {/* Bottom navigation arrows (fixed) */}
        <div className="salesreport-bottom-nav">
          <button
            className="salesreport-nav-btn"
            disabled={tab === "sales"}
            onClick={() => setTab("sales")}
            aria-label="Go to Sales Report"
            title="Go to Sales Report"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
            <span>Sales Report</span>
          </button>
          <button
            className="salesreport-nav-btn"
            disabled={tab === "summary"}
            onClick={() => setTab("summary")}
            aria-label="Go to Table Summary"
            title="Go to Table Summary"
          >
            <span>Table Summary</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>
      </main>
    </div>
  );
}
