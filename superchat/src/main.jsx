import React, { useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './App.css';

import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import 'firebase/compat/auth';

import { useAuthState } from 'react-firebase-hooks/auth';
import { useCollection } from 'react-firebase-hooks/firestore';


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


function App() {
  const [user] = useAuthState(auth);

  return (
    <div className="App">
      <header className="App-header">
        <h1 className='bg-red-200 text-red-950 p-2 rounded-md'> SuperChat</h1>
        <SignOut />
      </header>

      <section>
        {user ? <ChatRoom /> : <SignIn />}
      </section>
    </div>
  );
}

function SignIn() {
  const signInWithGoogle = () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider);
  };

  return (
    <button className="sign-in" onClick={signInWithGoogle}>
      Sign in with Google
    </button>
  );
}

function SignOut() {
  return (
    auth.currentUser && (
      <button className="sign-out" onClick={() => auth.signOut()}>
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

  const sendMessage = async (e) => {
    e.preventDefault();

    const { uid, photoURL } = auth.currentUser;
    await messagesRef.add({
      text: formValue,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      uid,
      photoURL,
    });

    setFormValue('');
    dummy.current && dummy.current.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <main>
        {messages &&
          messages.docs.map((doc) => (
            <ChatMessage key={doc.id} message={doc.data()} />
          ))}
        <div ref={dummy}></div>
      </main>

      <form onSubmit={sendMessage}>
        <input
          value={formValue}
          onChange={(e) => setFormValue(e.target.value)}
          placeholder="Say something nice"
        />
        <button type="submit">Send</button>
      </form>
    </>
  );
}

function ChatMessage(props) {
  const { text, uid, photoURL } = props.message;
  const messageClass = uid === auth.currentUser.uid ? 'sent' : 'received';

  return (
    <div className={`message ${messageClass}`}>
      <img src={photoURL} alt="avatar" />
      <p>{text}</p>
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
