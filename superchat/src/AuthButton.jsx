import React from 'react';
import SignIn from './SignIn.jsx';
import SignOut from './SignOut.jsx';

function AuthButton({ user }) {
  if (user) {
    return <SignOut />;
  }
  return <SignIn />;
}

export default AuthButton;