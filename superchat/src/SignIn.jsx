import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, firestore } from './firebase.js';

function SignIn(props) {
  const buttonClass = props.className || "px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition duration-300 disabled:bg-blue-300";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const signInWithGoogle = async () => {
    setError(null);
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      await setDoc(doc(firestore, 'users', user.uid), {
          displayName: user.displayName,
          photoURL: user.photoURL,
          uid: user.uid,
          email: user.email,
          lastSeen: serverTimestamp(),
      }, { merge: true });

      navigate('/dashboard/public');
    } catch (err) {
      console.error('Sign in error', err);
      setError(err.message || 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button className={buttonClass} onClick={signInWithGoogle} disabled={loading}>
        {loading ? 'Signing in…' : 'Sign in with Google'}
      </button>
      {error && <div className="text-red-600 mt-4 p-2 bg-red-100 rounded">{error}</div>}
    </div>
  );
}

export default SignIn;