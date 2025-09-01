import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./staff-login.css";
import minuteLogo from "../assets/minute.png";

const StaffLogin = () => {
	const navigate = useNavigate();
	const [loading, setLoading] = useState(false);
	const handleAdminClick = () => {
		setLoading(true);
		setTimeout(() => {
			navigate('/admin');
		}, 1000);
	};
	return (
		<div className="staff-bg">
			<div className="staff-poster">
				{/* Header Logo and Title */}
				<div className="staff-header">
					<span>MINUTE</span>
                    <img src={minuteLogo} alt="Minute Burger Logo" />
                    <span>BURGER</span>
				</div>

				{/* Login Container */}
				<div className="login-container">
					<h2 className="login-title">Staff Log in</h2>
					<form className="login-form" onSubmit={e => e.preventDefault()}>
						<div className="input-group">
							<input type="text" placeholder="User" className="input-field" />
						</div>
						<div className="input-group">
							<input type="password" placeholder="Password" className="input-field" />
						</div>
						<a href="#" className="forgot-password">Forgot Password</a>
						<button type="submit" className="btn-login">Log in</button>
					</form>
					<hr className="divider" />
					<button className="btn-role admin" onClick={handleAdminClick} disabled={loading}>Log in as Admin</button>
					{loading && <div style={{textAlign: 'center', margin: '10px 0', fontWeight: 'bold'}}>Loading...</div>}
					<button className="btn-role staff">Log in as Staff</button>
					<p className="terms">Terms and Conditions</p>
				</div>

				{/* Footer */}
				<div className="staff-footer">
					<hr />
					<img src={minuteLogo} alt="Minute Burger Footer Logo" className="footer-logo" />
				</div>
			</div>
		</div>
	);
};

export default StaffLogin;
