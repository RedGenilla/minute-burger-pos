

import minuteLogo from "../assets/minute.png";
import userIcon from "../assets/user.png";
import menuIcon from "../assets/menu.png";
import logoutIcon from "../assets/logout.png";
import sidebarIcon from "../assets/sidebar.png";
import "./MenuManagement.css";

import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { UserAuth } from "../authenticator/AuthContext";

const MenuManagement = () => {
  const { session } = UserAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [editingId, setEditingId] = useState(null); // Track editing item
  const [menuForm, setMenuForm] = useState({
    image: null,
    item_name: "",
    category: "",
    price: "",
    status: "Active",
    description: ""
  });
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  // Redirect to login if not authenticated
  useEffect(() => {
    if (session === null) {
      window.location.replace("/login");
    }
  }, [session]);

  // Fetch menu items from Supabase on mount
  useEffect(() => {
    const fetchMenuItems = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("menu-list")
        .select("id, item_name, category, price, status, description, image_url")
        .order("id", { ascending: false });
      if (error) {
        alert("Error fetching menu items: " + error.message);
      } else {
        setMenuItems(data || []);
      }
      setLoading(false);
    };
    fetchMenuItems();
  }, []);

  // Open modal for add
  const openAddModal = () => {
    setEditingId(null);
    setMenuForm({ image: null, item_name: "", category: "", price: "", status: "Active", description: "" });
    setShowAddMenu(true);
  };

  // Open modal for edit
  const handleEditMenu = (id) => {
    const item = menuItems.find(item => item.id === id);
    if (item) {
      setEditingId(id);
      setMenuForm({
        image: null, // Don't prefill file input
        item_name: item.item_name,
        category: item.category,
        price: item.price,
        status: item.status,
        description: item.description
      });
      setShowAddMenu(true);
    }
  };

  // Handle add or edit submit (Supabase + Storage)
  const handleMenuSubmit = async (e) => {
    e.preventDefault();
    // Validate required fields for add
    if (!editingId) {
      if (
        !menuForm.image ||
        !menuForm.item_name.trim() ||
        !menuForm.category.trim() ||
        !String(menuForm.price).trim() ||
        !menuForm.status.trim() ||
        !menuForm.description.trim()
      ) {
        alert("Please fill out all fields and upload an image.");
        return;
      }
    }
    // Validate required fields for edit (image not required)
    if (editingId) {
      if (
        !menuForm.item_name.trim() ||
        !menuForm.category.trim() ||
        !String(menuForm.price).trim() ||
        !menuForm.status.trim() ||
        !menuForm.description.trim()
      ) {
        alert("Please fill out all fields.");
        return;
      }
    }

    let image_url = null;
    // If a new image is selected, upload to Supabase Storage
    if (menuForm.image) {
      const fileExt = menuForm.image.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 8)}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('manu-images')
        .upload(fileName, menuForm.image, { cacheControl: '3600', upsert: false });
      if (uploadError) {
        alert('Image upload failed: ' + uploadError.message);
        return;
      }
      // Get public URL
  const { data: publicUrlData } = supabase.storage.from('manu-images').getPublicUrl(fileName);
  image_url = publicUrlData.publicUrl;
    } else if (editingId) {
      const existing = menuItems.find(item => item.id === editingId);
      image_url = existing?.image_url || null;
    }

    if (editingId) {
      // Edit mode: update row in Supabase
      const { error } = await supabase
        .from("menu-list")
        .update({
          item_name: menuForm.item_name,
          category: menuForm.category,
          price: menuForm.price,
          status: menuForm.status,
          description: menuForm.description,
          image_url: image_url
        })
        .eq("id", editingId);
      if (error) {
        alert("Error updating menu item: " + error.message);
        return;
      }
    } else {
      // Add mode: insert row in Supabase
      const { error } = await supabase
        .from("menu-list")
        .insert([
          {
            item_name: menuForm.item_name,
            category: menuForm.category,
            price: menuForm.price,
            status: menuForm.status,
            description: menuForm.description,
            image_url: image_url
          }
        ]);
      if (error) {
        alert("Error adding menu item: " + error.message);
        return;
      }
    }
    // Refresh menu items
    const { data, error: fetchError } = await supabase
      .from("menu-list")
      .select("id, item_name, category, price, status, description, image_url")
      .order("id", { ascending: false });
    if (!fetchError) setMenuItems(data || []);
    setShowAddMenu(false);
    setEditingId(null);
    setMenuForm({ image: null, item_name: "", category: "", price: "", status: "Active", description: "" });
  };

  // Delete menu item from Supabase
  const handleDeleteMenu = async (id) => {
    const { error } = await supabase
      .from("menu-list")
      .delete()
      .eq("id", id);
    if (error) {
      alert("Error deleting menu item: " + error.message);
      return;
    }
    setMenuItems(menuItems.filter(item => item.id !== id));
  };

  return (
    <div className="menu-management-page">
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
        <a className="sidebar-item" href="/admin-user-management">
          <img src={userIcon} alt="User Management" />
          <span>User Management</span>
        </a>
        <a className="sidebar-item" href="/admin/menu-management">
          <img src={menuIcon} alt="Menu Management" />
          <span>Menu Management</span>
        </a>
        <a className="sidebar-item logout" href="/login">
          <img src={logoutIcon} alt="Log Out" />
          <span>Log Out</span>
        </a>
      </div>

      {/* Main content */}
      <div style={{ transition: "margin-left 0.3s cubic-bezier(.4,0,.2,1)" }}>
        <div className="menu-header">
          <span>MINUTE</span>
          <img src={minuteLogo} alt="Minute Burger Logo" className="menu-header-logo" />
          <span>BURGER</span>
        </div>
        <h2 className="menu-management-title">Menu Management</h2>

        <div className="controls">
          <input type="text" placeholder="Search" />
          <select>
            <option>Category</option>
          </select>
          <button className="add-menu" onClick={openAddModal}>Add Menu +</button>
        </div>
        {/* ...existing code... */}
        {showAddMenu && (
          <div className="addmenu-overlay">
            <div className="addmenu-modal">
              <h2>{editingId ? "EDIT MENU" : "ADD MENU"}</h2>
              <div className="upload-box" onClick={() => document.getElementById('menu-image-input').click()}>
                {menuForm.image
                  ? <img src={URL.createObjectURL(menuForm.image)} alt="Menu Preview" />
                  : editingId && menuItems.find(item => item.id === editingId)?.image_url
                    ? <img src={menuItems.find(item => item.id === editingId).image_url} alt="Menu Preview" />
                    : <span>Upload Image</span>
                }
                <input
                  id="menu-image-input"
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={e => {
                    if (e.target.files[0]) {
                      setMenuForm({ ...menuForm, image: e.target.files[0] });
                    }
                  }}
                />
              </div>
              <form className="addmenu-form" onSubmit={handleMenuSubmit}>
                <label>Item Name:</label>
                <input type="text" value={menuForm.item_name} onChange={e => setMenuForm({ ...menuForm, item_name: e.target.value })} required />

                <label>Category:</label>
                <select value={menuForm.category} onChange={e => setMenuForm({ ...menuForm, category: e.target.value })} required>
                  <option value="">Select Category</option>
                  <option value="Sulit">Sulit Burgers</option>
                  <option value="Premium">Premium Burgers</option>
                  <option value="Add-Ons">Add-Ons Snacks</option>
                  <option value="Bundles">Bundles</option>
                  <option value="Family Bundles">Family Bundles</option>
                  <option value="Beverage">Beverage / Drinks</option>
                  <option value="Limited Time Offers">Limited Time Offers</option>
                  {/* Add more categories as needed */}
                </select>

                <label>Price:</label>
                <input type="number" value={menuForm.price} onChange={e => setMenuForm({ ...menuForm, price: e.target.value })} required min="0" step="0.01" />

                <label>Status:</label>
                <div className="status-options">
                  <button type="button" className={`status-btn ${menuForm.status === 'Active' ? 'active' : ''}`} onClick={() => setMenuForm({ ...menuForm, status: 'Active' })}>Active</button>
                  <button type="button" className={`status-btn ${menuForm.status === 'Inactive' ? 'inactive' : ''}`} onClick={() => setMenuForm({ ...menuForm, status: 'Inactive' })}>Inactive</button>
                </div>

                <label>Item Description:</label>
                <textarea value={menuForm.description} onChange={e => setMenuForm({ ...menuForm, description: e.target.value })} required />

                <div className="modal-actions">
                  <button type="button" className="btn-cancel" onClick={() => { setShowAddMenu(false); setEditingId(null); }}>Cancel</button>
                  <button type="submit" className="btn-confirm">Confirm</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Render menu items as cards outside the modal */}
        <div className="menu-items-list">
          {loading ? (
            <div style={{ textAlign: 'center', width: '100%' }}>Loading menu items...</div>
          ) : menuItems.length === 0 ? (
            <div style={{ textAlign: 'center', width: '100%', marginTop: '38px', fontWeight: 'bold' }}>No menu items found.</div>
          ) : (
            menuItems.map(item => (
              <div className="menu-item" key={item.id}>
                {item.image_url && <img src={item.image_url} alt={item.item_name} />}
                <div className="menu-item-details">
                  <h3 className="menu-item-name">{item.item_name}</h3>
                  <p className="menu-item-description">{item.description}</p>
                  <p className="menu-item-price">₱{parseFloat(item.price).toFixed(2)}</p>
                </div>
                <span className={`menu-item-status${item.status === 'Inactive' ? ' inactive' : ''}`}>{item.status}</span>
                <div className="menu-item-actions">
                  <button className="edit" onClick={() => handleEditMenu(item.id)}>✏️</button>
                  <button className="delete" onClick={() => handleDeleteMenu(item.id)}>🗑️</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default MenuManagement;
