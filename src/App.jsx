import { useContext, useState } from "react";

import { Link } from "react-router-dom";
import Signin from "./customer-login/Signin";

import { UserAuth } from "./authenticator/AuthContext";
import Dashboard from "./staff-page/Dashboard";
import GeneralLogin from "./general-login/general-login";
// ...existing code...

function App() {
  const auth = UserAuth() || {};
  const { session } = auth;
  const user = session?.user;

  // console.log(user);

  return (
    <>
      <GeneralLogin />
    </>
  );
}

export default App;