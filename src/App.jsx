import { useContext, useState } from "react";

import { Link } from "react-router-dom";
import Signin from "./customer-login/Signin";

import { UserAuth } from "./authenticator/AuthContext";
import Dashboard from "./staff-page/Dashboard";

function App() {
  const { user } = UserAuth();

  // console.log(user);

  return (
    <>
      <Signin />
    </>
  );
}

export default App;