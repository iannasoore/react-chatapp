import React, { useRef, useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css'; // Import Tailwind CSS

import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, collection, query as firestoreQuery, orderBy, limit, onSnapshot, doc, setDoc, serverTimestamp, addDoc, where, getDoc, connectFirestoreEmulator } from 'firebase/firestore';

import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Link,
  useNavigate,
  useParams,
} from 'react-router-dom';

// Initialize Firebase App (ensure this only runs once)
// NOTE: Firebase config and setup is assumed to be handled externally or via environment variables
// For self-contained testing, use dummy values or ensure you replace them.
const firebaseApp = initializeApp({
  apiKey: "AIzaSyD-VnrZ-bjw8WOF2vsn5lVw7NspZLh3BxY",
  authDomain: "react-chatapp-db817.firebaseapp.com",
  projectId: "react-chatapp-db817",
  storageBucket: "react-chatapp-db817.firebasestorage.app",
  messagingSenderId: "126510619225",
  appId: "1:126510619225:web:dd6c3cae1d254c36506f48",
  measurementId: "G-B31F493WW2",
});

const auth = getAuth(firebaseApp);
const firestore = getFirestore(firebaseApp);

// If running on localhost, connect to the local Firestore emulator (development only)
if (window.location.hostname === 'localhost') {
  try {
    connectFirestoreEmulator(firestore, 'localhost', 8080);
    console.log('Connected to Firestore emulator at localhost:8080');
  } catch (err) {
    console.warn('Could not connect to Firestore emulator:', err);
  }
}

// --- Custom Hooks to replace react-firebase-hooks ---

function useAuthStateCustom(auth) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, firebaseUser => {
            setUser(firebaseUser);
            setLoading(false);
        });
        return unsubscribe; // Cleanup subscription on unmount
    }, [auth]);

    return [user, loading];
}

function useCollectionCustom(query, options = {}) {
    const [snapshot, setSnapshot] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onSnapshot(query,
            (snapshot) => {
                setSnapshot(snapshot);
                setLoading(false);
            },
            (error) => {
                console.error("Firestore error:", error);
                setLoading(false);
            }
        );
        return unsubscribe; // Re-subscribe if the query object changes
    // FIX: The query object is re-created on every render, causing an infinite loop.
    // We can serialize the query's internal properties to create a stable dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(query)]);

    return [snapshot, loading];
}

// Utility function to generate a consistent chat ID between two users
function getChatId(uid1, uid2) {
    // Sort UIDs alphabetically to ensure the chat ID is the same regardless of who starts the chat
    const sortedUids = [uid1, uid2].sort();
    return sortedUids.join('_');
}

function App() {
  const [user] = useAuthStateCustom(auth); // Use custom hook

  return (
    <Router>
      <div className="App min-h-screen flex flex-col bg-gray-900 text-white">
        <header className="App-header bg-gray-800 shadow-lg z-10 border-b border-gray-700">
          <div className="header-row flex justify-between items-center p-4 max-w-7xl mx-auto w-full">
            <h1 className='text-2xl font-extrabold text-blue-400'>⚡️ SuperChat</h1>
            <nav className="flex space-x-4 items-center">
              <Link to="/" className="text-gray-300 hover:text-blue-400 transition">Home</Link>
              {user && <Link to="/dashboard" className="text-gray-300 hover:text-blue-400 transition">Dashboard</Link>}
            </nav>
            <AuthButton user={user} />
          </div>
        </header >

        <section className="main-content flex-1 max-w-7xl mx-auto w-full p-4">
          <Routes>
            <Route path="/" element={<SignInPage />} />
            {/* New MainDashboard route */}
            <Route
              path="/dashboard/*"
              element={<ProtectedRoute user={user}><MainDashboard /></ProtectedRoute>}
            />
            {/* Redirect old /chat path to /dashboard for consistency */}
            <Route path="/chat" element={<Navigate to="/dashboard/public" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </section>
      </div>
    </Router>
  );
}

// --- Auth Components ---

function SignInPage() {
  return (
    <div className="p-8 flex justify-center items-center h-full ">
      <div className="bg-gray-800 p-10 rounded-xl shadow-2xl text-center border border-gray-700 max-w-md">
        <h2 className="text-3xl font-bold mb-4 text-blue-400">Welcome to SuperChat</h2>
        <p className="text-gray-300">Please sign in using the button in the top-right corner to continue.</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ user, children }) {
  if (!user) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function AuthButton({ user }) {
  if (user) {
    return <SignOut />;
  }
  return <SignIn />;
}

function SignIn(props) {
  // Use a class from props if provided, otherwise default
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

      // 1. CRITICAL: Save/Update user profile in the 'users' collection
      await setDoc(doc(firestore, 'users', user.uid), {
          displayName: user.displayName,
          photoURL: user.photoURL,
          uid: user.uid,
          email: user.email, // helpful for identification
          lastSeen: serverTimestamp(),
      }, { merge: true }); // Use merge: true to update existing fields without overwriting everything

      navigate('/dashboard/public'); // Navigate to the dashboard after successful sign-in
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
        className={buttonClass}
        onClick={signInWithGoogle}
        disabled={loading}
      >
        {loading ? 'Signing in…' : 'Sign in with Google'}
      </button>
      {error && <div className="text-red-600 mt-4 p-2 bg-red-100 rounded">{error}</div>}
    </div>
  );
}

function SignOut() {
  const navigate = useNavigate();
  const doSignOut = async () => {
    await signOut(auth);
    navigate('/');
  };

  return (
    auth.currentUser && (
      <button // prettier-ignore
        className="px-4 py-2 bg-red-500 text-white font-semibold rounded-lg shadow-md hover:bg-red-600 transition duration-300 text-sm" 
        onClick={doSignOut}
      >
        Sign out
      </button>
    )
  );
}

// --- Main Dashboard and Chat View Management ---

function MainDashboard() {
    const user = auth.currentUser;

    return ( // prettier-ignore
        <div className="flex h-[calc(100vh-110px)] overflow-hidden rounded-xl shadow-2xl bg-gray-800 border border-gray-700">
            {/* Sidebar for User List */}
            <div className="w-1/4 bg-gray-900 border-r border-gray-700 overflow-y-auto p-4 flex-shrink-0">
                <UserList currentUser={user} />
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col min-w-0">
                <Routes>
                    <Route
                        path="public"
                        element={<ChatRoom title="Public Chat" isDM={false} />}
                    />
                    <Route
                        path="dm/:recipientUid"
                        element={<DMRoom currentUser={user} />}
                    />
                    {/* Default redirect to public chat */}
                    <Route path="*" element={<Navigate to="public" replace />} />
                </Routes>
            </div>
        </div>
    );
}

// --- User List Component for DM Selection ---

function UserList({ currentUser }) {
    const navigate = useNavigate();
    
    // Query all users except the current user
    const usersRef = firestoreQuery(collection(firestore, 'users'), where('uid', '!=', currentUser.uid), orderBy('lastSeen', 'desc'));
    const [usersSnapshot] = useCollectionCustom(usersRef);

    const handleSelectDM = (user) => {
        // Navigate to the new DM route using the recipient's UID
        navigate(`/dashboard/dm/${user.uid}`);
    };

    const users = usersSnapshot?.docs.map(doc => doc.data()) || [];

    return (
        <div className="flex flex-col space-y-4">
            <h3 className="text-xl font-bold text-gray-300 border-b border-gray-700 pb-3 mb-2">Contacts</h3>
            
            <Link 
                to="/dashboard/public" 
                className="p-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-center font-semibold transition shadow-lg"
            >
                🌎 Public Chat
            </Link>

            <h4 className="text-lg font-semibold text-gray-400 pt-4 border-t border-gray-700 mt-2">Direct Messages</h4>

            {users.length === 0 && <p className="text-gray-500 italic mt-2 text-sm">Sign in with another user to see contacts here.</p>}

            {users.map((user) => (
                <div
                    key={user.uid}
                    className="flex items-center p-3 rounded-xl cursor-pointer hover:bg-gray-700 transition duration-150 border border-gray-700 bg-gray-800 shadow-md"
                    onClick={() => handleSelectDM(user)}
                >
                    <img
                        src={user.photoURL || 'https://placehold.co/40x40/cccccc/ffffff?text=U'}
                        alt={user.displayName}
                        className="w-10 h-10 rounded-full mr-4 object-cover border-2 border-blue-500"
                    />
                    <div className="flex flex-col min-w-0">
                        <span className="font-medium text-gray-200 truncate">{user.displayName || 'Anonymous'}</span>
                        <small className="text-blue-500 text-xs font-semibold">Start DM</small>
                    </div>
                </div>
            ))}
        </div>
    );
}

// --- Direct Message (DM) Component Wrapper ---

function DMRoom({ currentUser }) {
    const { recipientUid } = useParams();
    const [recipient, setRecipient] = useState(null);

    // 1. Fetch Recipient's data once
    useEffect(() => {
        const fetchRecipient = async () => {
            if (!recipientUid) return;
            try {
                const userDoc = await getDoc(doc(firestore, 'users', recipientUid));
                if (userDoc.exists()) {
                    setRecipient(userDoc.data());
                } else {
                    console.error("Recipient user not found.");
                    setRecipient(null);
                }
            } catch (error) {
                console.error("Error fetching recipient:", error);
            }
        };
        fetchRecipient();
    }, [recipientUid]);

    if (!recipient) {
        return <div className="p-8 text-center text-gray-400 text-lg font-medium">Loading private chat...</div>;
    }

    // 2. Determine the unique Chat ID
    const chatId = getChatId(currentUser.uid, recipient.uid);
    const chatTitle = `DM with ${recipient.displayName || 'Unknown User'}`;
    
    return (
        <ChatRoom 
            title={chatTitle} 
            isDM={true}
            chatId={chatId}
            recipient={recipient} // Pass recipient for display/future use
        />
    );
}

// --- Shared Chat Logic (Public & DM) ---

function ChatRoom({ title, isDM, chatId }) {
  const dummy = useRef();
  const user = auth.currentUser;
  
  // Set the correct messagesRef based on whether it's a DM or public chat
  let messagesRef;
  if (isDM) {
      messagesRef = collection(firestore, 'chats', chatId, 'messages');
  } else {
      messagesRef = collection(firestore, 'messages'); // Public Chat
  }
  
  const query = firestoreQuery(messagesRef, orderBy('createdAt'), limit(25));

  const [messagesSnapshot] = useCollectionCustom(query); // Use custom hook
  const [formValue, setFormValue] = useState('');
  const [sendError, setSendError] = useState(null);
  const [pendingMessages, setPendingMessages] = useState([]);


  // Auto-scroll to bottom whenever messages or pending messages change
  useEffect(() => {
    dummy.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesSnapshot, pendingMessages]);
  
  // Convert snapshot to array of messages
  const messages = messagesSnapshot?.docs.map(doc => doc.data()) || [];

  const sendMessage = async (e) => {
    e.preventDefault();

    setSendError(null);
    if (!formValue || !formValue.trim() || !user) return;
    
    // FIX: Define all variables *before* creating the pending message object.
    const { uid, photoURL } = user; 
    const textToSend = formValue.trim();

    const tempId = `temp-${Date.now()}-${Math.floor(Math.random()*100000)}`;
    const pending = {
      id: tempId,
      text: textToSend,
      uid,
      photoURL,
      createdAt: new Date(),
      status: 'sending',
    };

    // Optimistic UI: create a pending message immediately
    setPendingMessages((p) => [...p, pending]);
    // clear input and scroll immediately to show instant feedback
    setFormValue('');
    dummy.current?.scrollIntoView({ behavior: 'smooth' });

    // perform the write in background with retries
    const trySend = async (attempt = 1) => {
      try {
        const docData = {
          text: textToSend,
          createdAt: serverTimestamp(),
          uid: uid,
          photoURL: photoURL, // Pass the correct photoURL
          // chatId is needed for security rules validation on the server side (for DMs)
          ...(isDM ? { chatId: chatId } : {}), 
        };

        await addDoc(messagesRef, docData);
      } catch (err) {
        console.error('Failed to send message attempt', attempt, err);
        if (attempt < 2) {
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
    // For simplicity, we remove the failed message and let the user try again manually.
    setPendingMessages((p) => p.filter((m) => m.id !== tempId));
    setSendError("Please re-type and try sending the message again.");
  };


  // Filter server messages to avoid duplication with pending messages (simplified)
  const serverMessages = messagesSnapshot ? messagesSnapshot.docs.map(doc => ({...doc.data(), id: doc.id})) : [];

  // When a new message from the server matches a pending one, remove the pending one.
  useEffect(() => {
    if (!messagesSnapshot) return;
    setPendingMessages(currentPending => {
      return currentPending.filter(pm => 
        !serverMessages.some(sm => sm.uid === pm.uid && sm.text === pm.text)
      );
    });
  }, [messagesSnapshot, serverMessages]);

  const displayMessages = serverMessages.map(msg => <ChatMessage key={msg.id} message={msg} />);

  return (
    <div className="chat-room flex flex-col h-full bg-gray-800 text-white">
      <h2 className="text-xl font-bold p-4 bg-gray-900 border-b border-gray-700 text-blue-300 shadow-md">{title}</h2>
      
      {/* Messages Display Area */}
      <div className="messages flex-1 overflow-y-auto p-6 space-y-5" aria-live="polite">
        {displayMessages}
        {/* pending/local messages shown after server-backed messages */}
        {pendingMessages.map((pm) => (
          <ChatMessage
            key={pm.id}
            message={pm}
            isPending={true}
            retry={() => retryPending(pm.id)}
          />
        ))}
        <div ref={dummy} className="h-4" /> {/* Spacer for auto-scroll target */}
      </div>

      {/* Input Form */ }
      <form className="chat-form flex p-4 border-t border-gray-700 bg-gray-900" onSubmit={sendMessage}>
        <input
          type="text"
          value={formValue}
          onChange={(e) => setFormValue(e.target.value)}
          placeholder={isDM ? `Send a message to ${title.split(' with ')[1]}` : "Say something nice in public"}
          aria-label="Message"
          className="flex-1 p-3 border border-gray-600 bg-gray-700 text-white rounded-l-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition shadow-inner"
        />
        <button // prettier-ignore
          type="submit" 
          disabled={!formValue.trim()}
          className="px-6 py-3 bg-blue-600 text-white font-bold rounded-r-xl disabled:bg-blue-400 transition duration-150 hover:bg-blue-700 shadow-lg"
        >
          Send
        </button>
      </form>
      { sendError && (
        <div className="text-red-600 p-2 text-sm bg-red-100 rounded-b-xl" role="alert">
          Error sending message: {sendError}
        </div>
      )}
    </div>
  );
}

// --- Message Display Component ---

function ChatMessage(props) {
  const { text, uid, photoURL, status } = props.message;
  
  if (!auth.currentUser) return null; 
  
  const messageClass = uid === auth.currentUser.uid ? 'sent' : 'received';
  const isSent = messageClass === 'sent';

  // show a small timestamp if available
  // FIX: Handle both Firestore Timestamps (from server) and JS Dates (from optimistic UI)
  let ts = null;
  if (props.message.createdAt) {
    // Firestore Timestamps have a toDate() method, JS Dates do not.
    ts = props.message.createdAt.toDate ? props.message.createdAt.toDate() : props.message.createdAt;
  }
  
  return (
    <div className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}>
      {!isSent && (
        <img 
          src={photoURL || 'https://placehold.co/36x36/cccccc/ffffff?text=U'} 
          alt="User avatar" 
          className="w-9 h-9 rounded-full mr-4 object-cover shadow-lg"
        />
      )}
      <div className={`max-w-xs md:max-w-md px-4 py-3 rounded-2xl shadow-lg transition duration-200 
          ${isSent ? 'bg-blue-600 text-white rounded-br-lg' : 'bg-gray-700 text-gray-200 rounded-bl-lg'}
          ${props.isPending ? 'opacity-70' : ''}
      `}>
        <p className="whitespace-pre-wrap">{text}</p>
        
        {/* Timestamp */}
        {(ts && typeof ts.toLocaleTimeString === 'function') ? (
          <small className={`text-xs block mt-1 text-right ${isSent ? 'text-blue-200' : 'text-gray-400'}`}>
            {ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </small>
        ) : (
            // Pending status
            props.isPending && (
              <div className={`text-xs block mt-1 text-right ${status === 'failed' ? 'text-red-300' : 'text-gray-400'}`}>
                {status === 'sending' ? 'Sending…' : 'Failed'}
              </div>
            )
        )}
        
        {/* Failed Retry Button */}
        {props.isPending && status === 'failed' && (
          <button // prettier-ignore
              onClick={() => props.retry && props.retry()} 
              className="mt-2 px-2 py-0.5 bg-yellow-500 rounded text-xs text-white hover:bg-yellow-600 font-semibold"
          >
              Retry
          </button>
        )}
      </div>
      {isSent && (
         <img 
          src={photoURL || 'https://placehold.co/36x36/cccccc/ffffff?text=U'} 
          alt="Your avatar" 
          className="w-9 h-9 rounded-full ml-4 object-cover shadow-lg"
        />
      )}
    </div>
  );
}


// Mount the app when this file is loaded by Vite's index.html
const rootElement = document.getElementById('root');
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

export default App;
