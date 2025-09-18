import React, { useState, useEffect } from "react";
import "./Dashboard.css";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import minuteLogo from "../assets/minute.png";
import { UserAuth } from "../authenticator/AuthContext";


const Dashboard = () => {
  const { session, signOut } = UserAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchUsername = async () => {
      if (!session?.user?.email) return;
      // Query users table for username by email
        const { data, error } = await supabase
          .from("users")
          .select("username")
          .eq("email", session.user.email)
          .single();
      if (error) {
        setError("Could not fetch username.");
        return;
      }
      setUsername(data?.username || "");
    };
    fetchUsername();
  }, [session]);

  const handleSignOut = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Update staff status to Inactive in both users and profiles tables
      if (session?.user?.email) {
        const { data: usersData, error: usersError } = await supabase.from("users").update({ status: 'Inactive' }).eq("email", session.user.email);
        console.log("Users table status update:", { usersData, usersError });
      }
      await signOut();
      navigate("/login");
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="dashboard-header">
        <span>MINUTE</span>
        <img src={minuteLogo} alt="Minute Burger Logo" />
        <span>BURGER</span>
      </div>
      <div className="dashboard-container">
        <div className="dashboard-inner">
          <h2>Welcome, {username || session?.user?.email}!</h2>
          {error && <p style={{ color: "red", marginBottom: "10px" }}>{error}</p>}
          <button className="dashboard-btn" onClick={() => navigate("/menu-list")}>Menu</button>
          <button className="dashboard-btn" onClick={() => navigate("/online-order")}>Online Order</button>
          <button className="dashboard-btn" onClick={() => navigate("/sales-report")}>Sales Report</button>
            <button className="dashboard-btn" onClick={() => navigate("/ingredients-dashboard")}>Item List</button>
          <button className="dashboard-btn" onClick={() => navigate("/inventory")}>Inventory</button>
          <a href="#" className="logout-link" onClick={handleSignOut} style={{ pointerEvents: loading ? "none" : "auto", opacity: loading ? 0.6 : 1 }}>
            {loading ? "Logging out..." : "Log out"}
          </a>
        </div>
      </div>
      <div className="dashboard-footer">
            <hr />
            <img src={minuteLogo} alt="Minute Burger Footer Logo" className="footer-logo" />
      </div>
    </>
  );
};

export default Dashboard;// Moved from routes/Dashboard.jsx
