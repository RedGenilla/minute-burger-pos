import React, { useState, useEffect } from "react";
// Replaced PNG icons with inline SVGs for stock in/out actions
import { UserAuth } from "../authenticator/AuthContext";
import { supabase } from "../supabaseClient";
import "./ingredients.css";
import AdminSidebar from "./AdminSidebar";

const categoryOptions = [
  { value: "BR", label: "BR/Bread" },
  { value: "PR", label: "PR/Protein" },
  { value: "CH", label: "CH/Cheese" },
  { value: "VG", label: "VG/Vegetable" },
  { value: "SC", label: "SC/Sauce" },
  { value: "SD", label: "SD/Snack" },
  { value: "BV", label: "BV/Beverage" },
  { value: "EX", label: "EX/Add-on" },
];

/* eslint-disable no-unused-vars */
const itemCodes = {
  BR: [
    { code: "BR-001", name: "Burger Bun (Regular)" },
    { code: "BR-002", name: "Burger Bun (Premium)" },
    { code: "BR-003", name: "Hotdog Bun" },
  ],
  PR: [
    { code: "PR-001", name: "Beef Patty (Regular)" },
    { code: "PR-002", name: "Beef Patty (Premium)" },
    { code: "PR-003", name: "Chicken Patty (Regular)" },
    { code: "PR-004", name: "Chicken Patty (Premium)" },
    { code: "PR-005", name: "Frank Sausage" },
    { code: "PR-006", name: "Bacon Stripes" },
    { code: "PR-007", name: "Whole egg" },
  ],
  CH: [
    { code: "CH-001", name: "Cheese Slice" },
    { code: "CH-002", name: "Cheese Sauce" },
  ],
  VG: [
    { code: "VG-001", name: "Lettuce" },
    { code: "VG-002", name: "Tomato" },
    { code: "VG-003", name: "Onion" },
    { code: "VG-004", name: "Cabbage" },
  ],
  SC: [
    { code: "SC-001", name: "Ketchup" },
    { code: "SC-002", name: "Mayonnaise" },
    { code: "SC-003", name: "Mustard" },
    { code: "SC-004", name: "Shawarma Sauce" },
    { code: "SC-005", name: "Chimichurri Sauce" },
    { code: "SC-006", name: "Roasted Sesame Dressing" },
    { code: "SC-007", name: "Black Pepper Sauce" },
    { code: "SC-008", name: "Chili con Carne" },
  ],
  SD: [
    { code: "SD-001", name: "Nachos" },
    { code: "SD-002", name: "Clover Chips" },
    { code: "SD-003", name: "Coleslaw Mix" },
  ],
  BV: [
    { code: "BV-001", name: "Iced Choco Mix" },
    { code: "BV-002", name: "Hot Choco Mix" },
    { code: "BV-003", name: "Coffee Mix" },
    { code: "BV-004", name: "Milk Tea Syrup (Wintermelon)" },
    { code: "BV-005", name: "Milk Tea Syrup (Krazy)" },
    { code: "BV-006", name: "Juice Concentrate (Calamansi)" },
    { code: "BV-007", name: "Juice Concentrate (Fruitwist)" },
    { code: "BV-008", name: "Mineral Water" },
  ],
  EX: [
    { code: "EX-001", name: "Extra Cheese" },
    { code: "EX-002", name: "Extra Egg" },
    { code: "EX-003", name: "Extra Coleslaw" },
  ],
};

const unitOptions = {
  "BR-001": ["pc"],
  "BR-002": ["pc"],
  "BR-003": ["pc"],
  "PR-001": ["pc"],
  "PR-002": ["pc"],
  "PR-003": ["pc"],
  "PR-004": ["pc"],
  "PR-005": ["pc"],
  "PR-006": ["strips", "pack"],
  "PR-007": ["pc"],
  "CH-001": ["slice"],
  "CH-002": ["g", "L"],
  "VG-001": ["g"],
  "VG-002": ["pc", "g"],
  "VG-003": ["pc", "g"],
  "VG-004": ["kg"],
  "SC-001": ["g", "ml"],
  "SC-002": ["g", "ml"],
  "SC-003": ["g", "ml"],
  "SC-004": ["g", "ml"],
  "SC-005": ["g", "ml"],
  "SC-006": ["g", "ml"],
  "SC-007": ["g", "ml"],
  "SC-008": ["g"],
  "SD-001": ["g"],
  "SD-002": ["pack"],
  "SD-003": ["g"],
  "BV-001": ["g"],
  "BV-002": ["g"],
  "BV-003": ["g"],
  "BV-004": ["ml"],
  "BV-005": ["ml"],
  "BV-006": ["ml"],
  "BV-007": ["ml"],
  "BV-008": ["bit"],
  "EX-001": ["slice"],
  "EX-002": ["pc"],
  "EX-003": ["g"],
};
/* eslint-enable no-unused-vars */

export default function IngredientsDashboard() {
  const { session } = UserAuth();
  useEffect(() => {
    if (session === null) window.location.href = "/login";
  }, [session]);

  const LOW_STOCK_THRESHOLD = 5;

  const [items, setItems] = useState([]);
  const [stockSummary, setStockSummary] = useState({});
  const [loading, setLoading] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [newItem, setNewItem] = useState({
    code: "",
    name: "",
    category: "",
    units: "",
    status: "Inactive",
  });

  const [showEditModal, setShowEditModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [editValues, setEditValues] = useState({
    code: "",
    name: "",
    category: "",
    units: "",
    status: "Inactive",
  });

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Status");
  const [categoryFilter, setCategoryFilter] = useState("Category");

  const [showTransactionsModal, setShowTransactionsModal] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [txTypeFilter, setTxTypeFilter] = useState("All");
  const [txCategoryFilter, setTxCategoryFilter] = useState("All");
  const [txSearchInput, setTxSearchInput] = useState("");
  const [txSearch, setTxSearch] = useState("");

  const [showStockModal, setShowStockModal] = useState(false);
  const [stockType, setStockType] = useState("in");
  const [stockItem, setStockItem] = useState(null);
  const [stockValues, setStockValues] = useState({
    date: "",
    quantity: "",
    cost: "",
  });
  const [stockError, setStockError] = useState("");

  const updateMenuItemStatus = async () => {
    const { data: menuItems, error: menuError } = await supabase
      .from("menu-list")
      .select("id, status");
    if (menuError || !menuItems) return;
    for (const menuItem of menuItems) {
      const { data: menuIngredients, error: ingError } = await supabase
        .from("menu_ingredients")
        .select("ingredient_id, amount")
        .eq("menu_id", menuItem.id);
      if (ingError || !menuIngredients) continue;
      let isAvailable = true;
      for (const ing of menuIngredients) {
        const { data: movements, error: movError } = await supabase
          .from("stock_movement")
          .select("type, quantity")
          .eq("ingredient_id", ing.ingredient_id);
        if (movError || !movements) continue;
        let currentQty = 0;
        for (const m of movements) {
          currentQty += m.type === "in" ? m.quantity : -m.quantity;
        }
        if (currentQty < Number(ing.amount)) {
          isAvailable = false;
          break;
        }
      }
      const newStatus = isAvailable ? "Active" : "Inactive";
      if (menuItem.status !== newStatus) {
        await supabase
          .from("menu-list")
          .update({ status: newStatus })
          .eq("id", menuItem.id);
      }
    }
  };

  const fetchTransactions = async () => {
    const { data, error } = await supabase
      .from("stock_movement")
      .select("*, ingredient-list(name, code)")
      .order("date", { ascending: false });
    if (!error && data) setTransactions(data);
  };

  const openStockModal = (item, type) => {
    setStockItem(item);
    setStockType(type);
    setStockValues({ date: "", quantity: "", cost: "" });
    setShowStockModal(true);
  };

  const handleStockChange = (e) => {
    const { name, value } = e.target;
    setStockValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleStockSubmit = async (e) => {
    e.preventDefault();
    setStockError("");
    if (!stockItem) {
      setStockError("No item selected.");
      return;
    }
    if (!stockValues.date) {
      setStockError("Date is required.");
      return;
    }
    if (
      !stockValues.quantity ||
      isNaN(stockValues.quantity) ||
      Number(stockValues.quantity) <= 0
    ) {
      setStockError("Quantity must be a positive number.");
      return;
    }
    if (stockType === "in") {
      if (
        !stockValues.cost ||
        isNaN(stockValues.cost) ||
        Number(stockValues.cost) < 0
      ) {
        setStockError("Cost must be zero or a positive number.");
        return;
      }
    }
    if (stockType === "out") {
      let currentQty = 0;
      const { data: movements } = await supabase
        .from("stock_movement")
        .select("type, quantity")
        .eq("ingredient_id", stockItem.id);
      if (movements) {
        for (const m of movements)
          currentQty += m.type === "in" ? m.quantity : -m.quantity;
      }
      const outQty = Number(stockValues.quantity);
      if (outQty > currentQty) {
        setStockError(`Cannot stock out more than available (${currentQty}).`);
        return;
      }
      if (currentQty - outQty < 0) {
        setStockError("Negative inventory not allowed.");
        return;
      }
    }
    setLoading(true);
    const txData = {
      ingredient_id: stockItem.id,
      type: stockType,
      date: stockValues.date,
      quantity: Number(stockValues.quantity),
      status: "Active",
      created_at: new Date().toISOString(),
      ...(stockType === "in" && { cost: Number(stockValues.cost) }),
    };
    const { error } = await supabase.from("stock_movement").insert(txData);
    if (error) {
      setStockError("Failed to save transaction: " + error.message);
      setLoading(false);
      return;
    }
    setShowStockModal(false);
    setStockItem(null);
    setStockValues({ date: "", quantity: "", cost: "" });
    await fetchItems();
    setLoading(false);
  };

  // (Kept for parity; not invoked here)
  const _placeOrderAndDeduct = async (orderData) => {
    try {
      const { data: orderInsert, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: orderData.user_id,
          total_price: orderData.total_price,
          payment_type: orderData.payment_type,
          status: "pending",
          created_at: new Date().toISOString(),
        })
        .select();
      if (orderError || !orderInsert?.[0]) return;
      const orderId = orderInsert[0].id;
      for (const item of orderData.order_items) {
        const { data: itemInsert, error: itemError } = await supabase
          .from("order_items")
          .insert({
            order_id: orderId,
            menu_item_id: item.menu_item_id,
            quantity: item.quantity,
            price: item.price,
            created_at: new Date().toISOString(),
          })
          .select();
        if (itemError || !itemInsert?.[0]) continue;
        const orderItemId = itemInsert[0].id;
        if (Array.isArray(item.ingredients)) {
          for (const ing of item.ingredients) {
            const { data: ingData } = await supabase
              .from("ingredient-list")
              .select("id")
              .eq("name", ing.name)
              .single();
            if (!ingData) continue;
            await supabase.from("order_item_ingredients").insert({
              order_item_id: orderItemId,
              ingredient_id: ingData.id,
              amount: Number(ing.amount) * Number(item.quantity),
              created_at: new Date().toISOString(),
            });
          }
        }
      }
      const { data: used } = await supabase
        .from("order_items")
        .select("id")
        .eq("order_id", orderId);
      if (used) {
        for (const oi of used) {
          const { data: ingList } = await supabase
            .from("order_item_ingredients")
            .select("ingredient_id, amount")
            .eq("order_item_id", oi.id);
          if (ingList) {
            for (const ing of ingList) {
              await supabase.from("stock_movement").insert({
                ingredient_id: ing.ingredient_id,
                type: "out",
                quantity: Number(ing.amount),
                date: new Date().toISOString(),
                status: "Active",
                created_at: new Date().toISOString(),
              });
            }
          }
        }
      }
      await fetchItems();
    } catch {
      /* no-op */
    }
  };

  const fetchItems = async () => {
    setLoading(true);
    const { data: itemsData } = await supabase
      .from("ingredient-list")
      .select("*");
    setItems(itemsData || []);
    const { data: movements } = await supabase
      .from("stock_movement")
      .select("ingredient_id, type, quantity, cost");
    if (movements) {
      const summary = {};
      movements.forEach((m) => {
        if (!summary[m.ingredient_id]) {
          summary[m.ingredient_id] = { quantity: 0, lastCost: 0 };
        }
        if (m.type === "in") {
          summary[m.ingredient_id].quantity += Number(m.quantity);
          summary[m.ingredient_id].lastCost = Number(m.cost);
        } else if (m.type === "out") {
          summary[m.ingredient_id].quantity -= Number(m.quantity);
        }
      });
      setStockSummary(summary);
    }
    await updateMenuItemStatus();
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addItem = async (e) => {
    e.preventDefault();
    setLoading(true);
    const itemToAdd = { ...newItem, status: "Inactive" };
    const { error } = await supabase
      .from("ingredient-list")
      .insert([itemToAdd]);
    if (!error) {
      setShowForm(false);
      setNewItem({
        code: "",
        name: "",
        category: "",
        units: "",
        status: "Inactive",
      });
      await fetchItems();
    }
    setLoading(false);
  };

  const openEditModal = (item) => {
    setEditItem(item);
    setEditValues({ ...item });
    setShowEditModal(true);
  };

  // removed unused handleEditChange to satisfy lint rules

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase
      .from("ingredient-list")
      .update({ ...editValues })
      .eq("id", editItem.id);
    if (!error) {
      setShowEditModal(false);
      await fetchItems();
    }
    setLoading(false);
  };

  const displayedItems = items
    .filter(
      (item) =>
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.code.toLowerCase().includes(search.toLowerCase())
    )
    .map((item) => {
      const summary = stockSummary[item.id] || { quantity: 0, lastCost: 0 };
      let status = "Inactive";
      let lowStock = false;
      if (summary.quantity > LOW_STOCK_THRESHOLD) {
        status = "Active";
      } else if (summary.quantity > 0) {
        status = "Active";
        if (summary.quantity <= LOW_STOCK_THRESHOLD) lowStock = true;
      }
      return {
        ...item,
        quantity: summary.quantity,
        cost: summary.lastCost,
        status,
        lowStock,
      };
    })
    .filter((item) => {
      if (filter === "Active" || filter === "Inactive")
        return item.status === filter;
      return true;
    })
    .filter((item) =>
      categoryFilter === "Category" ? true : item.category === categoryFilter
    );

  return (
    <div className="opswat-admin">
      <AdminSidebar
        active="inventory"
        lowStockCount={(() => {
          try {
            const count = (items || [])
              .filter(
                (item) =>
                  item.name.toLowerCase().includes(search.toLowerCase()) ||
                  item.code.toLowerCase().includes(search.toLowerCase())
              )
              .map((item) => {
                const summary = stockSummary[item.id] || {
                  quantity: 0,
                  lastCost: 0,
                };
                let lowStock = false;
                if (
                  summary.quantity > 0 &&
                  summary.quantity <= LOW_STOCK_THRESHOLD
                ) {
                  lowStock = true;
                }
                return { ...item, lowStock };
              })
              .filter((item) => {
                if (filter === "Active" || filter === "Inactive") {
                  const summary = stockSummary[item.id] || { quantity: 0 };
                  const status = summary.quantity > 0 ? "Active" : "Inactive";
                  return status === filter;
                }
                return true;
              })
              .filter((item) => item.lowStock).length;
            return count;
          } catch {
            return 0;
          }
        })()}
      />

      <main className="ops-main">
        <header className="ops-header">
          <h1>Inventory</h1>
        </header>
        <div className="ops-controls ops-controls-row">
          <div className="controls-left">
            <div className="search-input-wrap">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="search-icon"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                type="text"
                className="search"
                placeholder="Search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="status-filter"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option>Status</option>
              <option>Active</option>
              <option>Inactive</option>
            </select>
            <select
              className="category-filter"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option>Category</option>
              {categoryOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="controls-right">
            <button
              className="transactions-btn gray-btn"
              onClick={async () => {
                await fetchTransactions();
                setShowTransactionsModal(true);
              }}
              type="button"
            >
              Stock Transactions
            </button>
            <button
              className="add-btn"
              onClick={() => setShowForm(true)}
              type="button"
            >
              + Add Item
            </button>
          </div>
        </div>

        {showTransactionsModal && (
          <div className="modal-bg">
            <div
              className="adminboard-modal"
              style={{ maxWidth: "400px", width: "100%", textAlign: "left" }}
            >
              <button
                className="modal-close-x"
                onClick={() => setShowTransactionsModal(false)}
                aria-label="Close modal"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="25"
                  height="25"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#000000"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ display: "block" }}
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
              <span className="adduser-title">Stock Transactions</span>

              {/* Filters: Search (row 1), then Type and Category (row 2) */}
              <div style={{ margin: "6px 0 8px" }}>
                <div className="search-input-wrap" style={{ width: "100%" }}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="search-icon"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                  <input
                    type="text"
                    className="search"
                    placeholder="Search"
                    value={txSearchInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTxSearchInput(val);
                      setTxSearch(val);
                    }}
                    style={{ width: "100%" }}
                  />
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  margin: "0 0 10px",
                }}
              >
                <select
                  value={txTypeFilter}
                  onChange={(e) => setTxTypeFilter(e.target.value)}
                  style={{
                    padding: "6px 8px",
                    border: "1px solid #ccc",
                    borderRadius: 6,
                    flex: 1,
                  }}
                >
                  <option value="All">All Types</option>
                  <option value="in">Stock In</option>
                  <option value="out">Stock Out</option>
                </select>
                <select
                  value={txCategoryFilter}
                  onChange={(e) => setTxCategoryFilter(e.target.value)}
                  style={{
                    padding: "6px 8px",
                    border: "1px solid #ccc",
                    borderRadius: 6,
                    flex: 1,
                  }}
                >
                  <option value="All">All Categories</option>
                  {categoryOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.value}
                    </option>
                  ))}
                </select>
              </div>

              <div
                style={{
                  maxHeight: "400px",
                  minHeight: "220px",
                  overflowY: "auto",
                }}
              >
                {transactions
                  .filter((tx) =>
                    txTypeFilter === "All" ? true : tx.type === txTypeFilter
                  )
                  .filter((tx) => {
                    if (txCategoryFilter === "All") return true;
                    const code = tx["ingredient-list"]?.code || "";
                    const prefix = code.split("-")[0] || "";
                    return prefix === txCategoryFilter;
                  })
                  .filter((tx) => {
                    if (!txSearch) return true;
                    const nm = (
                      tx["ingredient-list"]?.name || ""
                    ).toLowerCase();
                    return nm.includes(txSearch.toLowerCase());
                  }).length === 0 ? (
                  <div style={{ padding: "16px" }}>
                    {txCategoryFilter !== "All"
                      ? `No transactions in this category.`
                      : `No transactions found.`}
                  </div>
                ) : (
                  transactions
                    .filter((tx) =>
                      txTypeFilter === "All" ? true : tx.type === txTypeFilter
                    )
                    .filter((tx) => {
                      if (txCategoryFilter === "All") return true;
                      const code = tx["ingredient-list"]?.code || "";
                      const prefix = code.split("-")[0] || "";
                      return prefix === txCategoryFilter;
                    })
                    .filter((tx) => {
                      if (!txSearch) return true;
                      const nm = (
                        tx["ingredient-list"]?.name || ""
                      ).toLowerCase();
                      return nm.includes(txSearch.toLowerCase());
                    })
                    .map((tx) => (
                      <div
                        key={tx.id}
                        style={{
                          border: "1px solid #ccc",
                          borderRadius: "8px",
                          margin: "8px 0",
                          padding: "12px",
                          background: tx.type === "in" ? "#e6ffe6" : "#ffe6e6",
                        }}
                      >
                        <div style={{ fontWeight: 700, marginBottom: 4 }}>
                          Name: {tx["ingredient-list"]?.name || "Unknown"}
                        </div>
                        <div style={{ marginBottom: 2 }}>
                          Category: {tx["ingredient-list"]?.code || ""}
                        </div>
                        <div style={{ marginBottom: 2 }}>
                          Type:{" "}
                          <b
                            style={{
                              color: tx.type === "in" ? "green" : "red",
                            }}
                          >
                            {tx.type.toUpperCase()}
                          </b>
                        </div>
                        <div style={{ marginBottom: 2 }}>
                          Quantity: {tx.quantity}
                        </div>
                        <div style={{ marginBottom: 2 }}>
                          Cost: ₱
                          {tx.type === "in"
                            ? tx.cost
                            : (() => {
                                const recentIn = transactions
                                  .filter(
                                    (t2) =>
                                      t2.ingredient_id === tx.ingredient_id &&
                                      t2.type === "in" &&
                                      new Date(t2.date) <= new Date(tx.date)
                                  )
                                  .sort(
                                    (a, b) =>
                                      new Date(b.date) - new Date(a.date)
                                  )[0];
                                return recentIn ? recentIn.cost : "-";
                              })()}
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Old simple controls removed; unified controls row above */}

        <div className="table-wrap">
          <table className="ops-table">
            <colgroup>
              <col style={{ width: "90px" }} />
              <col style={{ width: "100px" }} />
              <col />
              <col style={{ width: "90px" }} />
              <col style={{ width: "90px" }} />
              <col style={{ width: "90px" }} />
              <col style={{ width: "90px" }} />
              <col style={{ width: "120px" }} />
            </colgroup>
            <thead>
              <tr>
                <th>Category</th>
                <th>Item Code</th>
                <th>Item Name</th>
                <th>Units</th>
                <th>Quantity</th>
                <th>Cost</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8">Loading…</td>
                </tr>
              ) : displayedItems.length === 0 ? (
                <tr>
                  <td colSpan="8">
                    No items yet. Click "Add Item +" to create one.
                  </td>
                </tr>
              ) : (
                displayedItems.map((item) => (
                  <tr
                    key={item.id}
                    style={
                      item.lowStock ? { background: "#ffe6e6" } : undefined
                    }
                  >
                    <td>{item.category}</td>
                    <td>{item.code}</td>
                    <td>{item.name}</td>
                    <td>{item.units}</td>
                    <td>{item.quantity}</td>
                    <td>₱{item.cost}</td>
                    <td>
                      <span className={`status ${item.status.toLowerCase()}`}>
                        {item.status}
                      </span>
                      {item.lowStock && (
                        <span
                          style={{
                            background: "red",
                            color: "white",
                            borderRadius: "6px",
                            padding: "2px 8px",
                            marginLeft: "8px",
                            fontSize: "0.8em",
                            fontWeight: "bold",
                          }}
                        >
                          Low Stock
                        </span>
                      )}
                    </td>
                    <td>
                      <button
                        className="edit-icon-btn"
                        onClick={() => openEditModal(item)}
                        aria-label="Edit user"
                        title="Edit"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" />
                          <path d="M20.71 7.04a1.003 1.003 0 0 0 0-1.41l-2.34-2.34a1.003 1.003 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                        </svg>
                      </button>
                      <button
                        className="stock-in"
                        title="Stock In"
                        onClick={() => openStockModal(item, "in")}
                        style={{
                          marginLeft: "4px",
                          padding: 0,
                          background: "none",
                          border: "none",
                        }}
                        aria-label="Stock In"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          aria-hidden="true"
                        >
                          {/* OUTER BORDER */}
                          <rect
                            x="1"
                            y="1"
                            width="22"
                            height="22"
                            stroke="#000"
                            strokeWidth="1"
                            fill="none"
                            rx="4"
                            ry="4"
                          />

                          {/* INNER BOX */}
                          <rect
                            x="5"
                            y="8"
                            width="14"
                            height="10"
                            fill="#f7d64d"
                            stroke="#f7d64d"
                            strokeWidth="2  "
                          />

                          {/* ARROW DOWN */}
                          <path
                            d="M12 4v8m0 0l-3-3m3 3l3-3"
                            stroke="#000"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>

                      <button
                        className="stock-out"
                        title="Stock Out"
                        onClick={() => openStockModal(item, "out")}
                        style={{
                          marginLeft: "4px",
                          padding: 0,
                          background: "none",
                          border: "none",
                        }}
                        aria-label="Stock Out"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          aria-hidden="true"
                        >
                          {/* OUTER BORDER */}
                          <rect
                            x="1"
                            y="1"
                            width="22"
                            height="22"
                            stroke="#000"
                            strokeWidth="1"
                            fill="none"
                            rx="4"
                            ry="4"
                          />

                          {/* INNER BOX */}
                          <rect
                            x="5"
                            y="6"
                            width="14"
                            height="10"
                            fill="#e46700"
                            stroke="#e46700"
                            strokeWidth="2"
                          />

                          {/* ARROW UP */}
                          <path
                            d="M12 20V12m0 0l-3 3m3-3l3 3"
                            stroke="#000"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {showStockModal && stockItem && (
          <div className="modal-bg">
            <div
              className="adminboard-modal"
              style={{ width: "420px", textAlign: "left" }}
            >
              <button
                className="modal-close-x"
                onClick={() => setShowStockModal(false)}
                aria-label="Close modal"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="25"
                  height="25"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#000000"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ display: "block" }}
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
              <span className="adduser-title">
                {stockType === "in" ? "STOCK IN" : "STOCK OUT"} -{" "}
                {stockItem.name}
              </span>
              <form className="adduser-form" onSubmit={handleStockSubmit}>
                <label>Date</label>
                <input
                  name="date"
                  type="date"
                  value={stockValues.date}
                  onChange={handleStockChange}
                  required
                />

                {stockType === "in" ? (
                  <div className="two-col-row">
                    <div>
                      <label>Quantity</label>
                      <input
                        name="quantity"
                        type="number"
                        value={stockValues.quantity}
                        onChange={handleStockChange}
                        required
                        min="1"
                      />
                    </div>
                    <div>
                      <label>Cost</label>
                      <input
                        name="cost"
                        type="number"
                        value={stockValues.cost}
                        onChange={handleStockChange}
                        required
                        min="0"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <label>Quantity</label>
                    <input
                      name="quantity"
                      type="number"
                      value={stockValues.quantity}
                      onChange={handleStockChange}
                      required
                      min="1"
                    />
                  </>
                )}

                {stockError && (
                  <div style={{ color: "red", marginBottom: "8px" }}>
                    {stockError}
                  </div>
                )}
                <div className="single-confirm-wrap">
                  <button
                    type="submit"
                    className="btn-confirm full-width-confirm"
                    disabled={loading}
                  >
                    {loading ? "Saving..." : "Confirm"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showForm && (
          <div className="modal-bg">
            <div className="adminboard-modal">
              <button
                className="modal-close-x"
                onClick={() => setShowForm(false)}
                aria-label="Close modal"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="25"
                  height="25"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#000000"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ display: "block" }}
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
              <span className="adduser-title">ADD ITEM</span>
              <form className="adduser-form" onSubmit={addItem}>
                {/* Row 1: Name */}
                <label>Item Name</label>
                <input
                  name="name"
                  type="text"
                  value={newItem.name}
                  onChange={(e) =>
                    setNewItem({ ...newItem, name: e.target.value })
                  }
                  required
                  placeholder="Type item name"
                />

                {/* Row 2: Category */}
                <label>Category</label>
                <select
                  name="category"
                  value={newItem.category}
                  onChange={(e) => {
                    const category = e.target.value;
                    setNewItem({ ...newItem, category });
                  }}
                  required
                >
                  <option value="">Select Category</option>
                  {categoryOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                {/* Row 3: Item Code + Units side-by-side */}
                <div className="two-col-row">
                  <div>
                    <label>Item Code</label>
                    <input
                      name="code"
                      type="text"
                      value={newItem.code}
                      onChange={(e) =>
                        setNewItem({ ...newItem, code: e.target.value })
                      }
                      required
                      placeholder="Type or paste item code"
                    />
                  </div>
                  <div>
                    <label>Units</label>
                    <input
                      name="units"
                      type="text"
                      value={newItem.units}
                      onChange={(e) =>
                        setNewItem({ ...newItem, units: e.target.value })
                      }
                      required
                      placeholder="e.g. pc, g, ml"
                    />
                  </div>
                </div>

                <div className="single-confirm-wrap">
                  <button
                    type="submit"
                    className="btn-confirm full-width-confirm"
                  >
                    Confirm
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showEditModal && editItem && (
          <div className="modal-bg">
            <div className="adminboard-modal">
              <button
                className="modal-close-x"
                onClick={() => setShowEditModal(false)}
                aria-label="Close modal"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="25"
                  height="25"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#000000"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ display: "block" }}
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
              <span className="adduser-title">EDIT ITEM</span>
              <form className="adduser-form" onSubmit={handleEditSubmit}>
                <label>Category</label>
                <select
                  name="category"
                  value={editValues.category}
                  disabled
                  required
                >
                  <option value="">Select Category</option>
                  {categoryOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                <label>Item Name</label>
                <input name="name" value={editValues.name} readOnly required />

                <div className="two-col-row">
                  <div>
                    <label>Item Code</label>
                    <input
                      name="code"
                      value={editValues.code}
                      readOnly
                      required
                    />
                  </div>
                  <div>
                    <label>Units</label>
                    <input
                      name="units"
                      value={editValues.units}
                      readOnly
                      required
                    />
                  </div>
                </div>

                <label>Status</label>
                <select
                  name="status"
                  value={editValues.status}
                  disabled
                  required
                >
                  <option value="Inactive">Inactive</option>
                  <option value="Active">Active</option>
                </select>

                <div className="single-confirm-wrap">
                  <button
                    type="submit"
                    className="btn-confirm full-width-confirm"
                  >
                    Confirm
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
