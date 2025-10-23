import React, { useRef, useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './App.css';

import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import 'firebase/compat/auth';

import { useAuthState } from 'react-firebase-hooks/auth';
import { useCollection } from 'react-firebase-hooks/firestore';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Link,
  useNavigate,
} from 'react-router-dom';


firebase.initializeApp({
 
  apiKey: "AIzaSyD-VnrZ-bjw8WOF2vsn5lVw7NspZLh3BxY",
  authDomain: "react-chatapp-db817.firebaseapp.com",
  projectId: "react-chatapp-db817",
  storageBucket: "react-chatapp-db817.firebasestorage.app",
  messagingSenderId: "126510619225",
  appId: "1:126510619225:web:dd6c3cae1d254c36506f48",
  measurementId: "G-B31F493WW2"
  
})
const auth = firebase.auth();
const firestore = firebase.firestore();

// If running on localhost, connect to the local Firestore emulator (development only)
if (window.location.hostname === 'localhost') {
  try {
    // compat API to connect to emulator
    firestore.useEmulator('localhost', 8080);
    console.log('Connected to Firestore emulator at localhost:8080');
  } catch (err) {
    console.warn('Could not connect to Firestore emulator:', err);
  }
}


function App() {
  const [user] = useAuthState(auth);

  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <div className="header-row">
            <h1 className='bg-red-200 text-red-950 p-2 rounded-md'> SuperChat</h1>
            <nav>
              <Link to="/">Home</Link>
              {user && <Link to="/chat" className="ml-4">Chat</Link>}
            </nav>
            {user ? <SignOut /> : null}
          </div>
        </header >

        <section>
          <Routes>
            <Route path="/" element={<SignInPage />} />
            <Route
              path="/chat"
              element={<ProtectedRoute user={user}><ChatRoom /></ProtectedRoute>}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </section>
      </div>
    </Router>
  );
}

function SignInPage() {
  return (
    <div className="p-4">
      <h2 className="text-xl mb-2">Sign in to continue</h2>
      <SignIn />
    </div>
  );
}

function ProtectedRoute({ user, children }) {
  if (!user) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function SignIn() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const signInWithGoogle = async () => {
    setError(null);
    setLoading(true);
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      await auth.signInWithPopup(provider);
    } catch (err) {
      console.error('Sign in error', err);
      setError(err.message || 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        className="sign-in px-3 py-1 bg-blue-600 text-white rounded"
        onClick={signInWithGoogle}
        disabled={loading}
      >
        {loading ? 'Signing in…' : 'Sign in with Google'}
      </button>
      {error && <div className="text-red-600 mt-2">{error}</div>}
    </div>
  );
}

function SignOut() {
  const navigate = useNavigate();
  const doSignOut = async () => {
    await auth.signOut();
    navigate('/');
  };

  return (
    auth.currentUser && (
      <button className="sign-out" onClick={doSignOut}>
        Sign out
      </button>
    )
  );
}

function ChatRoom() {
  const dummy = useRef();

  const messagesRef = firestore.collection('messages');
  const query = messagesRef.orderBy('createdAt').limit(25);

  const [messages] = useCollection(query, { idField: 'id' });
  const [formValue, setFormValue] = useState('');
  const [sendError, setSendError] = useState(null);
  const [pendingMessages, setPendingMessages] = useState([]);

  // Reconcile server messages with pending optimistic messages.
  // When a server document appears that matches a pending message (by uid+text
  // and close timestamp), remove the pending message so duplicates don't show.
  useEffect(() => {
    if (!messages || pendingMessages.length === 0) return;

    const toRemove = new Set();

    for (const doc of messages.docs) {
      let data;
      try {
        data = doc.data();
      } catch (e) {
        continue;
      }
      if (!data) continue;

      for (const pm of pendingMessages) {
        if (pm.uid !== data.uid) continue;
        if (pm.text !== data.text) continue;

        const serverTs = data.createdAt && data.createdAt.toDate ? data.createdAt.toDate() : null;
        const pmTs = pm.createdAt ? new Date(pm.createdAt).getTime() : null;

        if (serverTs && pmTs) {
          const diff = Math.abs(serverTs.getTime() - pmTs);
          if (diff < 15000) {
            toRemove.add(pm.id);
          }
        } else if (pmTs && Date.now() - pmTs < 30000) {
          // server timestamp missing but pm is recent -> assume match
          toRemove.add(pm.id);
        }
      }
    }

    if (toRemove.size > 0) {
      setPendingMessages((p) => p.filter((m) => !toRemove.has(m.id)));
    }
  }, [messages, pendingMessages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    setSendError(null);
    if (!formValue || !formValue.trim()) return;
    const user = auth.currentUser;
    if (!user) {
      setSendError('You must be signed in to send messages.');
      return;
    }

    const { uid, photoURL } = user;
    // Optimistic UI: create a pending message immediately
    const tempId = `temp-${Date.now()}-${Math.floor(Math.random()*100000)}`;
    const pending = {
      id: tempId,
      text: formValue.trim(),
      uid,
      photoURL,
      createdAt: new Date(),
      status: 'sending',
    };
    setPendingMessages((p) => [...p, pending]);
    // clear input and scroll immediately to show instant feedback
    setFormValue('');
    dummy.current && dummy.current.scrollIntoView({ behavior: 'smooth' });

    // perform the write in background with retries
    const trySend = async (attempt = 1) => {
      try {
        const docRef = await messagesRef.add({
          text: pending.text,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          uid: pending.uid,
          photoURL: pending.photoURL,
        });
        console.log('Message written with ID: ', docRef.id);
        // remove pending message on success
        setPendingMessages((p) => p.filter((m) => m.id !== tempId));
      } catch (err) {
        console.error('Failed to send message attempt', attempt, err);
        if (attempt < 2) {
          // small backoff then retry once
          setTimeout(() => trySend(attempt + 1), 500 * attempt);
        } else {
          // mark as failed so user can retry
          setPendingMessages((p) => p.map((m) => (m.id === tempId ? { ...m, status: 'failed', error: err && (err.message || JSON.stringify(err)) } : m)));
          setSendError(err && (err.message || JSON.stringify(err)));
        }
      }
    };

    // fire-and-forget the send
    trySend();
  };

  const retryPending = (tempId) => {
    const pm = pendingMessages.find((m) => m.id === tempId);
    if (!pm) return;
    // set back to sending
    setPendingMessages((p) => p.map((m) => (m.id === tempId ? { ...m, status: 'sending', error: null } : m)));
    // attempt to send again
    (async () => {
      try {
        const docRef = await messagesRef.add({
          text: pm.text,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          uid: pm.uid,
          photoURL: pm.photoURL,
        });
        console.log('Retry sent, id:', docRef.id);
        setPendingMessages((p) => p.filter((m) => m.id !== tempId));
      } catch (err) {
        console.error('Retry failed', err);
        setPendingMessages((p) => p.map((m) => (m.id === tempId ? { ...m, status: 'failed', error: err && (err.message || JSON.stringify(err)) } : m)));
      }
    })();
  };

  return (
    <div className="chat-room">
      <div className="messages" aria-live="polite">
        {(() => {
          // If we have pending messages, avoid rendering server messages that
          // correspond to those pending entries to prevent duplicates.
          const serverDocs = messages ? messages.docs : [];
          const filtered = serverDocs.filter((doc) => {
            try {
              const data = doc.data();
              if (!data) return true;
              // if no pending messages, just show
              if (!pendingMessages || pendingMessages.length === 0) return true;
              // check each pending message for a match
              for (const pm of pendingMessages) {
                if (pm.uid !== data.uid) continue;
                if (pm.text !== data.text) continue;
                // if server createdAt exists, compare timestamps (within 5s)
                const serverTs = data.createdAt && data.createdAt.toDate ? data.createdAt.toDate() : null;
                if (serverTs) {
                  const diff = Math.abs(serverTs.getTime() - new Date(pm.createdAt).getTime());
                  if (diff < 5000) return false; // treat as duplicate -> filter out
                }
              }
            } catch (err) {
              // on error, don't filter this doc
              return true;
            }
            return true;
          });

          return filtered.map((doc) => <ChatMessage key={doc.id} message={doc.data()} />);
        })()}
        {/* pending/local messages shown after server-backed messages */}
        {pendingMessages.map((pm) => (
          <ChatMessage
            key={pm.id}
            message={pm}
            pending={true}
            retry={() => retryPending(pm.id)}
          />
        ))}
        <div ref={dummy} />
      </div>

      <form className="chat-form" onSubmit={sendMessage}>
        <input
          type="text"
          value={formValue}
          onChange={(e) => setFormValue(e.target.value)}
          placeholder="Say something nice"
          aria-label="Message"
        />
        <button type="submit" disabled={!formValue.trim()}>
          Send
        </button>
      </form>
      {sendError && (
        <div className="text-red-600 p-2" role="alert">
          Error sending message: {sendError}
        </div>
      )}
    </div>
  );
}

function ChatMessage(props) {
  const { text, uid, photoURL } = props.message;
  const messageClass = uid === auth.currentUser.uid ? 'sent' : 'received';

  // show a small timestamp if available
  const ts = props.message.createdAt && props.message.createdAt.toDate ? props.message.createdAt.toDate() : null;

  return (
    <div className={`message ${messageClass}`}>
      <img src={photoURL} alt="avatar" />
      <div className="bubble">
        <p>{text}</p>
        {ts && typeof ts.toLocaleTimeString === 'function' && (
          <small className="text-xs text-gray-500">{ts.toLocaleTimeString()}</small>
        )}
        {/* pending/failed UI for optimistic messages */}
        {props.pending && props.message.status === 'sending' && (
          <div className="text-xs text-gray-500">Sending…</div>
        )}
        {props.pending && props.message.status === 'failed' && (
          <div className="text-xs text-red-600">
            Failed to send
            {props.message.error && `: ${props.message.error}`}
            <button onClick={() => props.retry && props.retry()} className="ml-2 px-2 py-1 bg-yellow-400 rounded text-xs">Retry</button>
          </div>
        )}
      </div>
    </div>
  );
}

// Mount the app when this file is loaded by Vite's index.html
const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

export default App;
