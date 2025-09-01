// Moved from components/Signup.jsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserAuth } from "../authenticator/AuthContext";
import './Signup.css';
import minuteLogo from '../assets/minute.png';

const Signup = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const { signUpNewUser } = UserAuth();
  const navigate = useNavigate();

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await signUpNewUser(email, password);
      if (result.success) {
        navigate("/dashboard");
      } else {
        setError(result.error.message);
      }
    } catch (err) {
      setError("An Unexpected Error Occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-bg">
      <div className="signup-poster">
        <div className="signup-header">
          <span>MINUTE</span>
          <img src={minuteLogo} alt="Minute Burger Logo" />
          <span>BURGER</span>
        </div>
        <div className="signup-container">
          <h2 className="signup-title">Create an Account</h2>
          <form onSubmit={handleSignUp} className="signup-form">
            <p>
              Already have an Account? <Link to="/" className="text-blue-500 underline">Login</Link>
            </p>
            <div className="signup-input-group">
              <input
                onChange={(e) => setEmail(e.target.value)}
                className="signup-input"
                type="email"
                name="email"
                id="email"
                placeholder="Email"
              />
            </div>
            <div className="signup-input-group">
              <input
                onChange={(e) => setPassword(e.target.value)}
                className="signup-input"
                type="password"
                name="password"
                id="password"
                placeholder="Password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="signup-button"
            >
              Sign Up
            </button>
            {error && <p className="text-red-600 text-center pt-4">{error}</p>}
          </form>
        </div>
        <div className="signup-footer">
          <hr />
          <img src={minuteLogo} alt="Minute Burger Logo" />
        </div>
      </div>
    </div>
  );
};

export default Signup;