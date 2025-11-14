import React, { useState, useEffect } from "react";
import stockInIcon from "../assets/stockin.png"; // Add your icon file
import stockOutIcon from "../assets/stockout.png"; // Add your icon file
import { UserAuth } from "../authenticator/AuthContext";
import { supabase } from "../supabaseClient";
import "./ingredients.css"; // Use the same CSS as MenuManagement for unified UI
import menuIcon from "../assets/menu.png";
import onlineIcon from "../assets/online.png";
import salesIcon from "../assets/sales.png";
import inventoryIcon from "../assets/inventory.png";
import managementIcon from "../assets/management.png";
import logoutIcon from "../assets/logout.png";
import sidebarIcon from "../assets/sidebar.png";
import homeIcon from "../assets/home.png";

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

export default function IngredientsDashboard() {
  // ...existing state...
  // Helper: get latest unit cost for an ingredient using robust ordering
  const getLatestUnitCost = async (ingredientId) => {
    const { data: stockIns, error } = await supabase
      .from("stock_movement")
      .select("cost, date, created_at, id")
      .eq("ingredient_id", ingredientId)
      .eq("type", "in")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(1);
    if (!error && stockIns && stockIns.length > 0) {
      return Number(stockIns[0].cost) || 0;
    }
    return 0;
  };
  // Automatically update menu item status based on inventory
  const updateMenuItemStatus = async () => {
    // Fetch all menu items
    const { data: menuItems, error: menuError } = await supabase
      .from("menu-list")
      .select("id, status");
    if (menuError || !menuItems) return;
    for (const menuItem of menuItems) {
      // Get required ingredients for this menu item
      const { data: menuIngredients, error: ingError } = await supabase
        .from("menu_ingredients")
        .select("ingredient_id, amount")
        .eq("menu_id", menuItem.id);
      if (ingError || !menuIngredients) continue;
      let isAvailable = true;
      for (const ing of menuIngredients) {
        // Get current inventory for ingredient
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
      // If status needs to change, update menu-list
      const newStatus = isAvailable ? "Active" : "Inactive";
      if (menuItem.status !== newStatus) {
        await supabase
          .from("menu-list")
          .update({ status: newStatus })
          .eq("id", menuItem.id);
      }
    }
  };
  // Low stock threshold
  const LOW_STOCK_THRESHOLD = 5;
  const [showTransactionsModal, setShowTransactionsModal] = useState(false);
  const [transactions, setTransactions] = useState([]);
  // Fetch all stock transactions for modal
  const fetchTransactions = async () => {
    const { data, error } = await supabase
      .from("stock_movement")
      .select("*, ingredient-list(name, code)")
      .order("date", { ascending: false });
    if (!error && data) setTransactions(data);
  };
  // ...existing state...
  const [stockSummary, setStockSummary] = useState({});
  // Stock In/Out modal state
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockType, setStockType] = useState("in");
  const [stockItem, setStockItem] = useState(null);
  const [stockValues, setStockValues] = useState({
    date: "",
    quantity: "",
    cost: "",
  });
  const [stockError, setStockError] = useState("");

  // Open Stock In/Out modal
  const openStockModal = (item, type) => {
    setStockItem(item);
    setStockType(type);
    setStockValues({ date: "", quantity: "", cost: "" });
    setShowStockModal(true);
  };

  // Handle Stock In/Out value change
  const handleStockChange = (e) => {
    const { name, value } = e.target;
    setStockValues((prev) => ({ ...prev, [name]: value }));
  };

  // Submit Stock In/Out transaction
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
    // For stock in, cost is required
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
    // For stock out, check available quantity and prevent negative inventory
    if (stockType === "out") {
      // Get current inventory from stock movements for this ingredient
      let currentQty = 0;
      const { data: movements, error: movError } = await supabase
        .from("stock_movement")
        .select("type, quantity")
        .eq("ingredient_id", stockItem.id);
      if (!movError && movements) {
        for (const m of movements) {
          currentQty += m.type === "in" ? m.quantity : -m.quantity;
        }
      }
      const outQty = Number(stockValues.quantity);
      if (outQty > currentQty) {
        setStockError(`Cannot stock out more than available (${currentQty}).`);
        return;
      }
      // Prevent negative inventory: if outQty would make inventory negative, block
      if (currentQty - outQty < 0) {
        setStockError(
          "This transaction would result in negative inventory. Please adjust the quantity."
        );
        return;
      }
    }
    setLoading(true);
    // Only save cost for stock in
    const txData = {
      ingredient_id: stockItem.id,
      type: stockType,
      date: stockValues.date,
      quantity: Number(stockValues.quantity),
      status: "Active",
      created_at: new Date().toISOString(),
    };
    if (stockType === "in") {
      txData.cost = Number(stockValues.cost);
    }
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
  // Place order and deduct ingredients using normalized tables
  // orderData: { user_id, order_items, total_price, payment_type }
  const placeOrderAndDeduct = async (orderData) => {
    try {
      // 1. Insert order
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
      if (orderError || !orderInsert || !orderInsert[0]) {
        alert(
          "Error placing order: " + (orderError?.message || "No order inserted")
        );
        return;
      }
      const orderId = orderInsert[0].id;

      // 2. Insert order_items and get their IDs
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
        if (itemError || !itemInsert || !itemInsert[0]) continue;
        const orderItemId = itemInsert[0].id;

        // 3. Insert order_item_ingredients for each ingredient
        if (Array.isArray(item.ingredients)) {
          for (const ing of item.ingredients) {
            // Find ingredient_id from ingredient-list
            const { data: ingData, error: ingError } = await supabase
              .from("ingredient-list")
              .select("id")
              .eq("name", ing.name)
              .single();
            if (ingError || !ingData) continue;
            await supabase.from("order_item_ingredients").insert({
              order_item_id: orderItemId,
              ingredient_id: ingData.id,
              amount: Number(ing.amount) * Number(item.quantity),
              created_at: new Date().toISOString(),
            });
          }
        }
      }

      // 4. Deduct inventory based on order_item_ingredients
      // Deduct inventory by inserting stock_movement 'out' transactions
      const { data: usedIngredients, error: usedError } = await supabase
        .from("order_items")
        .select("id")
        .eq("order_id", orderId);
      if (!usedError && usedIngredients) {
        for (const oi of usedIngredients) {
          const { data: ingList, error: ingListError } = await supabase
            .from("order_item_ingredients")
            .select("ingredient_id, amount")
            .eq("order_item_id", oi.id);
          if (!ingListError && ingList) {
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

      alert("Order placed and inventory updated.");
      await fetchItems(); // Refresh inventory
    } catch (err) {
      alert("Error: " + err.message);
    }
  };
  // ...existing code...

  const { signOut } = UserAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [editValues, setEditValues] = useState({
    code: "",
    name: "",
    category: "",
    units: "",
    status: "Inactive",
  });
  const [newItem, setNewItem] = useState({
    code: "",
    name: "",
    category: "",
    units: "",
    status: "Inactive",
  });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Status");

  // Fetch items and stock summary from Supabase
  const fetchItems = async () => {
    setLoading(true);
    const { data: itemsData, error: itemsError } = await supabase
      .from("ingredient-list")
      .select("*");
    if (!itemsError) setItems(itemsData || []);

    // Fetch stock movements and aggregate
    const { data: movements, error: movementsError } = await supabase
      .from("stock_movement")
      .select("ingredient_id, type, quantity, cost, date, created_at, id");
    if (!movementsError && movements) {
      // Sort movements so the latest 'in' per ingredient is last
      movements.sort((a, b) => {
        const d = new Date(a.date) - new Date(b.date);
        if (d !== 0) return d;
        const c = new Date(a.created_at || 0) - new Date(b.created_at || 0);
        if (c !== 0) return c;
        return (a.id || 0) - (b.id || 0);
      });
      // Aggregate by ingredient_id
      const summary = {};
      movements.forEach((m) => {
        if (!summary[m.ingredient_id]) {
          summary[m.ingredient_id] = { quantity: 0, lastCost: 0 };
        }
        if (m.type === "in") {
          summary[m.ingredient_id].quantity += Number(m.quantity);
          summary[m.ingredient_id].lastCost = Number(m.cost); // latest due to sort
        } else if (m.type === "out" || m.type === "Stock Out") {
          summary[m.ingredient_id].quantity -= Number(m.quantity);
        }
      });
      setStockSummary(summary);
    }
    // After updating inventory, update menu item status
    await updateMenuItemStatus();
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
    // Supabase Realtime subscription for stock_movement changes
    const subscription = supabase
      .channel("public:stock_movement")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "stock_movement" },
        () => {
          fetchItems();
        }
      )
      .subscribe();
    // Auto-update total_unit_cost for menu-list when ingredient costs change (stock_movement)
    const subStockMovementCost = supabase
      .channel("stock-movement-cost-update")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "stock_movement" },
        async () => {
          // Fetch all menu items
          const { data: allMenuItems, error: menuError } = await supabase
            .from("menu-list")
            .select();
          if (menuError || !allMenuItems) return;
          for (const menuItem of allMenuItems) {
            // Get ingredients for this menu item
            const { data: menuIngredients, error: menuIngError } =
              await supabase
                .from("menu_ingredients")
                .select("ingredient_id, amount")
                .eq("menu_id", menuItem.id);
            if (menuIngError || !menuIngredients) continue;
            let totalUnitCost = 0;
            for (const ing of menuIngredients) {
              const unitCost = await getLatestUnitCost(ing.ingredient_id);
              totalUnitCost += unitCost * Number(ing.amount);
            }
            // Update menu-list with new total_unit_cost if changed
            if (totalUnitCost !== menuItem.total_unit_cost) {
              await supabase
                .from("menu-list")
                .update({ total_unit_cost: totalUnitCost })
                .eq("id", menuItem.id);
            }
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(subscription);
      supabase.removeChannel(subStockMovementCost);
    };
  }, []);

  // Add item
  const addItem = async (e) => {
    e.preventDefault();
    setLoading(true);
    // Validation: check required fields
    if (!newItem.code || !newItem.name || !newItem.category || !newItem.units) {
      alert("All fields are required.");
      setLoading(false);
      return;
    }
    // Validation: check for duplicate code or name
    const { data: existingItems, error: fetchError } = await supabase
      .from("ingredient-list")
      .select("code, name");
    if (fetchError) {
      alert("Error checking for duplicates: " + fetchError.message);
      setLoading(false);
      return;
    }
    const duplicateCode = existingItems.some(
      (item) =>
        item.code.trim().toLowerCase() === newItem.code.trim().toLowerCase()
    );
    const duplicateName = existingItems.some(
      (item) =>
        item.name.trim().toLowerCase() === newItem.name.trim().toLowerCase()
    );
    if (duplicateCode) {
      alert("Item code already exists. Please use a unique code.");
      setLoading(false);
      return;
    }
    if (duplicateName) {
      alert("Item name already exists. Please use a unique name.");
      setLoading(false);
      return;
    }
    // Status is always 'Inactive' for new items; quantity managed via stock movements
    // Only include valid columns for ingredient-list
    const itemToAdd = {
      code: newItem.code,
      name: newItem.name,
      category: newItem.category,
      units: newItem.units,
      status: "Inactive",
    };
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
      // Immediately fetch latest inventory and menu item status after adding
      await fetchItems();
      // Optionally, fetch menu-list status if you want to show it in the UI
      // const { data: menuItems } = await supabase.from("menu-list").select("id, name, status");
      // setMenuItems(menuItems || []);
    } else {
      alert("Failed to add item: " + (error.message || JSON.stringify(error)));
    }
    setLoading(false);
  };

  // Edit modal handlers
  const openEditModal = (item) => {
    setEditItem(item);
    setEditValues({ ...item });
    setShowEditModal(true);
  };
  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    // Status is not toggled by edit; quantity managed via stock movements
    const updatedValues = {
      ...editValues,
    };
    const { error } = await supabase
      .from("ingredient-list")
      .update(updatedValues)
      .eq("id", editItem.id);
    if (!error) {
      setShowEditModal(false);
      // Immediately fetch latest inventory and menu item status after editing
      await fetchItems();
      // Optionally, fetch menu-list status if you want to show it in the UI
      // const { data: menuItems } = await supabase.from("menu-list").select("id, name, status");
      // setMenuItems(menuItems || []);
    }
    setLoading(false);
  };

  // Filtered & searched items with stock summary
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
      } else if (
        summary.quantity > 0 &&
        summary.quantity <= LOW_STOCK_THRESHOLD
      ) {
        status = "Active";
        lowStock = true;
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
      // Only filter if filter is 'Active' or 'Inactive'
      if (filter === "Active" || filter === "Inactive") {
        return item.status === filter;
      }
      return true;
    });

  // Count of low stock items for sidebar badge
  const lowStockCount = displayedItems.filter((item) => item.lowStock).length;

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
            className="nav-item active"
            style={{ position: "relative" }}
          >
            {lowStockCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  left: "-8px",
                  top: "10%",
                  transform: "translateY(-50%)",
                  background: "red",
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
          <a href="/admin/sales-report" className="nav-item">
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

      {/* Main */}
      <main className="ops-main">
        <header className="ops-header">
          <h1>Inventory</h1>
          <button className="add-btn" onClick={() => setShowForm(true)}>
            Add Item +
          </button>
          <button
            className="transactions-btn"
            style={{ marginLeft: "8px" }}
            onClick={async () => {
              await fetchTransactions();
              setShowTransactionsModal(true);
            }}
          >
            Stock Transactions
          </button>
        </header>
        {/* Stock Transactions Modal */}
        {showTransactionsModal && (
          <div className="modal-bg">
            <div className="ingredients-modal" style={{ maxWidth: "600px" }}>
              <div className="adduser-header-bar">
                <span className="adduser-title">Stock Transactions</span>
              </div>
              <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                {transactions.length === 0 ? (
                  <div style={{ padding: "16px" }}>No transactions found.</div>
                ) : (
                  transactions.map((tx) => (
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
                      <div>
                        <b>{tx["ingredient-list"]?.name || "Unknown"}</b> (
                        {tx["ingredient-list"]?.code || ""})
                      </div>
                      <div>Date: {tx.date}</div>
                      <div>
                        Type:{" "}
                        <b
                          style={{ color: tx.type === "in" ? "green" : "red" }}
                        >
                          {tx.type.toUpperCase()}
                        </b>
                      </div>
                      <div>Quantity: {tx.quantity}</div>
                      <div>
                        Cost: ₱
                        {(() => {
                          if (tx.type === "in") return tx.cost;
                          // For stock out, find most recent stock in before this tx.date
                          const recentIn = transactions
                            .filter(
                              (t2) =>
                                t2.ingredient_id === tx.ingredient_id &&
                                t2.type === "in" &&
                                new Date(t2.date) <= new Date(tx.date)
                            )
                            .sort(
                              (a, b) => new Date(b.date) - new Date(a.date)
                            )[0];
                          return recentIn ? recentIn.cost : "-";
                        })()}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="modal-actions adduser-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowTransactionsModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="ops-controls">
          <input
            type="text"
            className="search"
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option>Status</option>
            <option>Active</option>
            <option>Inactive</option>
          </select>
        </div>

        <div className="table-wrap">
          <table className="ops-table">
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
                        className="edit"
                        onClick={() => openEditModal(item)}
                      >
                        ✏️
                      </button>
                      <button
                        className="stock-in"
                        title="Stock In"
                        onClick={() => openStockModal(item, "in")}
                        style={{ marginLeft: "4px" }}
                      >
                        <img
                          src={stockInIcon}
                          alt="Stock In"
                          style={{ width: "18px" }}
                        />
                      </button>
                      <button
                        className="stock-out"
                        title="Stock Out"
                        onClick={() => openStockModal(item, "out")}
                        style={{ marginLeft: "4px" }}
                      >
                        <img
                          src={stockOutIcon}
                          alt="Stock Out"
                          style={{ width: "18px" }}
                        />
                      </button>
                    </td>
                    {/* Stock In/Out Modal */}
                    {showStockModal && stockItem && (
                      <div className="modal-bg">
                        <div className="ingredients-modal">
                          <div className="adduser-header-bar">
                            <span className="adduser-title">
                              {stockType === "in" ? "STOCK IN" : "STOCK OUT"} -{" "}
                              {stockItem.name}
                            </span>
                          </div>
                          <form
                            className="adduser-form"
                            onSubmit={handleStockSubmit}
                          >
                            <div className="ingredients-form-row">
                              <div className="ingredients-form-col">
                                <label>Date:</label>
                                <input
                                  name="date"
                                  type="date"
                                  value={stockValues.date}
                                  onChange={handleStockChange}
                                  required
                                />
                                <label>Quantity:</label>
                                <input
                                  name="quantity"
                                  type="number"
                                  value={stockValues.quantity}
                                  onChange={handleStockChange}
                                  required
                                  min="1"
                                />
                                {stockType === "in" && (
                                  <>
                                    <label>Cost:</label>
                                    <input
                                      name="cost"
                                      type="number"
                                      value={stockValues.cost}
                                      onChange={handleStockChange}
                                      required
                                      min="0"
                                    />
                                  </>
                                )}
                              </div>
                            </div>
                            {stockError && (
                              <div
                                style={{ color: "red", marginBottom: "8px" }}
                              >
                                {stockError}
                              </div>
                            )}
                            <div className="modal-actions adduser-actions">
                              <button
                                type="submit"
                                className="btn-confirm"
                                disabled={loading}
                              >
                                {loading ? "Saving..." : "Confirm"}
                              </button>
                              <button
                                type="button"
                                className="btn-cancel"
                                onClick={() => setShowStockModal(false)}
                                disabled={loading}
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        </div>
                      </div>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Add Item Modal */}
        {showForm && (
          <div className="modal-bg">
            <div className="ingredients-modal">
              <div className="adduser-header-bar">
                <span className="adduser-title">ADD ITEM</span>
              </div>
              <form className="adduser-form" onSubmit={addItem}>
                <div className="ingredients-form-row">
                  <div className="ingredients-form-col">
                    <label>Category:</label>
                    <select
                      name="category"
                      value={newItem.category}
                      onChange={(e) => {
                        const category = e.target.value;
                        setNewItem({
                          ...newItem,
                          category,
                          code: "",
                          name: "",
                        });
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

                    <label>Item Code:</label>
                    <input
                      name="code"
                      type="text"
                      value={newItem.code}
                      onChange={(e) => {
                        const code = e.target.value;
                        const unitsArr = unitOptions[code] || [];
                        setNewItem({
                          ...newItem,
                          code,
                          units: unitsArr[0] || "",
                        });
                      }}
                      required
                      disabled={!newItem.category}
                      placeholder="Type or paste item code"
                    />

                    <label>Item Name:</label>
                    <input
                      name="name"
                      type="text"
                      value={newItem.name}
                      onChange={(e) =>
                        setNewItem({ ...newItem, name: e.target.value })
                      }
                      required
                      placeholder="Type item name"
                      disabled={!newItem.category}
                    />
                  </div>
                  <div className="ingredients-form-col">
                    {/* Quantity is now managed via stock movements */}
                    <label>Units:</label>
                    <select
                      name="units"
                      value={newItem.units}
                      onChange={(e) =>
                        setNewItem({ ...newItem, units: e.target.value })
                      }
                      required
                      disabled={!newItem.code}
                    >
                      <option value="">Select Unit</option>
                      {newItem.code &&
                        unitOptions[newItem.code]?.map((unit) => (
                          <option key={unit} value={unit}>
                            {unit}
                          </option>
                        ))}
                    </select>
                    {/* Cost is now managed via stock movements */}
                  </div>
                </div>
                <div className="modal-actions adduser-actions">
                  <button type="submit" className="btn-confirm">
                    Confirm
                  </button>
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Item Modal */}
        {showEditModal && editItem && (
          <div className="modal-bg">
            <div className="ingredients-modal">
              <div className="adduser-header-bar">
                <span className="adduser-title">EDIT ITEM</span>
              </div>
              <form className="adduser-form" onSubmit={handleEditSubmit}>
                <div className="ingredients-form-row">
                  <div className="ingredients-form-col">
                    <label>Category:</label>
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

                    <label>Item Code:</label>
                    <select
                      name="code"
                      value={editValues.code}
                      disabled
                      required
                    >
                      <option value="">Select Code</option>
                      {editValues.category &&
                        itemCodes[editValues.category].map((item) => (
                          <option key={item.code} value={item.code}>
                            {item.code}
                          </option>
                        ))}
                    </select>

                    <label>Item Name:</label>
                    <input
                      name="name"
                      value={editValues.name}
                      readOnly
                      required
                    />

                    <label>Status:</label>
                    <select
                      name="status"
                      value={editValues.status}
                      disabled
                      required
                    >
                      <option value="Inactive">Inactive</option>
                      <option value="Active">Active</option>
                    </select>
                  </div>
                  <div className="ingredients-form-col">
                    {/* Quantity is now managed via stock movements */}
                    <label>Units:</label>
                    <select
                      name="units"
                      value={editValues.units}
                      disabled
                      required
                    >
                      <option value="">Select Unit</option>
                      {editValues.code &&
                        unitOptions[editValues.code]?.map((unit) => (
                          <option key={unit} value={unit}>
                            {unit}
                          </option>
                        ))}
                    </select>
                    {/* Cost is now managed via stock movements */}
                  </div>
                </div>
                <div className="modal-actions adduser-actions">
                  <button type="submit" className="btn-confirm">
                    Confirm
                  </button>
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => setShowEditModal(false)}
                  >
                    Cancel
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
