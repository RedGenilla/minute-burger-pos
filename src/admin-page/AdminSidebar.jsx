import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UserAuth } from "../authenticator/AuthContext";
import logoImg from "../assets/burger2-icon.png";
import userIcon from "../assets/user.png";
import menuIcon from "../assets/menu.png";
import inventoryIcon from "../assets/inventory.png";
import salesIcon from "../assets/sales.png";
import logoutIcon from "../assets/logout.png";
import { supabase } from "../supabaseClient";
import "./AdminSidebar.css";

/**
 * Reusable Admin Sidebar
 * Props:
 *   active (string) -> one of: 'user-management', 'menu-management', 'inventory', 'sales-report'
 */
export default function AdminSidebar({ active }) {
  const { signOut } = UserAuth();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [lowStockCount, setLowStockCount] = useState(0);

  const handleLogoutClick = () => setShowLogoutConfirm(true);
  const handleCancelLogout = () => setShowLogoutConfirm(false);
  const handleConfirmLogout = async () => {
    await signOut();
    // Redirect to login (keep left-aligned behavior consistent with pages)
    navigate("/login");
  };

  // Global low stock badge (visible on all pages)
  useEffect(() => {
    const fetchLowStock = async () => {
      const { data: ingredients, error: ingError } = await supabase
        .from("ingredient-list")
        .select("id");
      if (ingError || !ingredients) return;
      const { data: movements, error: movError } = await supabase
        .from("stock_movement")
        .select("ingredient_id, type, quantity");
      if (movError || !movements) return;
      const summary = {};
      for (const ing of ingredients) summary[ing.id] = 0;
      for (const m of movements) {
        if (summary[m.ingredient_id] !== undefined) {
          summary[m.ingredient_id] +=
            m.type === "in" ? m.quantity : -m.quantity;
        }
      }
      const count = Object.values(summary).filter(
        (q) => q > 0 && q <= 5
      ).length;
      setLowStockCount(count);
    };
    fetchLowStock();
    const sub = supabase
      .channel("stock-movement-lowstock-sidebar")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "stock_movement" },
        fetchLowStock
      )
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, []);

  return (
    <>
      <aside className="ops-sidebar">
        <div className="sidebar-header">
          <img src={logoImg} alt="Burger Icon" className="sidebar-logo" />
          <div className="sidebar-title">Admin Management</div>
        </div>
        <nav className="sidebar-nav-links">
          <a
            href="/admin-user-management"
            className={`nav-item ${
              active === "user-management" ? "active" : ""
            }`}
          >
            <img src={userIcon} alt="User" className="nav-icon" />
            <span>User Management</span>
          </a>
          <a
            href="/admin/menu-management"
            className={`nav-item ${
              active === "menu-management" ? "active" : ""
            }`}
          >
            <img src={menuIcon} alt="Menu" className="nav-icon" />
            <span>Menu Management</span>
          </a>
          <a
            href="/admin/ingredients-dashboard"
            className={`nav-item ${active === "inventory" ? "active" : ""}`}
            style={lowStockCount > 0 ? { position: "relative" } : undefined}
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
            <img src={inventoryIcon} alt="Inventory" className="nav-icon" />
            <span>Inventory</span>
          </a>
          <a
            href="/admin/sales-report"
            className={`nav-item ${active === "sales-report" ? "active" : ""}`}
          >
            <img src={salesIcon} alt="Sales" className="nav-icon" />
            <span>Sales Report</span>
          </a>
          <hr className="logout-separator"></hr>
          <a className="nav-item logout-link" onClick={handleLogoutClick}>
            <img src={logoutIcon} alt="Logout" className="nav-icon" />
            <span>Log out</span>
          </a>
        </nav>
      </aside>

      {showLogoutConfirm && (
        <div className="logout-modal-overlay" role="dialog" aria-modal="true">
          <div className="logout-modal">
            <h3 className="logout-modal-title">Confirm Logout</h3>
            <p className="logout-modal-text">
              Are you sure you want to log out?
            </p>
            <div className="logout-modal-actions">
              <button className="btn-cancel" onClick={handleCancelLogout}>
                Cancel
              </button>
              <button className="btn-confirm" onClick={handleConfirmLogout}>
                Log out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
