import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

const StaffSignup = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setSuccess("Staff account registered! Please check your email for confirmation.");
    setLoading(false);
    setEmail("");
    setPassword("");
    // Optionally, navigate to login page
    // navigate('/staff-login');
  };

  return (
    <div style={{ maxWidth: 400, margin: "40px auto", padding: 20, background: "#fff", borderRadius: 8 }}>
      <h2>Register Staff Account</h2>
      <form onSubmit={handleSignup}>
        <div style={{ marginBottom: 16 }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{ width: "100%", padding: 10, borderRadius: 4, border: "1px solid #ccc" }}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{ width: "100%", padding: 10, borderRadius: 4, border: "1px solid #ccc" }}
          />
        </div>
        <button type="submit" disabled={loading} style={{ width: "100%", padding: 10, borderRadius: 4, background: "#f7931e", color: "#000", fontWeight: "bold", border: "none" }}>
          {loading ? "Registering..." : "Register"}
        </button>
      </form>
      {error && <div style={{ color: "red", marginTop: 16 }}>{error}</div>}
      {success && <div style={{ color: "green", marginTop: 16 }}>{success}</div>}
    </div>
  );
};

export default StaffSignup;
