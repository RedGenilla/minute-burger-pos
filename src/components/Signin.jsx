import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserAuth } from "../context/AuthContext";
import './Signin.css';
import './Signup.css';
import minuteLogo from '../assets/minute.png'; // adjust path as needed
import burgerLogo from '../assets/burger.png';

const Signin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const { signInUser } = UserAuth();
  const navigate = useNavigate();

  const handleSignIn = async (e) => {
    e.preventDefault();
    const { session, error } = await signInUser(email, password); // Use your signIn function

    if (error) {
      setError(error); // Set the error message if sign-in fails

      // Set a timeout to clear the error message after a specific duration (e.g., 3 seconds)
      setTimeout(() => {
        setError("");
      }, 3000); // 3000 milliseconds = 3 seconds
    } else {
      // Redirect or perform any necessary actions after successful sign-in
      navigate("/dashboard");
    }

    if (session) {
      closeModal();
      setError(""); // Reset the error when there's a session
    }
  };

  return (
    <div className="signin-bg">
      <div className="signin-poster">
        <div className="signin-header">
          <span>MINUTE</span>
          <img src={minuteLogo} alt="Minute Burger Logo" />
          <span>BURGER</span>
        </div>
        <div className="signin-container">
          <h2 className="signin-title">Sign in</h2>
          <form onSubmit={handleSignIn} className="signin-form">
            <p>
              Don't have an account yet? <Link to="/signup">Sign up</Link>
            </p>
            <div className="signin-input-group">
              <input
                onChange={(e) => setEmail(e.target.value)}
                className="signin-input"
                type="email"
                name="email"
                id="email"
                placeholder="User"
              />
            </div>
            <div className="signin-input-group">
              <input
                onChange={(e) => setPassword(e.target.value)}
                className="signin-input"
                type="password"
                name="password"
                id="password"
                placeholder="Password"
              />
            </div>
            <button className="signin-button" type="submit">Sign In</button>
            {error && <p className="text-red-600 text-center pt-4">{error}</p>}
          </form>
          <div className="terms">Terms and Conditions</div>
        </div>
        <div className="signin-footer">
          <hr />
          <img src={minuteLogo} alt="Minute Burger Logo" />
        </div>
      </div>
    </div>
  );
};

export default Signin;