import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import "./general-login.css";
import minuteLogo from "../assets/minute.png";
import { UserAuth } from "../authenticator/AuthContext";


const GeneralLogin = () => {
	const navigate = useNavigate();
	const [loading, setLoading] = useState(false);
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");

	const handleLogin = async (e) => {
		e.preventDefault();
		setLoading(true);
		setError("");
		// 1. Authenticate user
		const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
			email: username,
			password: password
		});
		if (signInError || !signInData?.user) {
			setError("Invalid credentials. Please try again.");
			setLoading(false);
			return;
		}
		// 2. Check both tables for role and status
		let role = null;
		let banned = false;
		let foundTable = null;
		// Try users table first
		const { data: userData } = await supabase
			.from('users')
			.select('status, role')
			.eq('email', username)
			.single();
		console.log('User table result:', userData);
		if (userData) {
			role = userData.role;
			banned = userData.status === 'Banned';
			foundTable = 'users';
		}
		// If not found or no role, try profiles table
		else if (!role) {
			const { data: profileData } = await supabase
				.from('profiles')
				.select('role')
				.eq('email', username)
				.single();
			console.log('Profiles table result:', profileData);
			if (profileData) {
				role = profileData.role;
				banned = profileData.status === 'Banned';
				foundTable = 'profiles';
			}
		}
		if (!role) {
			setError('Unable to verify account role.');
			setLoading(false);
			return;
		}
		if (banned) {
			setError('Account Banned');
			setLoading(false);
			return;
		}
		// 3. Update status to Active in the correct table
		if (foundTable) {
			await supabase.from(foundTable).update({ status: 'Active' }).eq('email', username);
		}
		// 4. Redirect based on role
		if (role === 'Admin') {
			navigate('/admin-user-management');
		} else {
			navigate('/staff/dashboard');
		}
		setLoading(false);
	};

	return (
		<div className="general-bg">
			<div className="general-poster">
				{/* Header Logo and Title */}
				<div className="general-header">
					<span>MINUTE</span>
					<img src={minuteLogo} alt="Minute Burger Logo" />
					<span>BURGER</span>
				</div>

				{/* Login Container */}
				<div className="login-container">
					<h2 className="login-title">Log in</h2>
					<form className="login-form" onSubmit={handleLogin}>
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
					{loading && <div style={{textAlign: 'center', margin: '10px 0', fontWeight: 'bold'}}>Loading...</div>}
					<p className="terms">Terms and Conditions</p>
				</div>

				{/* Footer */}
				<div className="general-footer">
					<hr />
					<img src={minuteLogo} alt="Minute Burger Footer Logo" className="footer-logo" />
				</div>
			</div>
		</div>
	);
};

export default GeneralLogin;
