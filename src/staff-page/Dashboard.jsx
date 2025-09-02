import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UserAuth } from "../authenticator/AuthContext";

const Dashboard = () => {
  const { session, signOut } = UserAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchUsername = async () => {
      if (!session?.user?.email) return;
      // Query users table for username by email
      const { data, error } = await import("../supabaseClient").then(({ supabase }) =>
        supabase.from("users").select("username").eq("email", session.user.email).single()
      );
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
    try {
      // Update staff status to Inactive in both users and profiles tables
      if (session?.user?.email) {
        const { supabase } = await import("../supabaseClient");
        const { data: usersData, error: usersError } = await supabase.from("users").update({ status: 'Inactive' }).eq("email", session.user.email);
        console.log("Users table status update:", { usersData, usersError });
      }
      await signOut();
      navigate("/staff");
    } catch (err) {
      setError("An unexpected error occurred.");
    }
  };

  return (
    <div>
      <h1>Dashboard</h1>
      <h2>Welcome, {username ? username : session?.user?.email}</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <div>
        <p
          onClick={handleSignOut}
          className="hover:cursor-pointer  border inline-block px-4 py-3 mt-4 "
        >
          Sign out
        </p>
      </div>
    </div>
  );
};

export default Dashboard;// Moved from routes/Dashboard.jsx
