import React, { useState, useEffect } from "react";
import "./ingredients.css";
import { UserAuth } from "../authenticator/AuthContext";
import { supabase } from "../supabaseClient";
import menuIcon from "../assets/menu.png";
import onlineIcon from "../assets/online.png";
import salesIcon from "../assets/sales.png";
import inventoryIcon from "../assets/inventory.png";
import managementIcon from "../assets/management.png";
import logoutIcon from "../assets/logout.png";
import sidebarIcon from "../assets/sidebar.png";
import homeIcon from "../assets/home.png";

const initialItems = [];

export default function IngredientsDashboard() {
  const { signOut } = UserAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [items, setItems] = useState(initialItems);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newItem, setNewItem] = useState({
    code: "",
    name: "",
    category: "",
    units: "",
    cost: "",
    status: "Inactive",
  });
  const [showEditModal, setShowEditModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [editValues, setEditValues] = useState({
    code: "",
    name: "",
    category: "",
    units: "",
    cost: "",
    status: "Inactive",
  });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Status");

  // Filtered & searched items
  const displayedItems = items
    .filter(
      (item) =>
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.code.toLowerCase().includes(search.toLowerCase())
    )
    .filter((item) => (filter === "Status" ? true : item.status === filter));

  // ✅ Fetch items from Supabase
  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("ingredient-list").select("*");
    if (error) {
      console.error(error);
    } else {
      setItems(data || []);
    }
    setLoading(false); // <-- moved outside the if/else so it always runs
  }; // <-- missing brace fixed here!

  useEffect(() => {
    fetchItems();
  }, []);

  // Add item
  const addItem = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from("ingredient-list").insert([newItem]);
    if (error) {
      console.error(error);
    } else {
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
    if (error) {
      console.error(error);
    } else {
      setShowEditModal(false);
      await fetchItems();
    }
    setLoading(false);
  };

  return (
    <div className="ingredients-dashboard" style={{ position: 'relative' }}>
      {/* Go back to Dashboard button at top left inside white container */}
      <a
        href="/staff/dashboard"
        className="go-back-dashboard-btn"
      >
        <img src={homeIcon} alt="Home" className="go-back-dashboard-icon" />
        <span>Back to Dashboard</span>
      </a>
      {/* Logout button at top right inside white container */}
      <button
        className="logout-btn"
        onClick={async (e) => {
          e.preventDefault();
          await signOut();
          window.location.href = "/login";
        }}
      >
        <img src={logoutIcon} alt="Log Out" />
        <span>Log Out</span>
      </button>
      {/* Sidebar toggle button */}
      <button
        className="sidebar-toggle"
        style={{
          position: "fixed",
          top: 24,
          left: 24,
          zIndex: 200,
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
        }}
        onClick={() => setSidebarOpen((open) => !open)}
        aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
      >
        <img src={sidebarIcon} alt="Toggle Sidebar" style={{ width: 36, height: 36 }} />
      </button>

      {/* Sidebar */}
      <div
        className="sidebar-nav"
        style={{
          left: sidebarOpen ? 0 : "-200px",
          transition: "left 0.3s cubic-bezier(.4,0,.2,1)",
          boxShadow: sidebarOpen ? "2px 0 8px rgba(0,0,0,0.07)" : "none",
        }}
      >
          <a className="sidebar-item" href="/menu-list">
            <img src={menuIcon} alt="Menu" />
            <span>Menu</span>
          </a>
          <a className="sidebar-item" href="/online-order">
            <img src={onlineIcon} alt="Online Order" />
            <span>Online Order</span>
          </a>
          <a className="sidebar-item" href="/sales-report">
            <img src={salesIcon} alt="Sales Report" />
            <span>Sales Report</span>
          </a>
          <a className="sidebar-item" href="/ingredients-dashboard">
            <img src={managementIcon} alt="Item List" />
            <span>Item List</span>
          </a>
          <a className="sidebar-item" href="/inventory">
            <img src={inventoryIcon} alt="Inventory" />
            <span>Inventory</span>
          </a>
      </div>

      {/* Main content */}
      <div style={{ transition: "margin-left 0.3s cubic-bezier(.4,0,.2,1)" }}>
        <h1>ITEM MANAGEMENT</h1>
        <div className="admin-controls">
          <input
            type="text"
            placeholder="Search"
            className="admin-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="admin-filter" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option>Status</option>
            <option>Active</option>
            <option>Inactive</option>
          </select>
          <button className="admin-btn-add" onClick={() => setShowForm(true)}>
            Add Item +
          </button>
        </div>

        <table className="admin-user-table">
          <thead>
            <tr>
              <th>Item Code</th>
              <th>Item Name</th>
              <th>Category</th>
              <th>Units</th>
              <th>Cost</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" style={{ textAlign: "center", padding: "10px" }}>
                  Loading...
                </td>
              </tr>
            ) : displayedItems.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: "center", padding: "10px" }}>
                  No items yet. Click "Add Item +" to create one.
                </td>
              </tr>
            ) : (
              displayedItems.map((item) => (
                <tr key={item.id}>
                  <td>{item.code}</td>
                  <td>{item.name}</td>
                  <td>{item.category}</td>
                  <td>{item.units}</td>
                  <td>₱{item.cost}.00</td>
                  <td>
                    <span className={`admin-status ${item.status.toLowerCase()}`}>{item.status}</span>
                  </td>
                  <td>
                    <button className="admin-action edit" onClick={() => openEditModal(item)}>
                      ✏️
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Add Item Form */}
        {showForm && (
          <div className="modal">
            <div className="modal-content">
              <div className="modal-header">Add New Item</div>
              <form onSubmit={addItem}>
                <input
                  type="text"
                  name="code"
                  placeholder="Item Code"
                  value={newItem.code}
                  onChange={(e) => setNewItem({ ...newItem, code: e.target.value })}
                  required
                />
                <input
                  type="text"
                  name="name"
                  placeholder="Item Name"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  required
                />
                <input
                  type="text"
                  name="category"
                  placeholder="Category"
                  value={newItem.category}
                  onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                  required
                />
                <input
                  type="text"
                  name="units"
                  placeholder="Units"
                  value={newItem.units}
                  onChange={(e) => setNewItem({ ...newItem, units: e.target.value })}
                  required
                />
                <input
                  type="number"
                  name="cost"
                  placeholder="Cost"
                  value={newItem.cost}
                  onChange={(e) => setNewItem({ ...newItem, cost: e.target.value })}
                  required
                />
                <select
                  name="status"
                  value={newItem.status}
                  onChange={(e) => setNewItem({ ...newItem, status: e.target.value })}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
                <div className="modal-buttons">
                  <button type="submit" className="save-btn">
                    Save
                  </button>
                  <button type="button" className="cancel-btn" onClick={() => setShowForm(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Item Modal */}
        {showEditModal && editItem && (
          <div className="modal">
            <div className="modal-content">
              <div className="modal-header">Edit Item</div>
              <form onSubmit={handleEditSubmit}>
                <input
                  type="text"
                  name="code"
                  placeholder="Item Code"
                  value={editValues.code}
                  onChange={handleEditChange}
                  required
                />
                <input
                  type="text"
                  name="name"
                  placeholder="Item Name"
                  value={editValues.name}
                  onChange={handleEditChange}
                  required
                />
                <input
                  type="text"
                  name="category"
                  placeholder="Category"
                  value={editValues.category}
                  onChange={handleEditChange}
                  required
                />
                <input
                  type="text"
                  name="units"
                  placeholder="Units"
                  value={editValues.units}
                  onChange={handleEditChange}
                  required
                />
                <input
                  type="number"
                  name="cost"
                  placeholder="Cost"
                  value={editValues.cost}
                  onChange={handleEditChange}
                  required
                />
                <select name="status" value={editValues.status} onChange={handleEditChange}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
                <div className="modal-buttons">
                  <button type="submit" className="save-btn">
                    Update
                  </button>
                  <button type="button" className="cancel-btn" onClick={() => setShowEditModal(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
