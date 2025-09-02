
import React, { useState } from "react";
import { supabase } from '../supabaseClient';
import { useNavigate } from "react-router-dom";
import "./admin-login.css";
import minuteLogo from "../assets/minute.png";
import bcrypt from "bcryptjs";

const AdminLogin = () => {
	const navigate = useNavigate();
	const [loadingLogin, setLoadingLogin] = useState(false);
	const [loadingStaff, setLoadingStaff] = useState(false);
	const [error, setError] = useState("");
	const handleStaffClick = () => {
		setLoadingStaff(true);
		setTimeout(() => {
			navigate('/staff');
		}, 1000);
	};
	const handleLogin = async (e) => {
		e.preventDefault();
		setLoadingLogin(true);
		setError("");
		const email = e.target[0].value;
		const password = e.target[1].value;

		// 1. Fetch user from custom profiles table
		const { data: userData, error: userError } = await supabase
			.from('profiles')
			.select('*')
			.eq('email', email)
			.single();

		console.log('Fetched userData:', userData);

		if (userError || !userData) {
			setError("User not found");
			setLoadingLogin(false);
			return;
		}
		// Update user status to Active in users table
		await supabase.from('users').update({ status: 'Active' }).eq('email', email);

		// Password validation removed

		// 3. Check if user is admin
		if (userData.role !== 'Admin' && userData.role !== 'admin') {
			setError("Not an Admin");
			setLoadingLogin(false);
			return;
		}

		// 4. Success: navigate to admin board
		setTimeout(() => {
			navigate('/admin-user-management');
		}, 1000);
	};
	return (
		<div className="admin-bg">
			<div className="admin-poster">
				{/* Header Logo and Title */}
				<div className="admin-header">
					<span>MINUTE</span>
                    <img src={minuteLogo} alt="Minute Burger Logo" />
                    <span>BURGER</span>
				</div>

				{/* Login Container */}
				<div className="login-container">
					<h2 className="login-title">Admin Log in</h2>
					<form className="login-form" onSubmit={handleLogin}>
						<div className="input-group">
							<input type="text" placeholder="User" className="input-field" />
						</div>
						<div className="input-group">
							<input type="password" placeholder="Password" className="input-field" />
						</div>
						<a href="#" className="forgot-password">Forgot Password</a>
						<button type="submit" className="btn-login" disabled={loadingLogin || loadingStaff}>Log in</button>
						{loadingLogin && <div style={{textAlign: 'center', margin: '10px 0', fontWeight: 'bold'}}>Loading...</div>}
						{error && <div style={{color: 'red', textAlign: 'center', margin: '10px 0', fontWeight: 'bold'}}>{error}</div>}
					</form>
					<hr className="divider" />
					<button className="btn-role admin" disabled={loadingLogin || loadingStaff}>Log in as Admin</button>
					<button className="btn-role staff" onClick={handleStaffClick} disabled={loadingLogin || loadingStaff}>Log in as Staff</button>
					{loadingStaff && <div style={{textAlign: 'center', margin: '10px 0', fontWeight: 'bold'}}>Loading...</div>}
					<p className="terms">Terms and Conditions</p>
				</div>

				{/* Footer */}
				<div className="admin-footer">
					<hr />
					<img src={minuteLogo} alt="Minute Burger Footer Logo" className="footer-logo" />
				</div>
			</div>
		</div>
	);
};

export default AdminLogin;
