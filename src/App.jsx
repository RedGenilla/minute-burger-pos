import { useContext, useState } from "react";

import { Link } from "react-router-dom";
import Signin from "./customer-login/Signin";

import { UserAuth } from "./authenticator/AuthContext";
import Dashboard from "./staff-page/Dashboard";
import StaffLogin from "./staff-login/staff-login";

function App() {
  const { user } = UserAuth();

  // console.log(user);

  return (
    <>
      <StaffLogin />
    </>
  );
}

export default App;