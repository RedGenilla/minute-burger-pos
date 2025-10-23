import React, { useEffect, useState } from "react";
import "./MenuList.css";
import menuLogo from "../assets/minute.png";
import menuIcon from "../assets/menu.png";
import onlineIcon from "../assets/online.png";
import salesIcon from "../assets/sales.png";
import managementIcon from "../assets/management.png";
import inventoryIcon from "../assets/inventory.png";
import burgerImg from "../assets/burger.png";
import sidebarIcon from "../assets/sidebar.png";
import { supabase } from "../supabaseClient";

const categories = [
  "Sulit",
  "Premium",
  "Add-Ons",
  "Bundles",
  "Family Bundles",
  "Beverage",
  "Limited Time Offers"
];

export default function MenuList() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [cart, setCart] = useState({});

  useEffect(() => {
    const fetchItems = async () => {
      const { data, error } = await supabase
        .from("menu-list")
        .select("id,item_name,category,price,image_url,status");
      if (!error) setItems(data || []);
    };
    fetchItems();
  }, []);

  const displayedItems = items.filter((item) => {
    if (item.status && item.status !== "Active") return false;
    const matchSearch = item.item_name
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchCat = selectedCategory
      ? item.category === selectedCategory
      : true;
    return matchSearch && matchCat;
  });

  const handleQty = (id, delta) => {
    setCart((prev) => {
      const qty = (prev[id] || 0) + delta;
      if (qty < 0) return prev;
      return { ...prev, [id]: qty };
    });
  };

  return (
    <div className="menu-board-wrapper">
      {/* Sidebar */}
      <aside className={`board-sidebar ${sidebarOpen ? "open" : ""}`}>
        <button
          className="sidebar-close"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar"
        >
          <img src={sidebarIcon} alt="close" />
        </button>

        <a className="side-link" href="/menu-list">
          <img src={menuIcon} alt="Menu" />
          <span>Menu</span>
        </a>
        <a className="side-link" href="/online-order">
          <img src={onlineIcon} alt="Online Order" />
          <span>Online Order</span>
        </a>
        <a className="side-link" href="/sales-report">
          <img src={salesIcon} alt="Sales Report" />
          <span>Sales Report</span>
        </a>
        <a className="side-link" href="/ingredients-dashboard">
          <img src={managementIcon} alt="Item List" />
          <span>Item List</span>
        </a>
        <a className="side-link" href="/inventory">
          <img src={inventoryIcon} alt="Inventory" />
          <span>Inventory</span>
        </a>
      </aside>

      {/* Main */}
      <main className="board-main">
        <header className="board-header">
          <button
            className="hamburger"
            onClick={() => setSidebarOpen((o) => !o)}
          >
            ☰
          </button>
          <h1 className="board-title">
            <span>MINUTE</span>
            <img src={menuLogo} alt="logo" />
            <span>BURGER</span>
          </h1>
        </header>

        <div className="board-topbar">
          <input
            className="search-input"
            type="text"
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="board-category">
          {categories.map((cat) => (
            <button
              key={cat}
              className={selectedCategory === cat ? "active" : ""}
              onClick={() =>
                setSelectedCategory(cat === selectedCategory ? "" : cat)
              }
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Table-like grid identical to MenuBoard */}
        <div className="board-table">
          <div className="table-head">
            <span>Image</span>
            <span>Name</span>
            <span>Price</span>
            <span>Qty</span>
          </div>
          {displayedItems.map((item) => (
            <div className="table-row" key={item.id}>
              <img
                src={item.image_url || burgerImg}
                alt={item.item_name}
                className="table-img"
              />
              <span className="table-name">{item.item_name}</span>
              <span className="table-price">₱{parseFloat(item.price).toFixed(2)}</span>
              <div className="table-qty">
                <button onClick={() => handleQty(item.id, -1)}>-</button>
                <span>{cart[item.id] || 0}</span>
                <button onClick={() => handleQty(item.id, 1)}>+</button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
