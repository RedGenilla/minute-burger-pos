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
import homeIcon from "../assets/home.png";
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
				.select("id, item_name, category, price, image_url, status");
			if (!error) setItems(data || []);
		};
		fetchItems();
	}, []);

	// Filtered items
	const displayedItems = items.filter(item => {
		// Only show items with status 'Active'
		if (item.status && item.status !== 'Active') return false;
		const matchesSearch = item.item_name.toLowerCase().includes(search.toLowerCase());
		const matchesCategory = selectedCategory ? item.category === selectedCategory : true;
		return matchesSearch && matchesCategory;
	});

	// Cart logic
	const handleQty = (id, delta) => {
		setCart(prev => {
			const qty = (prev[id] || 0) + delta;
			if (qty < 0) return prev;
			return { ...prev, [id]: qty };
		});
	};

	return (
		<div className="menu-list-page">
			{/* Sidebar toggle now in yellow bar below */}

			{/* Sidebar */}
			<div
				className="sidebar-nav"
				style={{
					left: sidebarOpen ? 0 : "-200px",
					transition: "left 0.3s cubic-bezier(.4,0,.2,1)",
					boxShadow: sidebarOpen ? "2px 0 8px rgba(0,0,0,0.07)" : "none",
				}}
			>
				   {sidebarOpen && (
					   <button
						   className="sidebar-close-btn"
						   onClick={() => setSidebarOpen(false)}
						   aria-label="Close sidebar"
					   >
						   <img src={sidebarIcon} alt="Sidebar Icon" className="sidebar-close-icon" />
					   </button>
				   )}
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
				<div className="menu-header">
					<span>MINUTE</span>
					<img src={menuLogo} alt="Minute Burger Logo" className="menu-header-logo" />
					<span>BURGER</span>
				</div>
				<div className="top-controls">
					<button
						className="menu-icon"
						style={{
							background: "none",
							border: "none",
							cursor: "pointer",
							fontSize: 28,
							marginRight: 12,
							padding: 0,
						}}
						onClick={() => setSidebarOpen((open) => !open)}
						aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
					>
						☰
					</button>
					<input
						type="text"
						className="search-box"
						placeholder="Search"
						value={search}
						onChange={e => setSearch(e.target.value)}
					/>
				</div>
				<div className="category-bar">
					{categories.map(cat => (
						<button
							key={cat}
							className={selectedCategory === cat ? "active" : ""}
							onClick={() => setSelectedCategory(cat === selectedCategory ? "" : cat)}
						>
							{cat}
						</button>
					))}
				</div>
				<div className="item-grid-wrapper">
				  <div className="item-grid">
					  {displayedItems.length > 0 && displayedItems.map(item => (
						  <div className="item-card" key={item.id}>
							  <img src={item.image_url || burgerImg} alt={item.item_name} />
							  <div className="item-name">{item.item_name}</div>
							  <div className="price-qty-row">
								  <div className="item-price">₱{parseFloat(item.price).toFixed(2)}</div>
								  <div className="qty-controls">
									  <button onClick={() => handleQty(item.id, -1)}>-</button>
									  <span>{cart[item.id] || 0}</span>
									  <button onClick={() => handleQty(item.id, 1)}>+</button>
								  </div>
							  </div>
						  </div>
					  ))}
				  </div>
				</div>
{/*
{displayedItems.length > 0 && (
	<div className="check-cart">CHECK CART</div>
)}
*/}
			</div>
		</div>
	);
}
