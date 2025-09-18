
import React, { useState, useEffect, useContext } from "react";
import sidebarIcon from "../assets/sidebar.png";
import userIcon from "../assets/user.png";
import menuIcon from "../assets/menu.png";
import logoutIcon from "../assets/logout.png";
import { useNavigate } from "react-router-dom";
import "./AdminBoard.css";
import { supabase } from "../supabaseClient";
import minuteLogo from "../assets/minute.png";
import bcrypt from "bcryptjs";
import { UserAuth } from "../authenticator/AuthContext";


export default function AdminBoard() {
	const { signOut } = UserAuth();
	const navigate = useNavigate();
	// Users state from Supabase
	const [users, setUsers] = useState([]);
	const [loading, setLoading] = useState(true);
	const [showForm, setShowForm] = useState(false);
	const [newUser, setNewUser] = useState({
		username: "",
		email: "",
		password: "",
		role: "Staff",
		status: "Inactive",
	});
	// Edit modal state
	const [showEditModal, setShowEditModal] = useState(false);
	const [editUser, setEditUser] = useState(null);
	const [editLoading, setEditLoading] = useState(false);
	const [editError, setEditError] = useState("");
	const [search, setSearch] = useState("");
	const [filter, setFilter] = useState("Status");
	const [sidebarOpen, setSidebarOpen] = useState(false);

	// Fetch users from Supabase
	useEffect(() => {
		const fetchUsers = async () => {
			setLoading(true);
			let query = supabase.from("users").select();
			if (filter !== "Status") query = query.eq("status", filter);
			const { data, error } = await query;
			if (!error) setUsers(data || []);
			setLoading(false);
		};
			fetchUsers();

			// Supabase real-time subscription for users table
			const subscription = supabase
				.channel('users-status')
				.on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, (payload) => {
					// Refetch users when any change happens
			const [addUserError, setAddUserError] = useState("");
			const [addUserSuccess, setAddUserSuccess] = useState("");
					fetchUsers();
				})
				.subscribe();

			// Cleanup subscription on unmount
			return () => {
				supabase.removeChannel(subscription);
			};
	}, [showForm, filter, navigate]);
	// ...existing code...

	// Add user to Supabase
	const addUser = async (e) => {
    e.preventDefault();

    // Only create Supabase Auth user for staff accounts
    if (newUser.role === "Staff") {
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: newUser.email,
            password: newUser.password,
            options: {
                emailRedirectTo: window.location.origin + "/staff-login", // Change if needed
            },
        });
        if (authError) {
            alert("Failed to create staff in Auth: " + authError.message);
            return;
        }
    }

    // Hash the password before saving
    const hashedPassword = bcrypt.hashSync(newUser.password, 10);
    const userToInsert = {
        ...newUser,
        password: hashedPassword,
    };
    const { error } = await supabase.from("users").insert([userToInsert]);
    if (!error) {
        setShowForm(false);
        setNewUser({ username: "", email: "", password: "", role: "Staff", status: "Inactive" });
        const { data: usersData } = await supabase.from("users").select();
        setUsers(usersData || []);
    }
};

	// Handle form changes
	const handleChange = (e) => {
		const { name, value } = e.target;
		setNewUser({ ...newUser, [name]: value });
	};

	// Handle edit modal changes
	const handleEditChange = (e) => {
		const { name, value } = e.target;
		setEditUser({ ...editUser, [name]: value });
	};

	// Open edit modal
	const openEditModal = (user) => {
		setEditUser({
			id: user.id,
			username: user.username,
			email: user.email,
			password: "", // blank for security
			status: user.status,
		});
		setEditError("");
		setShowEditModal(true);
	};

	// Update user in Supabase
	const handleEditSubmit = async (e) => {
		e.preventDefault();
		setEditLoading(true);
		setEditError("");
		let updateFields = {
			username: editUser.username,
			status: editUser.status,
		};
		// Only update password if provided
		if (editUser.password) {
			updateFields.password = bcrypt.hashSync(editUser.password, 10);
		}
		const { error } = await supabase
			.from("users")
			.update(updateFields)
			.eq("id", editUser.id);
		if (error) {
			setEditError("Failed to update user");
			setEditLoading(false);
			return;
		}
		// Refresh users
		const { data: usersData } = await supabase.from("users").select();
		setUsers(usersData || []);
		setShowEditModal(false);
		setEditLoading(false);
	};

	// Filtered and searched users
	const displayedUsers = users.filter(
		(u) =>
			u.username.toLowerCase().includes(search.toLowerCase()) ||
			u.email.toLowerCase().includes(search.toLowerCase())
	);


		return (
			<div className="admin-board-page">
				{/* Sidebar toggle button */}
				<button
					className="sidebar-toggle"
					style={{
						position: "fixed",
						top: 24,
						left: 24,
						zIndex: 200,
						background: "none",
						border: "none",
						cursor: "pointer",
						padding: 0,
					}}
					onClick={() => setSidebarOpen((open) => !open)}
					aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
				>
					<img src={sidebarIcon} alt="Toggle Sidebar" style={{ width: 36, height: 36 }} />
				</button>

				{/* Sidebar */}
				<div
					className="sidebar-nav"
					style={{
						left: sidebarOpen ? 0 : "-200px",
						transition: "left 0.3s cubic-bezier(.4,0,.2,1)",
						boxShadow: sidebarOpen ? "2px 0 8px rgba(0,0,0,0.07)" : "none",
					}}
				>
					<a className="sidebar-item" href="/admin-user-management">
						<img src={userIcon} alt="User Management" />
						<span>User Management</span>
					</a>
					<a className="sidebar-item" href="/admin/menu-management">
						<img src={menuIcon} alt="Menu Management" />
						<span>Menu Management</span>
					</a>
					<a className="sidebar-item logout" href="/login">
						<img src={logoutIcon} alt="Log Out" />
						<span>Log Out</span>
					</a>
				</div>

				{/* Main content */}
  				<div style={{ transition: "margin-left 0.3s cubic-bezier(.4,0,.2,1)" }}>
					{/* Log out button at top right */}
					<button
						className="logout-btn"
						style={{position: 'absolute', top: 24, right: 32, zIndex: 10}}
						onClick={async () => {
							await signOut();
							navigate('/login');
						}}
					>
						Log out
					</button>
					<header className="admin-header">
						<img src={minuteLogo} alt="Minute Burger Logo" className="admin-logo" />
						<h1 className="admin-title">USER MANAGEMENT</h1>
					</header>

					<div className="admin-controls">
						<input
							type="text"
							placeholder="Search"
							className="admin-search"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
						/>
						<select className="admin-filter" value={filter} onChange={(e) => setFilter(e.target.value)}>
							<option>Status</option>
							<option>Active</option>
							<option>Inactive</option>
							<option>Banned</option>
						</select>
						<button className="admin-btn-add" onClick={() => setShowForm(true)}>
							Add user +
						</button>
					</div>

					<table className="admin-user-table">
						<thead>
							<tr>
								<th>Username</th>
								<th>Email</th>
								<th>Status</th>
								<th>Role</th>
								<th>Action</th>
							</tr>
						</thead>
						<tbody>
							{loading ? (
								<tr>
									<td colSpan="5" style={{ textAlign: "center", padding: "10px" }}>Loading...</td>
								</tr>
							) : displayedUsers.length === 0 ? (
								<tr>
									<td colSpan="5" style={{ textAlign: "center", padding: "10px" }}>
										No users yet. Click "Add user +" to create one.
									</td>
								</tr>
							) : (
								displayedUsers.map((u) => (
									<tr key={u.id}>
										<td>{u.username}</td>
										<td>{u.email}</td>
										<td>
											<span className={`admin-status ${u.status.toLowerCase()}`}>{u.status}</span>
										</td>
										<td>{u.role}</td>
										<td>
											<button className="admin-action edit" onClick={() => openEditModal(u)}>✏️</button>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>

					{/* Add User Form (Modal) */}
					{showForm && (
						<div className="admin-modal">
							<div className="admin-modal-content">
								<h2>Add New User</h2>
								<form onSubmit={addUser} className="admin-add-form">
									<input
										type="text"
										name="username"
										placeholder="Username"
										value={newUser.username}
										onChange={handleChange}
										required
									/>
									<input
										type="email"
										name="email"
										placeholder="Email"
										value={newUser.email}
										onChange={handleChange}
										required
									/>
									<input
										type="password"
										name="password"
										placeholder="Password"
										value={newUser.password}
										onChange={handleChange}
										required
									/>
									{/* Status dropdown removed. Status will default to 'Inactive' when creating a new user. */}
									<select name="role" value={newUser.role} onChange={handleChange}>
										<option>Staff</option>
									</select>
									<div className="admin-form-actions">
										<button type="submit" className="admin-btn-save">Save</button>
										<button type="button" className="admin-btn-cancel" onClick={() => setShowForm(false)}>
											Cancel
										</button>
									</div>
								</form>
							</div>
						</div>
					)}

					{/* Edit User Modal */}
					{showEditModal && editUser && (
						<div className="admin-modal">
							<div className="admin-modal-content">
								<h2>Edit User</h2>
								<form onSubmit={handleEditSubmit} className="admin-add-form">
									<input
										type="text"
										name="username"
										placeholder="Username"
										value={editUser.username}
										onChange={handleEditChange}
										required
									/>
									<input
										type="email"
										name="email"
										placeholder="Email"
										value={editUser.email}
										readOnly
										style={{ backgroundColor: '#eee', cursor: 'not-allowed' }}
									/>
									<input
										type="password"
										name="password"
										placeholder="New Password (leave blank to keep)"
										value={editUser.password}
										onChange={handleEditChange}
									/>
									<div style={{marginBottom: '10px'}}>
										<label>Status: </label>
										<span className={`admin-status ${editUser.status.toLowerCase()}`}>{editUser.status}</span>
										<button
											type="button"
											className={editUser.status === 'Banned' ? 'admin-btn-unban' : 'admin-btn-ban'}
											style={{marginLeft: '10px'}}
											onClick={() => setEditUser({ ...editUser, status: editUser.status === 'Banned' ? 'Active' : 'Banned' })}
										>
											{editUser.status === 'Banned' ? 'Unban' : 'Ban'}
										</button>
									</div>
									<div className="admin-form-actions">
										<button type="submit" className="admin-btn-save" disabled={editLoading}>Update</button>
										<button type="button" className="admin-btn-cancel" onClick={() => setShowEditModal(false)}>
											Cancel
										</button>
									</div>
									{editError && <div style={{color: 'red', textAlign: 'center', margin: '10px 0', fontWeight: 'normal'}}>{editError}</div>}
								</form>
							</div>
						</div>
					)}
				</div>
			</div>
		);
}
