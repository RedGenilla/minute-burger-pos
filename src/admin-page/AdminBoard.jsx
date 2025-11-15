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
  const [roleFilter, setRoleFilter] = useState("Role");
  const [editConfirmPassword, setEditConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showAddPassword, setShowAddPassword] = useState(false);

  // Added: separate edit password state with "masked" placeholder and dirty flag
  const [editPassword, setEditPassword] = useState("********");
  const [editPasswordDirty, setEditPasswordDirty] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10; // items per page

  // Block/Unblock confirmation modal state
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockTarget, setBlockTarget] = useState(null); // user object
  const [blockAction, setBlockAction] = useState("block"); // 'block' | 'unblock'
  const [blockLoading, setBlockLoading] = useState(false);
  const [blockError, setBlockError] = useState("");

  const [newUser, setNewUser] = useState({
    username: "",
    email: "",
    password: "",
    role: "Staff",
    status: "Inactive",
  });

  // Redirect to login if session is null
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
    // Email duplication validation
    const { data: existingEmail } = await supabase
      .from("users")
      .select("id")
      .eq("email", newUser.email)
      .limit(1);
    if (existingEmail && existingEmail.length > 0) {
      alert("Email already exists. Choose another email.");
      return;
    }
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
      const hashed = bcrypt.hashSync(newUser.password, 10);
      await supabase.from("users").insert([
        {
          id: data.user.id,
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
      password: "", // keep empty in main editUser state
      status: u.status,
    });
    // initialize masked value; not dirty until user types
    setEditPassword("********");
    setEditPasswordDirty(false);
    setEditConfirmPassword("");
    setShowEditModal(true);
  };

  // Open block/unblock confirm modal
  const openBlockConfirm = (u) => {
    const statusLc = String(u.status).toLowerCase();
    // Treat both 'banned' and legacy 'blocked' as banned
    const isBanned = statusLc === "banned" || statusLc === "blocked";
    setBlockTarget(u);
    setBlockAction(isBanned ? "unblock" : "block");
    setBlockError("");
    setShowBlockModal(true);
  };

  // Confirm block/unblock
  const handleConfirmBlock = async () => {
    if (!blockTarget) return;
    setBlockLoading(true);
    setBlockError("");
    try {
      // Normalize stored status to 'Banned' for consistency
      const newStatus = blockAction === "block" ? "Banned" : "Active";

      const { error } = await supabase
        .from("users")
        .update({ status: newStatus })
        .eq("id", blockTarget.id);

      if (error) {
        setBlockError(error.message);
      } else {
        setUsers((prevUsers) =>
          prevUsers.map((u) =>
            u.id === blockTarget.id ? { ...u, status: newStatus } : u
          )
        );
        setShowBlockModal(false);
        setBlockTarget(null);
      }
    } finally {
      setBlockLoading(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError("");

    // Only validate passwords if user actually changed the password
    if (editPasswordDirty) {
      if (editPassword !== editConfirmPassword) {
        setEditError("Passwords do not match.");
        setEditLoading(false);
        return;
      }
    }

    const updateFields = {
      username: editUser.username,
      status: editUser.status,
      ...(editPasswordDirty && editPassword
        ? { password: bcrypt.hashSync(editPassword, 10) }
        : {}),
    };

    const { error } = await supabase
      .from("users")
      .update(updateFields)
      .eq("id", editUser.id);

    if (error) setEditError("Failed to update user");
    else {
      setUsers((prevUsers) =>
        prevUsers.map((u) =>
          u.id === editUser.id ? { ...u, ...updateFields } : u
        )
      );
      setShowEditModal(false);
    }
    setEditLoading(false);
  };
  const displayedUsers = users
    .filter(
      (u) =>
        u.username.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
    )
    .filter((u) => (roleFilter === "Role" ? true : u.role === roleFilter))
    .sort((a, b) =>
      (a.username || "").localeCompare(b.username || "", undefined, {
        sensitivity: "base",
      })
    );

  // Ensure currentPage remains valid when filters or data change
  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(displayedUsers.length / pageSize));
    if (currentPage > totalPages) setCurrentPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users, search, filter, roleFilter]);

  const totalPages = Math.max(1, Math.ceil(displayedUsers.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedUsers = displayedUsers.slice(startIndex, endIndex);

  return (
    <div className="opswat-admin">
      <AdminSidebar active="user-management" />

      <main className="ops-main">
        <header className="ops-header">
          <h1>User Management</h1>
        </header>
        <div className="ops-controls ops-controls-row">
          <div className="controls-left">
            <div className="search-input-wrap">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="search-icon"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                type="text"
                className="search"
                placeholder="Search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="status-filter"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option>Status</option>
              <option>Active</option>
              <option>Inactive</option>
              <option>Blocked</option>
            </select>
            <select
              className="role-filter"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option>Role</option>
              <option>Staff</option>
              <option>Customer</option>
            </select>
          </div>
          <div className="controls-right">
            <button className="add-btn" onClick={() => setShowForm(true)}>
              + Add User
            </button>
          </div>
        </div>
        <div className="table-wrap">
          <table className="ops-table">
            <thead>
              <tr>
                <th className="th-2">Username</th>
                <th>Email</th>
                <th>Status</th>
                <th>Role</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6">Loading…</td>
                </tr>
              ) : displayedUsers.length === 0 ? (
                <tr>
                  <td colSpan="6">No user found.</td>
                </tr>
              ) : (
                paginatedUsers.map((u) => (
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
                      <button
                        className="edit-icon-btn"
                        onClick={() => openEditModal(u)}
                        aria-label="Edit user"
                        title="Edit"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" />
                          <path d="M20.71 7.04a1.003 1.003 0 0 0 0-1.41l-2.34-2.34a1.003 1.003 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                        </svg>
                      </button>
                      <button
                        className={`block-icon-btn ${
                          ["banned", "blocked"].includes(
                            String(u.status).toLowerCase()
                          )
                            ? "is-banned"
                            : "can-block"
                        }`}
                        onClick={() => openBlockConfirm(u)}
                        aria-label={
                          ["banned", "blocked"].includes(
                            String(u.status).toLowerCase()
                          )
                            ? "Unblock user"
                            : "Block user"
                        }
                        title={
                          ["banned", "blocked"].includes(
                            String(u.status).toLowerCase()
                          )
                            ? "Unblock user"
                            : "Block user"
                        }
                        style={{ marginLeft: 8 }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          role="img"
                          aria-hidden="true"
                          className="block-icon-svg"
                        >
                          <circle cx="12" cy="12" r="10"></circle>
                          <line
                            x1="4.93"
                            y1="4.93"
                            x2="19.07"
                            y2="19.07"
                          ></line>
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="pagination-fixed">
          <button
            className="pagination-link"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          >
            ◀ Prev
          </button>
          <span className="pagination-page">
            {currentPage}/{totalPages}
          </span>
          <button
            className="pagination-link"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => (p < totalPages ? p + 1 : p))}
          >
            Next ▶
          </button>
        </div>

        {showForm && (
          <div className="modal-bg">
            <div className="adminboard-modal">
              <button
                className="modal-close-x"
                onClick={() => setShowForm(false)}
                aria-label="Close modal"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="25"
                  height="25"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#000000"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ display: "block" }}
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
              <span className="adduser-title">ADD USER</span>
              <form className="adduser-form" onSubmit={addUser}>
                <label>Email</label>
                <input
                  name="email"
                  type="email"
                  placeholder="Enter email"
                  value={newUser.email}
                  onChange={(e) =>
                    setNewUser({ ...newUser, email: e.target.value })
                  }
                  required
                />

                <label>Username</label>
                <input
                  name="username"
                  placeholder="Enter username"
                  value={newUser.username}
                  onChange={(e) =>
                    setNewUser({ ...newUser, username: e.target.value })
                  }
                  required
                />

                <label>Password</label>
                <div className="password-wrapper">
                  <input
                    name="password"
                    type={showAddPassword ? "text" : "password"}
                    placeholder="Enter password"
                    value={newUser.password}
                    onChange={(e) =>
                      setNewUser({ ...newUser, password: e.target.value })
                    }
                    required
                  />
                  <span
                    className={`password-toggle ${
                      showAddPassword ? "active" : ""
                    }`}
                    onClick={() => setShowAddPassword(!showAddPassword)}
                    aria-label="Toggle password visibility"
                    title="Show/Hide password"
                  >
                    👁
                  </span>
                </div>

                <div className="role-row">
                  <label>Role:</label>
                  <span className="role-value">Staff</span>
                </div>

                <div className="single-confirm-wrap">
                  <button
                    type="submit"
                    className="btn-confirm full-width-confirm"
                  >
                    Add User
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {showEditModal && editUser && (
          <div className="modal-bg">
            <div className="adminboard-modal">
              <button
                className="modal-close-x"
                onClick={() => setShowEditModal(false)}
              >
                ✖
              </button>
              {/* <div className="adduser-header-bar"> */}
              <span className="adduser-title">EDIT USER</span>
              <form className="adduser-form" onSubmit={handleEditSubmit}>
                <label>Email</label>
                <input name="email" value={editUser.email} readOnly />
                <label>Username</label>
                <input
                  name="username"
                  value={editUser.username}
                  onChange={(e) =>
                    setEditUser({ ...editUser, username: e.target.value })
                  }
                  required
                />

                <label>Password</label>
                <div className="password-wrapper">
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter new password (leave blank to keep)"
                    value={
                      editPasswordDirty
                        ? editPassword // user typed, show typed value
                        : editPassword // still "********" initially
                    }
                    onFocus={() => {
                      if (!editPasswordDirty && editPassword === "********") {
                        // do nothing, keep placeholder
                      }
                    }}
                    onChange={(e) => {
                      setEditPassword(e.target.value);
                      setEditPasswordDirty(true);
                    }}
                  />
                  <span
                    className={`password-toggle ${
                      showPassword ? "active" : ""
                    }`}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    👁
                  </span>
                </div>

                <label>Confirm Password</label>
                <div className="password-wrapper">
                  <input
                    name="confirm_password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm new password"
                    value={
                      showConfirmPassword ? editPassword : editConfirmPassword
                    }
                    onChange={(e) => setEditConfirmPassword(e.target.value)}
                    disabled={!editPasswordDirty}
                    required={!!editPasswordDirty}
                  />
                  <span
                    className={`password-toggle ${
                      showConfirmPassword ? "active" : ""
                    }`}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    👁
                  </span>
                </div>

                <div className="status-container">
                  <div className="status-row">
                    <span
                      className={`status-text ${
                        editUser.status === "Active" ? "active" : "inactive"
                      }`}
                    >
                      {editUser.status}
                    </span>
                    <div
                      className={`status-toggle ${
                        editUser.status === "Active" ? "active" : ""
                      }`}
                      onClick={() =>
                        setEditUser({
                          ...editUser,
                          status:
                            editUser.status === "Active"
                              ? "Inactive"
                              : "Active",
                        })
                      }
                    >
                      <div className="toggle-circle"></div>
                    </div>
                  </div>
                </div>
                <div className="single-confirm-wrap">
                  <button
                    type="submit"
                    className="btn-confirm full-width-confirm"
                    disabled={editLoading}
                  >
                    Save Changes
                  </button>
                </div>
                {editError && <p className="error">{editError}</p>}
              </form>
            </div>
          </div>
        )}
        {/* Block/Unblock Confirmation Modal */}
        {showBlockModal && blockTarget && (
          <div className="modal-bg block-modal" role="dialog" aria-modal="true">
            <div className="adminboard-modal">
              <div>
                <p>Are you sure you want to {blockAction} this user?</p>
                {blockError && <p className="error">{blockError}</p>}
                <div className="modal-actions adduser-actions">
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => setShowBlockModal(false)}
                    disabled={blockLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn-confirm"
                    onClick={handleConfirmBlock}
                    disabled={blockLoading}
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
