import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import "./ingredients.css"; // Use the same CSS as MenuManagement for unified UI
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
  // Place order and deduct ingredients using normalized tables
  // orderData: { user_id, order_items, total_price, payment_type }
  const _placeOrderAndDeduct = async (orderData) => {
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
      // Aggregate ingredient totals from order_item_ingredients for this order
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
              // Fetch current quantity
              const { data: invData, error: invError } = await supabase
                .from("ingredient-list")
                .select("id, quantity")
                .eq("id", ing.ingredient_id)
                .single();
              if (invError || !invData) continue;
              const currentQty = Number(invData.quantity) || 0;
              const newQty = Math.max(currentQty - Number(ing.amount), 0);
              await supabase
                .from("ingredient-list")
                .update({ quantity: newQty })
                .eq("id", invData.id);
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

  // sidebar state handled by shared AdminSidebar
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
    cost: "",
    quantity: "",
    status: "Inactive",
  });
  const [newItem, setNewItem] = useState({
    code: "",
    name: "",
    category: "",
    units: "",
    cost: "",
    quantity: "",
    status: "Inactive",
  });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Status");

  // Fetch items from Supabase
  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("ingredient-list").select("*");
    if (!error) setItems(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, []);

  // Add item
  const addItem = async (e) => {
    e.preventDefault();
    setLoading(true);
    // Auto-toggle status based on quantity
    const itemToAdd = {
      ...newItem,
      status: Number(newItem.quantity) > 0 ? "Active" : "Inactive",
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
        cost: "",
        status: "Inactive",
      });
      await fetchItems();
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
    // Auto-toggle status based on quantity
    const updatedValues = {
      ...editValues,
      status: Number(editValues.quantity) > 0 ? "Active" : "Inactive",
    };
    const { error } = await supabase
      .from("ingredient-list")
      .update(updatedValues)
      .eq("id", editItem.id);
    if (!error) {
      setShowEditModal(false);
      await fetchItems();
    }
    setLoading(false);
  };

  // Filtered & searched items
  const displayedItems = items
    .filter(
      (item) =>
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.code.toLowerCase().includes(search.toLowerCase())
    )
    .filter((item) => (filter === "Status" ? true : item.status === filter))
    .map((item) => ({
      ...item,
      status: Number(item.quantity) > 0 ? "Active" : "Inactive",
    }));

  return (
    <div className="opswat-admin">
      {/* Sidebar */}
      <AdminSidebar active="inventory" />

      {/* Main */}
      <main className="ops-main">
        <header className="ops-header">
          <h1>Inventory</h1>
          <button className="add-btn" onClick={() => setShowForm(true)}>
            Add Item +
          </button>
        </header>

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
                <th>Quantity</th>
                <th>Units</th>
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
                  <tr key={item.id}>
                    <td>{item.category}</td>
                    <td>{item.code}</td>
                    <td>{item.name}</td>
                    <td>{item.quantity ?? 0}</td>
                    <td>{item.units}</td>
                    <td>₱{item.cost}.00</td>
                    <td>
                      <span className={`status ${item.status.toLowerCase()}`}>
                        {item.status}
                      </span>
                    </td>
                    <td>
                      <button
                        className="edit"
                        onClick={() => openEditModal(item)}
                      >
                        ✏️
                      </button>
                    </td>
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
                    <select
                      name="code"
                      value={newItem.code}
                      onChange={(e) => {
                        const code = e.target.value;
                        const selected = itemCodes[newItem.category]?.find(
                          (i) => i.code === code
                        );
                        const unitsArr = unitOptions[code] || [];
                        setNewItem({
                          ...newItem,
                          code,
                          name: selected ? selected.name : "",
                          units: unitsArr[0] || "",
                        });
                      }}
                      required
                      disabled={!newItem.category}
                    >
                      <option value="">Select Code</option>
                      {newItem.category &&
                        itemCodes[newItem.category].map((item) => (
                          <option key={item.code} value={item.code}>
                            {item.code}
                          </option>
                        ))}
                    </select>

                    <label>Item Name:</label>
                    <input name="name" value={newItem.name} readOnly required />
                  </div>
                  <div className="ingredients-form-col">
                    <label>Quantity:</label>
                    <input
                      name="quantity"
                      type="number"
                      value={newItem.quantity}
                      onChange={(e) =>
                        setNewItem({ ...newItem, quantity: e.target.value })
                      }
                      required
                    />
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
                    <label>Cost:</label>
                    <input
                      name="cost"
                      type="number"
                      value={newItem.cost}
                      onChange={(e) =>
                        setNewItem({ ...newItem, cost: e.target.value })
                      }
                      required
                    />
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
                    <label>Quantity:</label>
                    <input
                      name="quantity"
                      type="number"
                      value={editValues.quantity}
                      onChange={handleEditChange}
                      required
                    />
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
                    <label>Cost:</label>
                    <input
                      name="cost"
                      type="number"
                      value={editValues.cost}
                      onChange={handleEditChange}
                      required
                    />
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
