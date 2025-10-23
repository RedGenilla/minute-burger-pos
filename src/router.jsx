import { createBrowserRouter } from "react-router-dom";
import App from "./App";
import IngredientsDashboard from "./admin-page/ingredients";
// import Signup from "./customer-login/Signup";
// import Signin from "./customer-login/Signin";
import Dashboard from "./staff-page/Dashboard";
import GeneralLogin from "./general-login/general-login";
// import AdminLogin from "./admin-login/admin-login";
// import PrivateRoute from "./customer-login/PrivateRoute";
import AdminBoard from "./admin-page/AdminBoard";


import SalesReport from "./admin-page/SalesReport";
import MenuManagement from "./admin-page/MenuManagement";
import MenuList from "./menu-list/MenuList";


export const router = createBrowserRouter([
  { path: "/", element: <App /> },
  // { path: "/signin", element: <Signin /> },
  // { path: "/signup", element: <Signup /> },
  // Use GeneralLogin for both staff and admin accounts
  { path: "/login", element: <GeneralLogin /> },
  { path: "/staff/dashboard", element: <Dashboard /> },
  { path: "/admin-user-management", element: <AdminBoard /> },
  { path: "/admin/menu-management", element: <MenuManagement /> },
  { path: "/admin/ingredients-dashboard", element: <IngredientsDashboard /> },
  { path: "/menu-list", element: <MenuList /> },
  { path: "/admin/sales-report", element: <SalesReport /> },
]);