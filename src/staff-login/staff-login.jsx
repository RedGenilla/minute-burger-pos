import React, { useState } from "react";
import { supabase } from '../supabaseClient';
import { useNavigate } from "react-router-dom";
import "./staff-login.css";
import minuteLogo from "../assets/minute.png";

const StaffLogin = () => {
	const navigate = useNavigate();
	const [loading, setLoading] = useState(false);
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");

	const handleAdminClick = () => {
		setLoading(true);
		setTimeout(() => {
			navigate('/admin');
		}, 1000);
	};

	const handleStaffLogin = async (e) => {
		e.preventDefault();
		setLoading(true);
		setError("");
		const { data, error: signInError } = await supabase.auth.signInWithPassword({
			email: username,
			password: password
		});
		if (signInError) {
			setError("Invalid credentials. Please try again.");
			setLoading(false);
			return;
		}
		// Check user status in users table
		const { data: userData, error: userFetchError } = await supabase
			.from('users')
			.select('status')
			.eq('email', username)
			.single();
		if (userFetchError || !userData) {
			setError('Unable to verify account status.');
			setLoading(false);
			return;
		}
		if (userData.status === 'Banned') {
			setError('Account Banned');
			setLoading(false);
			return;
		}
		// Update user status to Active in users table
		await supabase.from('users').update({ status: 'Active' }).eq('email', username);
		navigate('/staff/dashboard');
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
					<form className="login-form" onSubmit={handleStaffLogin}>
						<div className="input-group">
							<input
								type="text"
								placeholder="User (email)"
								className="input-field"
								value={username}
								onChange={e => setUsername(e.target.value)}
								required
							/>
						</div>
						<div className="input-group">
							<input
								type="password"
								placeholder="Password"
								className="input-field"
								value={password}
								onChange={e => setPassword(e.target.value)}
								required
							/>
						</div>
						<a href="#" className="forgot-password">Forgot Password</a>
						<button type="submit" className="btn-login" disabled={loading}>Log in</button>
					</form>
					{error && <div style={{color: 'red', textAlign: 'center', margin: '10px 0'}}>{error}</div>}
					<hr className="divider" />
					<button className="btn-role admin" onClick={handleAdminClick} disabled={loading}>Log in as Admin</button>
					{loading && <div style={{textAlign: 'center', margin: '10px 0', fontWeight: 'bold'}}>Loading...</div>}
					<button className="btn-role staff" disabled>Log in as Staff</button>
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
