import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { UserAuth } from "../authenticator/AuthContext";
import "./MenuManagement.css";

export default function MenuBoard() {
  // Place order and deduct ingredients
  const placeOrder = async (menuItemId, quantity = 1) => {
    // Find the menu item
    const menuItem = menuItems.find((item) => item.id === menuItemId);
    if (!menuItem) {
      alert("Menu item not found.");
      return;
    }
    // Parse ingredients
    let ingredients = [];
    try {
      ingredients =
        typeof menuItem.ingredients_item === "string"
          ? JSON.parse(menuItem.ingredients_item)
          : menuItem.ingredients_item || [];
    } catch {
      ingredients = [];
    }
    // Add order to orders table (store menu item details in order_items JSON array)
    const orderItems = [
      {
        menu_item_id: menuItemId,
        item_name: menuItem.item_name,
        quantity,
        ingredients: ingredients,
      },
    ];
    const { error: orderError } = await supabase.from("orders").insert([
      {
        order_items: JSON.stringify(orderItems),
        created_at: new Date().toISOString(),
        // Add other fields as needed (user_id, total_price, status, payment_type, etc.)
      },
    ]);
    if (orderError) {
      alert("Failed to place order: " + orderError.message);
      return;
    }
    // Deduction logic removed. Only order recording happens here.
    alert("Order placed.");
    setRefreshMenu((prev) => !prev);
  };
  // Ingredient list for dropdown
  const [ingredientOptions, setIngredientOptions] = useState([]);
  const { session } = UserAuth();
  const navigate = useNavigate();

  // Fetch ingredient-list from Supabase for dropdown
  useEffect(() => {
    const fetchIngredients = async () => {
      const { data, error } = await supabase
        .from("ingredient-list")
        .select("name, quantity");
      if (!error && data) {
        setIngredientOptions(data); // store as array of objects {name, quantity}
      }
    };
    fetchIngredients();
  }, []);
  const { signOut } = UserAuth();

  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Status");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  // Ingredient modal state for edit modal
  const [showEditIngredientForm, setShowEditIngredientForm] = useState(false);
  const [editIngredientForm, setEditIngredientForm] = useState({
    name: "",
    amount: "",
    unit: "",
  });
  const [editIngredientError, setEditIngredientError] = useState("");
  const [editIngredientIndex, setEditIngredientIndex] = useState(null);

  // Ingredient handlers for edit modal
  const handleEditModalIngredientChange = async (e) => {
    const { name, value } = e.target;
    setEditIngredientError("");
    setEditIngredientForm((prev) => ({ ...prev, [name]: value }));
  };
  const handleAddEditModalIngredient = () => {
    setEditIngredientForm({ name: "", amount: "", unit: "" });
    setEditIngredientIndex(null);
    setShowEditIngredientForm(true);
  };
  const handleEditEditModalIngredient = (idx) => {
    if (!editItem?.ingredients?.[idx]) return;
    setEditIngredientForm(editItem.ingredients[idx]);
    setEditIngredientIndex(idx);
    setShowEditIngredientForm(true);
  };
  const handleDeleteEditModalIngredient = (idx) => {
    setEditItem((prev) => ({
      ...prev,
      ingredients: (prev.ingredients || []).filter((_, i) => i !== idx),
    }));
  };
  const handleEditIngredientFormSubmit = (e) => {
    e.preventDefault();
    if (
      !editIngredientForm.name ||
      !editIngredientForm.amount ||
      !editIngredientForm.unit
    )
      return;
    // Fetch unit cost from Supabase ingredient-list
    const fetchAndSetIngredient = async () => {
      let unitCost = 0;
      try {
        const { data, error } = await supabase
          .from("ingredient-list")
          .select("name, cost")
          .eq("name", editIngredientForm.name)
          .single();
        if (!error && data && data.cost) {
          unitCost = parseFloat(data.cost);
        }
      } catch {}
      const amount = parseFloat(editIngredientForm.amount);
      const totalCost = unitCost * amount;
      const newIngredient = {
        name: editIngredientForm.name,
        amount: editIngredientForm.amount,
        unit: editIngredientForm.unit,
        total_cost: totalCost.toFixed(2),
      };
      if (editIngredientIndex !== null) {
        setEditItem((prev) => ({
          ...prev,
          ingredients: prev.ingredients.map((ing, i) =>
            i === editIngredientIndex ? newIngredient : ing
          ),
        }));
      } else {
        setEditItem((prev) => ({
          ...prev,
          ingredients: [...(prev.ingredients || []), newIngredient],
        }));
      }
      setShowEditIngredientForm(false);
      setEditIngredientForm({ name: "", amount: "", unit: "" });
      setEditIngredientIndex(null);
    };
    fetchAndSetIngredient();
  };
  const handleCancelEditIngredient = () => {
    setShowEditIngredientForm(false);
    setEditIngredientForm({ name: "", amount: "", unit: "" });
    setEditIngredientIndex(null);
  };
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const [refreshMenu, setRefreshMenu] = useState(false);

  const [newItem, setNewItem] = useState({
    item_name: "",
    category: "",
    price: "",
    status: "Active",
    description: "",
    image: null,
    ingredients: [], // local state for form
  });

  // itemCodes mapping from ingredients.jsx
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

  // Unit options mapping from ingredients.jsx
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

  // Ingredient modal state for add modal
  const [showIngredientModal, setShowIngredientModal] = useState(false);
  const [ingredientName, setIngredientName] = useState("");
  const [ingredientAmount, setIngredientAmount] = useState("");
  const [ingredientUnit, setIngredientUnit] = useState("");
  const [ingredientError, setIngredientError] = useState("");
  const [ingredientEditIndex, setIngredientEditIndex] = useState(null);

  const handleAddIngredient = () => {
    setShowIngredientModal(true);
    setIngredientError("");
    setIngredientName("");
    setIngredientAmount("");
    setIngredientUnit("");
    setIngredientEditIndex(null);
    // Reset error state for duplicate/over-amount
  };

  const handleEditIngredient = (idx) => {
    const ing = newItem.ingredients[idx];
    setIngredientName(ing.name);
    setIngredientAmount(ing.amount);
    setIngredientUnit(ing.unit);
    setShowIngredientModal(true);
    setIngredientEditIndex(idx);
  };

  const handleConfirmIngredient = async () => {
    if (
      !ingredientName.trim() ||
      !ingredientAmount.trim() ||
      !ingredientUnit.trim()
    ) {
      setIngredientError("Please fill in all fields.");
      return;
    }
    // Fetch unit cost from Supabase ingredient-list
    let unitCost = 0;
    try {
      const { data, error } = await supabase
        .from("ingredient-list")
        .select("name, cost")
        .eq("name", ingredientName)
        .single();
      if (!error && data && data.cost) {
        unitCost = parseFloat(data.cost);
      }
    } catch {}

    const amount = parseFloat(ingredientAmount);
    const totalCost = unitCost * amount;
    const newIngredient = {
      name: ingredientName,
      amount: ingredientAmount,
      unit: ingredientUnit,
      total_cost: totalCost.toFixed(2),
    };
    if (ingredientEditIndex !== null) {
      // Edit existing ingredient
      setNewItem((prev) => ({
        ...prev,
        ingredients: prev.ingredients.map((ing, i) =>
          i === ingredientEditIndex ? newIngredient : ing
        ),
      }));
    } else {
      // Add new ingredient
      setNewItem((prev) => ({
        ...prev,
        ingredients: [...(prev.ingredients || []), newIngredient],
      }));
    }
    setIngredientName("");
    setIngredientAmount("");
    setIngredientUnit("");
    setIngredientEditIndex(null);
    setShowIngredientModal(false);
    setIngredientError("");
  };

  const handleCancelIngredient = () => {
    setShowIngredientModal(false);
    setIngredientError("");
    setIngredientEditIndex(null);
  };

  // fetch & subscribe
  useEffect(() => {
    const fetchMenu = async () => {
      setLoading(true);
      let query = supabase.from("menu-list").select();
      if (filter !== "Status") query = query.eq("status", filter);
      const { data, error } = await query;
      if (!error) setMenuItems(data || []);
      setLoading(false);
    };
    fetchMenu();
    const sub = supabase
      .channel("menu-list-status")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "menu-list" },
        fetchMenu
      )
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, [filter, showForm, refreshMenu]);

  // add item
  const addItem = async (e) => {
    e.preventDefault();
    // Validate required fields
    if (
      !newItem.image ||
      !newItem.item_name.trim() ||
      !newItem.category.trim() ||
      !String(newItem.price).trim() ||
      !newItem.status.trim() ||
      !newItem.description.trim()
    ) {
      alert("Please fill out all fields and upload an image.");
      return;
    }
    // Upload image to Supabase Storage
    let image_url = null;
    if (newItem.image) {
      const fileExt = newItem.image.name.split(".").pop();
      const fileName = `${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 8)}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("manu-images")
        .upload(fileName, newItem.image, {
          cacheControl: "3600",
          upsert: false,
        });
      if (uploadError) {
        alert("Image upload failed: " + uploadError.message);
        return;
      }
      const { data: publicUrlData } = supabase.storage
        .from("manu-images")
        .getPublicUrl(fileName);
      image_url = publicUrlData.publicUrl;
    }
    const { error: menuError } = await supabase.from("menu-list").insert([
      {
        item_name: newItem.item_name,
        category: newItem.category,
        price: newItem.price,
        status: newItem.status,
        description: newItem.description,
        image_url: image_url,
        ingredients_item: JSON.stringify(newItem.ingredients),
      },
    ]);
    // Do NOT subtract ingredient quantities in inventory here
    setShowForm(false);
    setNewItem({
      item_name: "",
      category: "",
      price: "",
      status: "Active",
      description: "",
      image: null,
      ingredients: [],
    });
    // clear ingredient inline state too
    setShowIngredientForm(false);
    setIngredientForm({ name: "", amount: "", unit: "" });
    setEditIndex(null);
    setIngredientErrors({});
  };

  // edit item
  const openEditModal = (m) => {
    // ensure ingredients_item is array (maybe stored as JSON string in DB)
    let normalized = { ...m };
    try {
      if (typeof normalized.ingredients_item === "string") {
        normalized.ingredients_item = JSON.parse(normalized.ingredients_item);
      }
    } catch {
      normalized.ingredients_item = normalized.ingredients_item || [];
    }
    // for backward compatibility, fallback to ingredients if ingredients_item is missing
    if (!normalized.ingredients_item && normalized.ingredients) {
      try {
        normalized.ingredients_item =
          typeof normalized.ingredients === "string"
            ? JSON.parse(normalized.ingredients)
            : normalized.ingredients;
      } catch {
        normalized.ingredients_item = [];
      }
    }
    setEditItem({ ...normalized });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    const { error } = await supabase
      .from("menu-list")
      .update({
        item_name: editItem.item_name,
        category: editItem.category,
        price: editItem.price,
        status: editItem.status,
        description: editItem.description,
        ingredients_item: JSON.stringify(editItem.ingredients_item || []),
      })
      .eq("id", editItem.id);
    if (error) setEditError("Failed to update item");
    else {
      setShowEditModal(false);
      setRefreshMenu((prev) => !prev);
    }
    setEditLoading(false);
  };

  const displayedItems = menuItems.filter(
    (m) =>
      m.item_name.toLowerCase().includes(search.toLowerCase()) ||
      m.category.toLowerCase().includes(search.toLowerCase())
  );

  // Helper to get ingredients for display (handles both add and edit modals)
  const getIngredientsForDisplay = (item, isEdit) => {
    if (!item) return [];
    if (isEdit) return item.ingredients_item || [];
    return item.ingredients || [];
  };
  useEffect(() => {
    if (session === null) {
      window.location.href = "/login";
    }
  }, [session]);

  return (
    <div className="opswat-admin">
      {/* Example usage: Place order for first menu item (for testing) */}
      {/* <button onClick={() => placeOrder(menuItems[0]?.id, 1)}>Test Order (Deduct Ingredients)</button> */}
      {/* Sidebar */}
      <aside className={`ops-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="ops-logo">Minute Admin</div>
        <nav className="sidebar-nav-links">
          <a href="/admin-user-management" className="nav-item">
            User Management
          </a>
          <a href="/admin/menu-management" className="nav-item active">
            Menu Management
          </a>
          <a href="/admin/ingredients-dashboard" className="nav-item">
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
              navigate("/login");
            }}
          >
            Log out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="ops-main">
        <header className="ops-header">
          <h1>Menu Management</h1>
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
                <th>Item Name</th>
                <th>Category</th>
                <th>Price (₱)</th>
                <th>Status</th>
                <th>Description</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6">Loading…</td>
                </tr>
              ) : displayedItems.length === 0 ? (
                <tr>
                  <td colSpan="6">No items found.</td>
                </tr>
              ) : (
                displayedItems.map((m) => (
                  <tr key={m.id}>
                    <td>{m.item_name}</td>
                    <td>{m.category}</td>
                    <td>{parseFloat(m.price).toFixed(2)}</td>
                    <td>
                      <span className={`status ${m.status.toLowerCase()}`}>
                        {m.status}
                      </span>
                    </td>
                    <td>{m.description}</td>
                    <td>
                      <button className="edit" onClick={() => openEditModal(m)}>
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
                <span className="adduser-title adduser-title-lg">
                  ADD MENU ITEM
                </span>
              </div>
              <form className="adduser-form" onSubmit={addItem}>
                <div
                  className="adduser-modal-row"
                  style={{ display: "flex", gap: 24 }}
                >
                  {/* Left: Image and Description */}
                  <div className="adduser-modal-left" style={{ flex: 1 }}>
                    <div
                      className="upload-box upload-box-modal"
                      onClick={() =>
                        document.getElementById("menu-image-input").click()
                      }
                      role="button"
                      tabIndex={0}
                    >
                      {newItem.image ? (
                        <img
                          src={URL.createObjectURL(newItem.image)}
                          alt="Preview"
                        />
                      ) : (
                        <div className="upload-box-label">Upload Image</div>
                      )}
                      <input
                        id="menu-image-input"
                        name="image"
                        type="file"
                        accept="image/*"
                        className="upload-input-hidden"
                        onChange={(e) => {
                          if (e.target.files[0]) {
                            setNewItem((prev) => ({
                              ...prev,
                              image: e.target.files[0],
                            }));
                          }
                        }}
                        required
                      />
                    </div>

                    <label>Description:</label>
                    <textarea
                      value={newItem.description}
                      onChange={(e) =>
                        setNewItem({ ...newItem, description: e.target.value })
                      }
                      required
                      className="adduser-description"
                    />
                  </div>

                  {/* Right: Fields and Ingredients */}
                  <div className="adduser-modal-right" style={{ flex: 1.2 }}>
                    <label>Item Name:</label>
                    <input
                      value={newItem.item_name}
                      onChange={(e) =>
                        setNewItem({ ...newItem, item_name: e.target.value })
                      }
                      required
                    />

                    <div
                      className="adduser-fields-row"
                      style={{ display: "flex", gap: 12, marginTop: 8 }}
                    >
                      <div className="adduser-field-col" style={{ flex: 1 }}>
                        <label>Category</label>
                        <select
                          name="category"
                          value={newItem.category}
                          onChange={(e) =>
                            setNewItem({ ...newItem, category: e.target.value })
                          }
                          required
                        >
                          <option value="">Select Category</option>
                          <option value="Sulit">Sulit</option>
                          <option value="Premium">Premium</option>
                          <option value="Add-Ons">Add-Ons</option>
                          <option value="Bundles">Bundles</option>
                          <option value="Family Bundles">Family Bundles</option>
                          <option value="Beverage">Beverage</option>
                          <option value="Limited Time Offers">
                            Limited Time Offers
                          </option>
                        </select>
                      </div>
                      <div className="adduser-field-col" style={{ flex: 0.6 }}>
                        <label>Status</label>
                        <select
                          value={newItem.status}
                          onChange={(e) =>
                            setNewItem({ ...newItem, status: e.target.value })
                          }
                        >
                          <option>Active</option>
                          <option>Inactive</option>
                        </select>
                      </div>
                      <div className="adduser-field-col" style={{ flex: 0.8 }}>
                        <label>Price</label>
                        <input
                          type="number"
                          step="0.01"
                          value={newItem.price}
                          onChange={(e) =>
                            setNewItem({ ...newItem, price: e.target.value })
                          }
                          required
                        />
                      </div>
                    </div>

                    {/* INGREDIENTS SECTION (with modal add) */}
                    <label
                      className="adduser-ingredients-label"
                      style={{ marginTop: 16 }}
                    >
                      Ingredients:
                    </label>
                    <div
                      className="adduser-ingredients-box"
                      style={{ marginTop: 8 }}
                    >
                      <table
                        className="adduser-ingredients-table"
                        style={{ width: "70%" }}
                      >
                        <thead>
                          <tr>
                            <th className="ingredient-th-name">Name</th>
                            <th className="ingredient-th-amount">Amount</th>
                            <th className="ingredient-th-unit">Unit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getIngredientsForDisplay(newItem, false).length ===
                          0 ? (
                            <tr>
                              <td
                                colSpan="3"
                                className="adduser-ingredients-empty"
                              >
                                No ingredients yet.
                              </td>
                            </tr>
                          ) : (
                            getIngredientsForDisplay(newItem, false).map(
                              (ing, idx) => (
                                <tr
                                  key={idx}
                                  className="adduser-ingredient-row"
                                >
                                  <td>{ing.name}</td>
                                  <td>{ing.amount}</td>
                                  <td>{ing.unit}</td>
                                  <td>
                                    <div className="ingredient-action-btn-group">
                                      <button
                                        type="button"
                                        className="adduser-ingredient-edit ingredient-action-btn"
                                        title="Edit"
                                        onClick={() =>
                                          handleEditIngredient(idx)
                                        }
                                      >
                                        Edit
                                      </button>
                                      <button
                                        type="button"
                                        className="adduser-ingredient-delete ingredient-action-btn"
                                        title="Delete"
                                        onClick={() => {
                                          setNewItem((prev) => ({
                                            ...prev,
                                            ingredients:
                                              prev.ingredients.filter(
                                                (_, i) => i !== idx
                                              ),
                                          }));
                                        }}
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              )
                            )
                          )}
                        </tbody>
                      </table>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          marginTop: 8,
                        }}
                      >
                        <button
                          type="button"
                          className="add-ingredient-btn"
                          onClick={handleAddIngredient}
                        >
                          +
                        </button>
                      </div>
                    </div>
                    {/* Add Ingredient Modal */}
                    {showIngredientModal && (
                      <div className="addmenu-overlay">
                        <div className="addingredient-modal">
                          <div className="ingredient-form">
                            <div className="ingredient-row">
                              <label>Name</label>
                              <select
                                value={ingredientName}
                                onChange={(e) => {
                                  setIngredientName(e.target.value);
                                  setIngredientAmount("");
                                  setIngredientUnit("");
                                  setIngredientError("");
                                }}
                              >
                                <option value="">Select Ingredient</option>
                                {ingredientOptions.map((opt) => (
                                  <option key={opt.name} value={opt.name}>
                                    {opt.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="ingredient-row">
                              <label>Amount</label>
                              <input
                                type="number"
                                value={ingredientAmount}
                                onChange={(e) => {
                                  setIngredientAmount(e.target.value);
                                }}
                                placeholder=""
                              />
                            </div>
                            <div className="ingredient-row">
                              <label>Unit</label>
                              <select
                                value={ingredientUnit}
                                onChange={(e) =>
                                  setIngredientUnit(e.target.value)
                                }
                              >
                                <option value="">Select</option>
                                {(() => {
                                  let code = null;
                                  for (const group of Object.values(
                                    itemCodes
                                  )) {
                                    const found = group.find(
                                      (i) => i.name === ingredientName
                                    );
                                    if (found) {
                                      code = found.code;
                                      break;
                                    }
                                  }
                                  const units =
                                    code && unitOptions[code]
                                      ? unitOptions[code]
                                      : [];
                                  return units.map((unit) => (
                                    <option key={unit} value={unit}>
                                      {unit}
                                    </option>
                                  ));
                                })()}
                              </select>
                            </div>
                            <div className="modal-actions">
                              <button
                                type="button"
                                className="btn-confirm"
                                onClick={handleConfirmIngredient}
                              >
                                Add
                              </button>
                              <button
                                type="button"
                                className="btn-cancel"
                                onClick={handleCancelIngredient}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
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

        {/* Edit Item Modal (matches Add Menu Item UI and logic) */}
        {showEditModal && editItem && (
          <div className="modal-bg">
            <div className="adduser-modal">
              <div className="adduser-header-bar">
                <span className="adduser-title adduser-title-lg">
                  EDIT MENU ITEM
                </span>
              </div>
              <form className="adduser-form" onSubmit={handleEditSubmit}>
                <div
                  className="adduser-modal-row"
                  style={{ display: "flex", gap: 24 }}
                >
                  {/* Left: Image and Description */}
                  <div className="adduser-modal-left" style={{ flex: 1 }}>
                    <div
                      className="upload-box upload-box-modal"
                      style={{ pointerEvents: "none", opacity: 0.7 }}
                    >
                      {editItem.image_url ? (
                        <img src={editItem.image_url} alt="Preview" />
                      ) : (
                        <div className="upload-box-label">No Image</div>
                      )}
                    </div>
                    <label>Description:</label>
                    <textarea
                      value={editItem.description}
                      onChange={(e) =>
                        setEditItem({
                          ...editItem,
                          description: e.target.value,
                        })
                      }
                      required
                      className="adduser-description"
                    />
                  </div>

                  {/* Right: Fields and Ingredients */}
                  <div className="adduser-modal-right" style={{ flex: 1.2 }}>
                    <label>Item Name:</label>
                    <input
                      value={editItem.item_name}
                      readOnly
                      style={{ backgroundColor: "#fdfae7", color: "#333" }}
                    />

                    <div
                      className="adduser-fields-row"
                      style={{ display: "flex", gap: 12, marginTop: 8 }}
                    >
                      <div className="adduser-field-col" style={{ flex: 1 }}>
                        <label>Category</label>
                        <select
                          name="category"
                          value={editItem.category}
                          onChange={(e) =>
                            setEditItem({
                              ...editItem,
                              category: e.target.value,
                            })
                          }
                          required
                        >
                          <option value="">Select Category</option>
                          <option value="Sulit">Sulit</option>
                          <option value="Premium">Premium</option>
                          <option value="Add-Ons">Add-Ons</option>
                          <option value="Bundles">Bundles</option>
                          <option value="Family Bundles">Family Bundles</option>
                          <option value="Beverage">Beverage</option>
                          <option value="Limited Time Offers">
                            Limited Time Offers
                          </option>
                        </select>
                      </div>
                      <div className="adduser-field-col" style={{ flex: 0.6 }}>
                        <label>Status</label>
                        <select
                          value={editItem.status}
                          onChange={(e) =>
                            setEditItem({ ...editItem, status: e.target.value })
                          }
                        >
                          <option>Active</option>
                          <option>Inactive</option>
                        </select>
                      </div>
                      <div className="adduser-field-col" style={{ flex: 0.8 }}>
                        <label>Price</label>
                        <input
                          type="number"
                          step="0.01"
                          value={editItem.price}
                          onChange={(e) =>
                            setEditItem({ ...editItem, price: e.target.value })
                          }
                          required
                        />
                      </div>
                    </div>

                    {/* INGREDIENTS SECTION (with modal add) */}
                    <label
                      className="adduser-ingredients-label"
                      style={{ marginTop: 16 }}
                    >
                      Ingredients:
                    </label>
                    <div
                      className="adduser-ingredients-box"
                      style={{ marginTop: 8 }}
                    >
                      <table
                        className="adduser-ingredients-table"
                        style={{ width: "105%" }}
                      >
                        <thead>
                          <tr>
                            <th className="ingredient-th-name">Name</th>
                            <th className="ingredient-th-amount">Amount</th>
                            <th className="ingredient-th-unit">Unit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getIngredientsForDisplay(editItem, true).length ===
                          0 ? (
                            <tr>
                              <td
                                colSpan="3"
                                className="adduser-ingredients-empty"
                              >
                                No ingredients yet.
                              </td>
                            </tr>
                          ) : (
                            getIngredientsForDisplay(editItem, true).map(
                              (ing, idx) => (
                                <tr
                                  key={idx}
                                  className="adduser-ingredient-row"
                                >
                                  <td>{ing.name}</td>
                                  <td>{ing.amount}</td>
                                  <td>{ing.unit}</td>
                                </tr>
                              )
                            )
                          )}
                        </tbody>
                      </table>
                      {/* Removed add ingredient button in Edit Menu Item modal */}
                    </div>
                    {/* Add/Edit Ingredient Modal for Edit Modal */}
                    {showEditIngredientForm && (
                      <div className="addmenu-overlay">
                        <div className="addingredient-modal">
                          <form
                            className="ingredient-form"
                            onSubmit={handleEditIngredientFormSubmit}
                          >
                            <div className="ingredient-row">
                              <label>Name</label>
                              <select
                                name="name"
                                value={editIngredientForm.name}
                                onChange={handleEditModalIngredientChange}
                              >
                                <option value="">Select Ingredient</option>
                                {ingredientOptions.map((opt) => (
                                  <option key={opt.name} value={opt.name}>
                                    {opt.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="ingredient-row">
                              <label>Amount</label>
                              <input
                                name="amount"
                                type="number"
                                value={editIngredientForm.amount}
                                onChange={handleEditModalIngredientChange}
                                placeholder=""
                              />
                            </div>
                            {editIngredientError && (
                              <p style={{ color: "red", fontSize: "0.8rem" }}>
                                {editIngredientError}
                              </p>
                            )}
                            <div className="ingredient-row">
                              <label>Unit</label>
                              <select
                                name="unit"
                                value={editIngredientForm.unit}
                                onChange={handleEditModalIngredientChange}
                              >
                                <option value="">Select</option>
                                {(() => {
                                  let code = null;
                                  for (const group of Object.values(
                                    itemCodes
                                  )) {
                                    const found = group.find(
                                      (i) => i.name === editIngredientForm.name
                                    );
                                    if (found) {
                                      code = found.code;
                                      break;
                                    }
                                  }
                                  const units =
                                    code && unitOptions[code]
                                      ? unitOptions[code]
                                      : [];
                                  return units.map((unit) => (
                                    <option key={unit} value={unit}>
                                      {unit}
                                    </option>
                                  ));
                                })()}
                              </select>
                            </div>
                            <div className="modal-actions">
                              <button
                                type="button"
                                className="btn-cancel"
                                onClick={handleCancelEditIngredient}
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                className="btn-confirm"
                                disabled={!!editIngredientError}
                              >
                                {editIngredientIndex !== null ? "Save" : "Add"}
                              </button>
                            </div>
                          </form>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="modal-actions adduser-actions">
                  <button
                    type="submit"
                    className="btn-confirm"
                    disabled={editLoading}
                  >
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
                {editError && <p className="error">{editError}</p>}
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
