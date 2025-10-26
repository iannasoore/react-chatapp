import React from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

function SignOut() {
  const navigate = useNavigate();
  const doSignOut = async () => {
    await signOut(auth);
    navigate('/');
  };

  return (
    <button
      className="px-4 py-2 bg-red-500 text-white font-semibold rounded-lg shadow-md hover:bg-red-600 transition duration-300 text-sm"
      onClick={doSignOut}
    >
      Sign out
    </button>
  );
}

export default SignOut;