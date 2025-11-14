import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { UserAuth } from "../authenticator/AuthContext";
import "./MenuManagement.css";
import AdminSidebar from "./AdminSidebar"; // NEW

// Reusable: compute units for an ingredient name
const _getUnitsForIngredientName = (ingredientName, itemCodes, unitOptions) => {
  if (!ingredientName) return [];
  let code = null;
  for (const group of Object.values(itemCodes || {})) {
    const found = (group || []).find((i) => i.name === ingredientName);
    if (found) {
      code = found.code;
      break;
    }
  }
  return code && unitOptions?.[code] ? unitOptions[code] : [];
};

export default function MenuBoard() {
  const { session } = UserAuth();
  const [ingredientOptions, setIngredientOptions] = useState([]);
  useEffect(() => {
    const fetchIngredients = async () => {
      const { data: ingredients } = await supabase
        .from("ingredient-list")
        .select("id, name, code");
      const { data: movements } = await supabase
        .from("stock_movement")
        .select("ingredient_id, type, quantity, cost");
      const summary = {};
      (movements || []).forEach((m) => {
        if (!summary[m.ingredient_id])
          summary[m.ingredient_id] = { quantity: 0, lastCost: 0 };
        if (m.type === "in") {
          summary[m.ingredient_id].quantity += Number(m.quantity);
          summary[m.ingredient_id].lastCost = Number(m.cost);
        } else if (m.type === "out") {
          summary[m.ingredient_id].quantity -= Number(m.quantity);
        }
      });
      const options = (ingredients || [])
        .map((ing) => ({
          id: ing.id,
          name: ing.name,
          code: ing.code,
          quantity: summary[ing.id]?.quantity || 0,
          cost: summary[ing.id]?.lastCost || 0,
        }))
        .filter((o) => o.quantity > 0);
      setIngredientOptions(options);
    };
    fetchIngredients();
  }, []);

  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Status");
  // NEW: category filter UI state
  const [categoryFilter, setCategoryFilter] = useState("Category");
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);

  const [showForm, setShowForm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const [showEditIngredientForm, setShowEditIngredientForm] = useState(false);
  const [editIngredientForm, setEditIngredientForm] = useState({
    name: "",
    amount: "",
    unit: "",
  });
  const [editIngredientError, setEditIngredientError] = useState("");
  const [editIngredientIndex, setEditIngredientIndex] = useState(null);

  const handleEditModalIngredientChange = (e) => {
    const { name, value } = e.target;
    setEditIngredientError("");
    setEditIngredientForm((p) => ({ ...p, [name]: value }));
  };

  const handleEditIngredientFormSubmit = (e) => {
    e.preventDefault();
    if (
      !editIngredientForm.name ||
      !editIngredientForm.amount ||
      !editIngredientForm.unit
    )
      return;
    const applyIngredient = async () => {
      let unitCost = 0;
      try {
        const { data: ingData } = await supabase
          .from("ingredient-list")
          .select("id")
          .eq("name", editIngredientForm.name)
          .single();
        if (ingData) {
          const { data: stockIns } = await supabase
            .from("stock_movement")
            .select("cost,date")
            .eq("ingredient_id", ingData.id)
            .eq("type", "in")
            .order("date", { ascending: false })
            .limit(1);
          if (stockIns?.length) unitCost = parseFloat(stockIns[0].cost);
        }
      } catch (err) {
        console.warn("Failed to compute unitCost for edit ingredient:", err);
      }
      const amount = parseFloat(editIngredientForm.amount);
      const totalCost = unitCost * amount;
      const newIng = {
        name: editIngredientForm.name,
        amount: editIngredientForm.amount,
        unit: editIngredientForm.unit,
        total_cost: totalCost.toFixed(2),
      };
      if (editIngredientIndex !== null) {
        setEditItem((prev) => ({
          ...prev,
          ingredients: prev.ingredients.map((ing, i) =>
            i === editIngredientIndex ? newIng : ing
          ),
        }));
      } else {
        setEditItem((prev) => ({
          ...prev,
          ingredients: [...(prev.ingredients || []), newIng],
        }));
      }
      setShowEditIngredientForm(false);
      setEditIngredientForm({ name: "", amount: "", unit: "" });
      setEditIngredientIndex(null);
    };
    applyIngredient();
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
    ingredients: [],
  });

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
    let unitCost = 0;
    try {
      const { data: ingData } = await supabase
        .from("ingredient-list")
        .select("id")
        .eq("name", ingredientName)
        .single();
      if (ingData) {
        const { data: stockIns } = await supabase
          .from("stock_movement")
          .select("cost,date")
          .eq("ingredient_id", ingData.id)
          .eq("type", "in")
          .order("date", { ascending: false })
          .limit(1);
        if (stockIns?.length) unitCost = parseFloat(stockIns[0].cost);
      }
    } catch (err) {
      console.warn("Failed to compute unitCost for ingredient:", err);
    }
    const amount = parseFloat(ingredientAmount);
    const totalCost = unitCost * amount;
    const newIngredient = {
      name: ingredientName,
      amount: ingredientAmount,
      unit: ingredientUnit,
      total_cost: totalCost.toFixed(2),
    };
    if (ingredientEditIndex !== null) {
      setNewItem((prev) => ({
        ...prev,
        ingredients: prev.ingredients.map((ing, i) =>
          i === ingredientEditIndex ? newIngredient : ing
        ),
      }));
    } else {
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

  const _handleCancelIngredient = () => {
    setShowIngredientModal(false);
    setIngredientError("");
    setIngredientEditIndex(null);
  };

  useEffect(() => {
    const fetchMenu = async () => {
      setLoading(true);
      let q = supabase.from("menu-list").select();
      if (filter !== "Status") q = q.eq("status", filter);
      const { data } = await q;
      setMenuItems(data || []);
      setLoading(false);
    };
    fetchMenu();
    const subMenu = supabase
      .channel("menu-list-status")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "menu-list" },
        fetchMenu
      )
      .subscribe();
    return () => {
      supabase.removeChannel(subMenu);
    };
  }, [filter, showForm, refreshMenu]);

  const checkIngredientsAvailability = async (ingredients) => {
    const { data: ingredientList } = await supabase
      .from("ingredient-list")
      .select("id, name");
    const { data: movements } = await supabase
      .from("stock_movement")
      .select("ingredient_id, type, quantity");
    const inventoryMap = {};
    (movements || []).forEach((m) => {
      if (!inventoryMap[m.ingredient_id]) inventoryMap[m.ingredient_id] = 0;
      inventoryMap[m.ingredient_id] +=
        m.type === "in" ? m.quantity : -m.quantity;
    });
    let all = true;
    for (const ing of ingredients) {
      const ingredientObj = (ingredientList || []).find(
        (i) =>
          i.name.trim().toLowerCase() === String(ing.name).trim().toLowerCase()
      );
      if (!ingredientObj) {
        all = false;
        continue;
      }
      const available = inventoryMap[ingredientObj.id] || 0;
      if (Number(ing.amount) > available) all = false;
    }
    return all;
  };

  const addItem = async (e) => {
    e.preventDefault();
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
    const isAvailable = await checkIngredientsAvailability(newItem.ingredients);
    const itemStatus = isAvailable ? "Active" : "Inactive";
    if (!isAvailable)
      alert("One or more ingredients exceed inventory. Item will be Inactive.");

    let image_url = null;
    if (newItem.image) {
      const ext = newItem.image.name.split(".").pop();
      const fileName = `${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 8)}.${ext}`;
      const { error: uploadError } = await supabase.storage
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

    const { data: menuInsert, error: menuError } = await supabase
      .from("menu-list")
      .insert([
        {
          item_name: newItem.item_name,
          category: newItem.category,
          price: newItem.price,
          status: itemStatus,
          description: newItem.description,
          image_url,
        },
      ])
      .select();
    if (menuError || !menuInsert?.[0]) {
      alert("Failed to add menu item: " + (menuError?.message || "Unknown"));
      return;
    }
    const menuId = menuInsert[0].id;

    for (const ing of newItem.ingredients) {
      const { data: ingData } = await supabase
        .from("ingredient-list")
        .select("id")
        .eq("name", ing.name)
        .single();
      if (!ingData) continue;
      await supabase.from("menu_ingredients").insert({
        menu_id: menuId,
        ingredient_id: ingData.id,
        amount: Number(ing.amount),
        unit: ing.unit,
        total_cost: Number(ing.total_cost),
        created_at: new Date().toISOString(),
      });
    }

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

    // Undefined setters kept (commented) to avoid runtime errors while preserving original intent
    // setShowIngredientForm(false);
    // setIngredientForm({ name: "", amount: "", unit: "" });
    // setEditIndex(null);
    // setIngredientErrors({});

    const updateMenuItemStatus = async () => {
      const { data: allMenuItems } = await supabase.from("menu-list").select();
      for (const menuItem of allMenuItems || []) {
        const { data: menuIngredients } = await supabase
          .from("menu_ingredients")
          .select("ingredient_id, amount")
          .eq("menu_id", menuItem.id);
        let available = true;
        for (const ing of menuIngredients || []) {
          const { data: movements } = await supabase
            .from("stock_movement")
            .select("type, quantity")
            .eq("ingredient_id", ing.ingredient_id);
          let qty = 0;
          (movements || []).forEach((m) => {
            qty += m.type === "in" ? m.quantity : -m.quantity;
          });
          if (qty < Number(ing.amount)) {
            available = false;
            break;
          }
        }
        const newStatus = available ? "Active" : "Inactive";
        if (menuItem.status !== newStatus) {
          await supabase
            .from("menu-list")
            .update({ status: newStatus })
            .eq("id", menuItem.id);
        }
      }
    };
    await updateMenuItemStatus();
    setRefreshMenu((p) => !p);
  };

  const openEditModal = (m) => {
    const fetchIngredients = async () => {
      const { data: ingList } = await supabase
        .from("menu_ingredients")
        .select(
          "ingredient_id, amount, unit, total_cost, ingredient-list(name)"
        )
        .eq("menu_id", m.id);
      const ingredients = (ingList || []).map((ing) => ({
        name: ing["ingredient-list"]?.name || "",
        amount: ing.amount,
        unit: ing.unit,
        total_cost: ing.total_cost,
      }));
      setEditItem({ ...m, ingredients });
      setShowEditModal(true);
    };
    fetchIngredients();
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    const isAvailable = await checkIngredientsAvailability(
      editItem.ingredients
    );
    const itemStatus = isAvailable ? "Active" : "Inactive";
    if (!isAvailable)
      alert("One or more ingredients exceed inventory. Item will be Inactive.");
    const { error } = await supabase
      .from("menu-list")
      .update({
        item_name: editItem.item_name,
        category: editItem.category,
        price: editItem.price,
        status: itemStatus,
        description: editItem.description,
      })
      .eq("id", editItem.id);
    if (error) {
      setEditError("Failed to update item");
      setEditLoading(false);
      return;
    }
    await supabase.from("menu_ingredients").delete().eq("menu_id", editItem.id);
    for (const ing of editItem.ingredients) {
      const { data: ingData } = await supabase
        .from("ingredient-list")
        .select("id")
        .eq("name", ing.name)
        .single();
      if (!ingData) continue;
      await supabase.from("menu_ingredients").insert({
        menu_id: editItem.id,
        ingredient_id: ingData.id,
        amount: Number(ing.amount),
        unit: ing.unit,
        total_cost: Number(ing.total_cost),
        created_at: new Date().toISOString(),
      });
    }
    setShowEditModal(false);
    setEditLoading(false);
    setRefreshMenu((p) => !p);
  };

  const displayedItems = menuItems
    .filter(
      (m) =>
        m.item_name.toLowerCase().includes(search.toLowerCase()) ||
        m.category.toLowerCase().includes(search.toLowerCase())
    )
    // keep existing status logic; add client-side filter too to match UI
    .filter((m) => (filter === "Status" ? true : m.status === filter))
    // NEW: apply category filter when set
    .filter((m) =>
      categoryFilter === "Category" ? true : m.category === categoryFilter
    );

  // Reset to first page when filters/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filter, categoryFilter]);

  // Pagination calculations
  const pageSize = 10;
  const totalPages = Math.ceil(displayedItems.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedItems = displayedItems.slice(
    startIndex,
    startIndex + pageSize
  );

  const getIngredientsForDisplay = (item) => item?.ingredients || [];

  useEffect(() => {
    if (session === null) window.location.href = "/login";
  }, [session]);

  return (
    <div className="opswat-admin">
      <AdminSidebar active="menu-management" />
      <main className="ops-main">
        <header className="ops-header">
          <h1>Menu Management</h1>
          {/* moved Add button into controls row */}
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

            {/* Status: Active/Inactive only */}
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option>Status</option>
              <option>Active</option>
              <option>Inactive</option>
            </select>

            {/* NEW Category dropdown */}
            <select
              className="category-filter"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option>Category</option>
              <option value="Sulit">Sulit</option>
              <option value="Premium">Premium</option>
              <option value="Add-Ons">Add-Ons</option>
              <option value="Bundles">Bundles</option>
              <option value="Family Bundles">Family Bundles</option>
              <option value="Beverage">Beverage</option>
              <option value="Limited Time Offers">Limited Time Offers</option>
            </select>
          </div>

          <div className="controls-right">
            <button className="add-btn" onClick={() => setShowForm(true)}>
              + Add Item
            </button>
          </div>
        </div>

        <div className="table-wrap">
          <table className="ops-table menu-table">
            <colgroup>
              {/* Wider Item Name column; scoped to this table only */}
              <col style={{ width: "25%" }} />
              <col style={{ width: "25%" }} />
              <col style={{ width: "22%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "28%" }} />
              <col style={{ width: "10%" }} />
            </colgroup>
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
                paginatedItems.map((m) => (
                  <tr key={m.id}>
                    <td>{m.item_name}</td>
                    <td>{m.category}</td>
                    <td>{parseFloat(m.price).toFixed(2)}</td>
                    <td>
                      <span className={`status ${m.status.toLowerCase()}`}>
                        {m.status === "Inactive" ? "Unavailable" : m.status}
                      </span>
                    </td>
                    <td>{m.description}</td>
                    <td>
                      <button
                        className="edit-icon-btn"
                        onClick={() => openEditModal(m)}
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
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination - bottom-right like AdminBoard */}
        <div className="pagination-fixed">
          <button
            className="pagination-link"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          >
            ◀ Prev
          </button>
          <span className="pagination-page">
            {currentPage}/{totalPages}
          </span>
          <button
            className="pagination-link"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => (p < totalPages ? p + 1 : p))}
          >
            Next ▶
          </button>
        </div>

        {showForm && (
          <div className="modal-bg">
            <div className="adduser-modal">
              <div className="adduser-header-bar">
                <span className="adduser-title adduser-title-lg">
                  ADD MENU ITEM
                </span>
                <button
                  className="modal-close-x"
                  onClick={() => setShowForm(false)} // FIX: was setShowForm(false)
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
              </div>
              <form className="adduser-form" onSubmit={addItem}>
                <div
                  className="adduser-modal-row"
                  style={{ display: "flex", gap: 24 }}
                >
                  <div className="adduser-modal-left">
                    <div
                      className="upload-box upload-box-modal"
                      onClick={() =>
                        document.getElementById("menu-image-input").click()
                      }
                      role="button"
                      tabIndex={0}
                    >
                      {newItem.image && (
                        <button
                          type="button"
                          className="upload-remove-btn"
                          aria-label="Remove image"
                          title="Remove image"
                          onClick={(e) => {
                            e.stopPropagation();
                            const input =
                              document.getElementById("menu-image-input");
                            if (input) input.value = "";
                            setNewItem((p) => ({ ...p, image: null }));
                          }}
                        >
                          ×
                        </button>
                      )}
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
                            setNewItem((p) => ({
                              ...p,
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
                        setNewItem((p) => ({
                          ...p,
                          description: e.target.value,
                        }))
                      }
                      required
                      className="adduser-description"
                    />

                    <div className="adduser-status-box">
                      <span className="adduser-status-label">Status</span>
                      <div
                        className={`modal-status-toggle ${
                          newItem.status === "Active" ? "active" : ""
                        }`}
                        onClick={() =>
                          setNewItem((p) => ({
                            ...p,
                            status:
                              p.status === "Active" ? "Inactive" : "Active",
                          }))
                        }
                      >
                        <div className="modal-toggle-circle"></div>
                      </div>
                    </div>
                  </div>

                  <div className="adduser-modal-right">
                    <label>Item Name:</label>
                    <input
                      value={newItem.item_name}
                      onChange={(e) =>
                        setNewItem((p) => ({ ...p, item_name: e.target.value }))
                      }
                      required
                    />

                    <div className="adduser-field-row">
                      <div className="adduser-field-col">
                        <label>Category</label>
                        <select
                          value={newItem.category}
                          onChange={(e) =>
                            setNewItem((p) => ({
                              ...p,
                              category: e.target.value,
                            }))
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
                      <div className="adduser-field-col">
                        <label>Price</label>
                        <input
                          type="number"
                          step="0.01"
                          value={newItem.price}
                          onChange={(e) =>
                            setNewItem((p) => ({ ...p, price: e.target.value }))
                          }
                          required
                        />
                      </div>
                    </div>

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
                        style={{ width: "100%" }}
                      >
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Amount</th>
                            <th>Unit</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getIngredientsForDisplay(newItem).length === 0 ? (
                            <tr>
                              <td
                                colSpan="4"
                                className="adduser-ingredients-empty"
                              >
                                No ingredients yet.
                              </td>
                            </tr>
                          ) : (
                            getIngredientsForDisplay(newItem).map(
                              (ing, idx) => (
                                <tr key={idx}>
                                  <td>{ing.name}</td>
                                  <td>{ing.amount}</td>
                                  <td>{ing.unit}</td>
                                  <td>
                                    <div className="ingredient-action-btn-group">
                                      <button
                                        type="button"
                                        className="ingredient-action-btn icon-only adduser-ingredient-edit"
                                        onClick={() =>
                                          handleEditIngredient(idx)
                                        }
                                        aria-label="Edit ingredient"
                                        title="Edit ingredient"
                                      >
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          width="27"
                                          height="27"
                                          viewBox="0 0 24 24"
                                          aria-hidden="true"
                                        >
                                          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" />
                                          <path d="M20.71 7.04a1.003 1.003 0 0 0 0-1.41l-2.34-2.34a1.003 1.003 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                                        </svg>
                                      </button>
                                      <button
                                        type="button"
                                        className="ingredient-action-btn icon-only adduser-ingredient-delete"
                                        onClick={() =>
                                          setNewItem((p) => ({
                                            ...p,
                                            ingredients: p.ingredients.filter(
                                              (_, i) => i !== idx
                                            ),
                                          }))
                                        }
                                        aria-label="Delete ingredient"
                                        title="Delete ingredient"
                                      >
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          width="27"
                                          height="27"
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="#e53935"
                                          strokeWidth="3.2"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          aria-hidden="true"
                                        >
                                          <polyline points="3 6 5 6 21 6"></polyline>
                                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                                          <line
                                            x1="10"
                                            y1="11"
                                            x2="10"
                                            y2="17"
                                          ></line>
                                          <line
                                            x1="14"
                                            y1="11"
                                            x2="14"
                                            y2="17"
                                          ></line>
                                          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
                                        </svg>
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
                      ></div>
                    </div>

                    {showIngredientModal && (
                      <div className="modal-bg">
                        <div className="adminboard-modal">
                          <button
                            type="button"
                            className="modal-close-x"
                            aria-label="Close modal"
                            onClick={() => {
                              setShowIngredientModal(false);
                              setIngredientError("");
                            }}
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
                          <span className="adduser-title">ADD INGREDIENT</span>
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
                                onChange={(e) =>
                                  setIngredientAmount(e.target.value)
                                }
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
                                <option value="pcs">pcs</option>
                                <option value="kg">kg</option>
                                <option value="g">g</option>
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
                                  return units.map((u) => (
                                    <option key={u} value={u}>
                                      {u}
                                    </option>
                                  ));
                                })()}
                              </select>
                            </div>
                            {ingredientError && (
                              <p style={{ color: "red", fontSize: "0.8rem" }}>
                                {ingredientError}
                              </p>
                            )}
                            <div className="single-confirm-wrap">
                              <button
                                type="button"
                                className="btn-confirm full-width-confirm"
                                onClick={handleConfirmIngredient}
                              >
                                Add Ingredient
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="adduser-actions">
                  <button
                    type="button"
                    className="add-ingredient-btn"
                    onClick={handleAddIngredient}
                    aria-label="Add ingredient"
                    title="Add ingredient"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#000"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    <span>Add</span>
                  </button>
                  <button type="submit" className="btn-add-menu-item">
                    Add Menu Item
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showEditModal && editItem && (
          <div className="modal-bg">
            <div className="adduser-modal">
              <div className="adduser-header-bar">
                <span className="adduser-title adduser-title-lg">
                  EDIT MENU ITEM
                </span>
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
              </div>
              <form className="adduser-form" onSubmit={handleEditSubmit}>
                <div className="adduser-modal-row">
                  <div className="adduser-modal-left">
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

                    <label>Description</label>
                    <textarea
                      value={editItem.description}
                      onChange={(e) =>
                        setEditItem((p) => ({
                          ...p,
                          description: e.target.value,
                        }))
                      }
                      required
                      className="adduser-description"
                    />

                    <div className="adduser-status-box">
                      <span className="adduser-status-label">Status</span>
                      <div
                        className={`modal-status-toggle ${
                          editItem.status === "Active" ? "active" : ""
                        }`} // FIX: use Active/Inactive
                        onClick={() =>
                          setEditItem((p) => ({
                            ...p,
                            status:
                              p.status === "Active" ? "Inactive" : "Active",
                          }))
                        }
                      >
                        <div className="modal-toggle-circle"></div>
                      </div>
                    </div>
                  </div>

                  <div className="adduser-modal-right">
                    <label>Item Name</label>
                    <input
                      value={editItem.item_name}
                      readOnly
                      style={{ backgroundColor: "#fdfae7", color: "#333" }}
                    />

                    <div className="adduser-field-row">
                      <div className="adduser-field-col">
                        <label>Category</label>
                        <select
                          value={editItem.category}
                          onChange={(e) =>
                            setEditItem((p) => ({
                              ...p,
                              category: e.target.value,
                            }))
                          }
                          required
                        >
                          <option value="">Select Category</option>
                          <option value="Sulit">Sulit</option>
                          <option value="Premium">Premium</option>{" "}
                          {/* FIX: removed stray 's' */}
                          <option value="Add-Ons">Add-Ons</option>
                          <option value="Bundles">Bundles</option>
                          <option value="Family Bundles">Family Bundles</option>
                          <option value="Beverage">Beverage</option>
                          <option value="Limited Time Offers">
                            Limited Time Offers
                          </option>
                        </select>
                      </div>
                      <div className="adduser-field-col">
                        <label>Price</label>
                        <input
                          type="number"
                          step="0.01"
                          value={editItem.price}
                          onChange={(e) =>
                            setEditItem((p) => ({
                              ...p,
                              price: e.target.value,
                            }))
                          }
                          required
                        />
                      </div>
                    </div>

                    <label
                      className="adduser-ingredients-label"
                      style={{ marginTop: 16 }}
                    >
                      Ingredients
                    </label>
                    <div
                      className="adduser-ingredients-box"
                      style={{ marginTop: 8 }}
                    >
                      <table
                        className="adduser-ingredients-table"
                        style={{ width: "100%" }}
                      >
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Amount</th>
                            <th>Unit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getIngredientsForDisplay(editItem).length === 0 ? (
                            <tr>
                              <td
                                colSpan="3"
                                className="adduser-ingredients-empty"
                              >
                                No ingredients yet.
                              </td>
                            </tr>
                          ) : (
                            getIngredientsForDisplay(editItem).map(
                              (ing, idx) => (
                                <tr key={idx}>
                                  <td>{ing.name}</td>
                                  <td>{ing.amount}</td>
                                  <td>{ing.unit}</td>
                                </tr>
                              )
                            )
                          )}
                        </tbody>
                      </table>
                    </div>

                    {showEditIngredientForm && (
                      <div className="modal-bg">
                        <div className="adminboard-modal">
                          <button
                            type="button"
                            className="modal-close-x"
                            aria-label="Close modal"
                            onClick={handleCancelEditIngredient}
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
                            {editIngredientIndex !== null
                              ? "EDIT INGREDIENT"
                              : "ADD INGREDIENT"}
                          </span>
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
                                  return units.map((u) => (
                                    <option key={u} value={u}>
                                      {u}
                                    </option>
                                  ));
                                })()}
                              </select>
                            </div>
                            <div className="single-confirm-wrap">
                              <button
                                type="submit"
                                className="btn-confirm full-width-confirm"
                                disabled={!!editIngredientError}
                              >
                                {editIngredientIndex !== null
                                  ? "Save Changes"
                                  : "Add Ingredient"}
                              </button>
                            </div>
                          </form>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="adduser-actions">
                  <button
                    type="submit"
                    className="btn-add-menu-item"
                    disabled={editLoading}
                  >
                    Save Changes
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
