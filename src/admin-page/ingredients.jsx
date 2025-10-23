import React, { useState, useEffect } from "react";
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

export default function IngredientsDashboard() {
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
    const { error } = await supabase.from("ingredient-list").insert([newItem]);
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
    const { error } = await supabase
      .from("ingredient-list")
      .update(editValues)
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
    .filter((item) => (filter === "Status" ? true : item.status === filter));

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
          <a href="/admin/ingredients-dashboard" className="nav-item active">
            Inventory
          </a>
          <a href="/admin/sales-report" className="nav-item">
						Sales Report
					</a>
        </nav>
        <div className="sidebar-logout-wrap">
          <button
            className="nav-item logout"
            onClick={async () => {
              await signOut();
              window.location.href = "/login";
            }}
          >
            Log out
          </button>
        </div>
      </aside>

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
                <th>Item Code</th>
                <th>Item Name</th>
                <th>Category</th>
                <th>Units</th>
                <th>Cost</th>
                <th>Quantity</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7">Loading…</td>
                </tr>
              ) : displayedItems.length === 0 ? (
                <tr>
                  <td colSpan="7">No items yet. Click "Add Item +" to create one.</td>
                </tr>
              ) : (
                displayedItems.map((item) => (
                  <tr key={item.id}>
                    <td>{item.code}</td>
                    <td>{item.name}</td>
                    <td>{item.category}</td>
                    <td>{item.units}</td>
                    <td>₱{item.cost}.00</td>
                    <td>{item.quantity ?? 0}</td>
                    <td>
                      <span className={`status ${item.status.toLowerCase()}`}>{item.status}</span>
                    </td>
                    <td>
                      <button className="edit" onClick={() => openEditModal(item)}>
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
            <div className="adduser-modal">
              <div className="adduser-header-bar">
                <span className="adduser-title">ADD ITEM</span>
              </div>
              <form className="adduser-form" onSubmit={addItem}>
                <label>Item Code:</label>
                <input
                  name="code"
                  value={newItem.code}
                  onChange={(e) => setNewItem({ ...newItem, code: e.target.value })}
                  required
                />

                <label>Item Name:</label>
                <input
                  name="name"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  required
                />

                <label className="category-label">Category:</label>
                <select
                  name="category"
                  value={newItem.category}
                  onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                  className="category-select"
                  required
                >
                  <option value="">Select Category</option>
                  <option value="bread">bread</option>
                  <option value="protein">protein</option>
                  <option value="cheese">cheese</option>
                  <option value="vegetable">vegetable</option>
                  <option value="sauce">sauce</option>
                  <option value="snack">snack</option>
                  <option value="beverage">beverage</option>
                  <option value="add-on">add-on</option>
                </select>

                <label className="units-label">Units:</label>
                <select
                  name="units"
                  value={newItem.units}
                  onChange={(e) => setNewItem({ ...newItem, units: e.target.value })}
                  className="units-select"
                  required
                >
                  <option value="">Select Units</option>
                  <option value="pc">pc</option>
                  <option value="g">g</option>
                  <option value="ml">ml</option>
                  <option value="kg">kg</option>
                  <option value="btl">btl</option>
                </select>

                <label>Cost:</label>
                <input
                  name="cost"
                  type="number"
                  value={newItem.cost}
                  onChange={(e) => setNewItem({ ...newItem, cost: e.target.value })}
                  required
                />

                <label>Quantity:</label>
                <input
                  name="quantity"
                  type="number"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                  required
                />

                <label>Status:</label>
                <select
                  name="status"
                  value={newItem.status}
                  onChange={(e) => setNewItem({ ...newItem, status: e.target.value })}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>

                <div className="modal-actions adduser-actions">
                  <button type="button" className="btn-cancel" onClick={() => setShowForm(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-confirm">
                    Confirm
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Item Modal */}
        {showEditModal && editItem && (
          <div className="modal-bg">
            <div className="adduser-modal">
              <div className="adduser-header-bar">
                <span className="adduser-title">EDIT ITEM</span>
              </div>
              <form className="adduser-form" onSubmit={handleEditSubmit}>
                <label>Item Code:</label>
                <input
                  name="code"
                  value={editValues.code}
                  onChange={handleEditChange}
                  required
                />

                <label>Item Name:</label>
                <input
                  name="name"
                  value={editValues.name}
                  onChange={handleEditChange}
                  required
                />

                <label className="category-label">Category:</label>
                <select
                  name="category"
                  value={editValues.category}
                  onChange={handleEditChange}
                  className="category-select"
                  required
                >
                  <option value="">Select Category</option>
                  <option value="bread">bread</option>
                  <option value="protein">protein</option>
                  <option value="cheese">cheese</option>
                  <option value="vegetable">vegetable</option>
                  <option value="sauce">sauce</option>
                  <option value="snack">snack</option>
                  <option value="beverage">beverage</option>
                  <option value="add-on">add-on</option>
                </select>

                <label className="units-label">Units:</label>
                <select
                  name="units"
                  value={editValues.units}
                  onChange={handleEditChange}
                  className="units-select"
                  required
                >
                  <option value="">Select Units</option>
                  <option value="pc">pc</option>
                  <option value="g">g</option>
                  <option value="ml">ml</option>
                  <option value="kg">kg</option>
                  <option value="btl">btl</option>
                </select>

                <label>Cost:</label>
                <input
                  name="cost"
                  type="number"
                  value={editValues.cost}
                  onChange={handleEditChange}
                  required
                />

                <label>Quantity:</label>
                <input
                  name="quantity"
                  type="number"
                  value={editValues.quantity}
                  onChange={handleEditChange}
                  required
                />

                <label>Status:</label>
                <select
                  name="status"
                  value={editValues.status}
                  onChange={handleEditChange}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>

                <div className="modal-actions adduser-actions">
                  <button type="button" className="btn-cancel" onClick={() => setShowEditModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-confirm">
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