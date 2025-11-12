import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import bcrypt from "bcryptjs";
import { UserAuth } from "../authenticator/AuthContext";
import "./AdminBoard.css";
import AdminSidebar from "./AdminSidebar";

export default function AdminBoard() {
  const { session } = UserAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Status");
  // sidebar state handled by shared AdminSidebar

  const [newUser, setNewUser] = useState({
    username: "",
    email: "",
    password: "",
    role: "Staff",
    status: "Inactive",
  });

  // Redirect to login if session is null (user is not authenticated)
  useEffect(() => {
    if (session === null) {
      window.location.href = "/login";
    }
  }, [session]);

  // fetch & subscribe
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
    const sub = supabase
      .channel("users-status")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "users" },
        fetchUsers
      )
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, [filter, showForm]);

  // add user
  const addUser = async (e) => {
    e.preventDefault();
    if (newUser.role === "Staff") {
      const { data, error: authError } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: { emailRedirectTo: window.location.origin + "/staff-login" },
      });
      if (authError) {
        alert(authError.message);
        return;
      }
      // Only insert into users table if signUp succeeded
      const hashed = bcrypt.hashSync(newUser.password, 10);
      await supabase.from("users").insert([
        {
          id: data.user.id, // Use Auth UUID as id
          username: newUser.username,
          email: newUser.email,
          password: hashed,
          role: newUser.role,
          status: newUser.status,
        },
      ]);
      alert(
        "User created! Verification email sent. Please check the user's inbox."
      );
      setShowForm(false);
      setNewUser({
        username: "",
        email: "",
        password: "",
        role: "Staff",
        status: "Inactive",
      });
      return;
    }
    // For other roles, just insert (or handle as needed)
    const hashed = bcrypt.hashSync(newUser.password, 10);
    await supabase.from("users").insert([{ ...newUser, password: hashed }]);
    alert("User created!");
    setShowForm(false);
    setNewUser({
      username: "",
      email: "",
      password: "",
      role: "Staff",
      status: "Inactive",
    });
  };

  // edit user
  const openEditModal = (u) => {
    setEditUser({
      id: u.id,
      username: u.username,
      email: u.email,
      password: "",
      status: u.status,
    });
    setShowEditModal(true);
  };
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    const updateFields = {
      username: editUser.username,
      status: editUser.status,
      ...(editUser.password && {
        password: bcrypt.hashSync(editUser.password, 10),
      }),
    };
    const { error } = await supabase
      .from("users")
      .update(updateFields)
      .eq("id", editUser.id);
    if (error) setEditError("Failed to update user");
    else setShowEditModal(false);
    setEditLoading(false);
  };

  const displayedUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="opswat-admin">
      {/* Sidebar */}
      <AdminSidebar active="user-management" />

      {/* Main */}
      <main className="ops-main">
        <header className="ops-header">
          <h1>User Management</h1>
          <button className="add-btn" onClick={() => setShowForm(true)}>
            Add User +
          </button>
        </header>

        <div className="ops-controls">
          <input
            type="text"
            className="search"
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option>Status</option>
            <option>Active</option>
            <option>Inactive</option>
            <option>Banned</option>
          </select>
        </div>

        <div className="table-wrap">
          <table className="ops-table">
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
                  <td colSpan="5">Loading…</td>
                </tr>
              ) : displayedUsers.length === 0 ? (
                <tr>
                  <td colSpan="5">No user found.</td>
                </tr>
              ) : (
                displayedUsers.map((u) => (
                  <tr key={u.id}>
                    <td>{u.username}</td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`status ${u.status.toLowerCase()}`}>
                        {u.status}
                      </span>
                    </td>
                    <td>{u.role}</td>
                    <td>
                      <button className="edit" onClick={() => openEditModal(u)}>
                        ✏️
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Add User Modal */}
        {showForm && (
          <div className="modal-bg">
            <div className="adminboard-modal">
              <div className="adduser-header-bar">
                <span className="adduser-title">ADD USER</span>
              </div>
              <form className="adduser-form" onSubmit={addUser}>
                <label>Username:</label>
                <input
                  name="username"
                  value={newUser.username}
                  onChange={(e) =>
                    setNewUser({ ...newUser, username: e.target.value })
                  }
                  required
                />

                <label>Email:</label>
                <input
                  name="email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) =>
                    setNewUser({ ...newUser, email: e.target.value })
                  }
                  required
                />

                <label>Password:</label>
                <input
                  name="password"
                  type="password"
                  value={newUser.password}
                  onChange={(e) =>
                    setNewUser({ ...newUser, password: e.target.value })
                  }
                  required
                />

                <label>Role:</label>
                <select
                  name="role"
                  value={newUser.role}
                  onChange={(e) =>
                    setNewUser({ ...newUser, role: e.target.value })
                  }
                >
                  <option>Staff</option>
                </select>

                <div className="modal-actions adduser-actions">
                  <button type="submit" className="btn-confirm">
                    Confirm
                  </button>
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit User Modal */}
        {showEditModal && editUser && (
          <div className="modal-bg">
            <div className="adminboard-modal">
              <div className="adduser-header-bar">
                <span className="adduser-title">EDIT USER</span>
              </div>
              <form className="adduser-form" onSubmit={handleEditSubmit}>
                <label>Username:</label>
                <input
                  name="username"
                  value={editUser.username}
                  onChange={(e) =>
                    setEditUser({ ...editUser, username: e.target.value })
                  }
                  required
                />

                <label>Email:</label>
                <input name="email" value={editUser.email} readOnly />

                <label>New Password:</label>
                <input
                  name="password"
                  type="password"
                  placeholder="Leave blank to keep"
                  value={editUser.password}
                  onChange={(e) =>
                    setEditUser({ ...editUser, password: e.target.value })
                  }
                />

                <label>Status:</label>
                <div className="status-row">
                  <span className={`status ${editUser.status.toLowerCase()}`}>
                    {editUser.status}
                  </span>
                  {editUser.status === "Banned" ? (
                    <button
                      type="button"
                      className="unban-btn"
                      onClick={() =>
                        setEditUser({ ...editUser, status: "Active" })
                      }
                    >
                      Unban
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="ban-btn"
                      onClick={() =>
                        setEditUser({ ...editUser, status: "Banned" })
                      }
                    >
                      Ban
                    </button>
                  )}
                </div>

                <div className="modal-actions adduser-actions">
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => setShowEditModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-confirm"
                    disabled={editLoading}
                  >
                    Confirm
                  </button>
                </div>
                {editError && <p className="error">{editError}</p>}
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
