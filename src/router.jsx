import { createBrowserRouter } from "react-router-dom";
import App from "./App";
import Signup from "./customer-login/Signup";
import Signin from "./customer-login/Signin";
import Dashboard from "./staff-page/Dashboard";
import StaffLogin from "./staff-login/staff-login";
import AdminLogin from "./admin-login/admin-login";
import PrivateRoute from "./customer-login/PrivateRoute";
import AdminBoard from "./admin-page/AdminBoard";

export const router = createBrowserRouter([
  { path: "/", element: <App /> },
  { path: "/signin", element: <Signin /> },
  { path: "/signup", element: <Signup /> },
  {
    path: "/dashboard",
    element: (
      <PrivateRoute>
        <Dashboard />
      </PrivateRoute>
    ),
  },
  { path: "/staff", element: <StaffLogin /> },
  { path: "/admin", element: <AdminLogin /> },
  { path: "/admin-login", element: <AdminLogin /> },
  { path: "/admin-user-management", element: <AdminBoard /> },
]);