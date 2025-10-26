import React, { useRef, useState, useEffect } from 'react';
import { collection, query as firestoreQuery, orderBy, limit, serverTimestamp, addDoc } from 'firebase/firestore';

import { auth, firestore } from './firebase.js';
import { useCollectionCustom } from './hooks.js';
import ChatMessage from './ChatMessage.jsx';

function ChatRoom({ title, isDM, chatId }) {
  const dummy = useRef();
  const user = auth.currentUser;

  let messagesRef;
  if (isDM) {
      messagesRef = collection(firestore, 'chats', chatId, 'messages');
  } else {
      messagesRef = collection(firestore, 'messages');
  }
  
  const query = firestoreQuery(messagesRef, orderBy('createdAt'), limit(25));

  const [messagesSnapshot] = useCollectionCustom(query);
  const [formValue, setFormValue] = useState('');
  const [sendError, setSendError] = useState(null);
  const [pendingMessages, setPendingMessages] = useState([]);

  useEffect(() => {
    dummy.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesSnapshot, pendingMessages]);
  
  const sendMessage = async (e) => {
    e.preventDefault();
    setSendError(null);
    if (!formValue || !formValue.trim() || !user) return;
    
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

    setPendingMessages((p) => [...p, pending]);
    setFormValue('');
    dummy.current?.scrollIntoView({ behavior: 'smooth' });

    const trySend = async (attempt = 1) => {
      try {
        const docData = {
          text: textToSend,
          createdAt: serverTimestamp(),
          uid: uid,
          photoURL: photoURL,
          ...(isDM ? { chatId: chatId } : {}), 
        };
        await addDoc(messagesRef, docData);
      } catch (err) {
        console.error('Failed to send message attempt', attempt, err);
        if (attempt < 2) {
          setTimeout(() => trySend(attempt + 1), 500 * attempt);
        } else {
          setPendingMessages((p) => p.map((m) => (m.id === tempId ? { ...m, status: 'failed', error: err?.message || JSON.stringify(err) } : m)));
          setSendError(err?.message || JSON.stringify(err));
        }
      }
    };

    trySend();
  };

  const retryPending = (tempId) => {
    setPendingMessages((p) => p.filter((m) => m.id !== tempId));
    setSendError("Please re-type and try sending the message again.");
  };

  const serverMessages = messagesSnapshot ? messagesSnapshot.docs.map(doc => ({...doc.data(), id: doc.id})) : [];

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
      
      <div className="messages flex-1 overflow-y-auto p-6 space-y-5" aria-live="polite">
        {displayMessages}
        {pendingMessages.map((pm) => (
          <ChatMessage
            key={pm.id}
            message={pm}
            isPending={true}
            retry={() => retryPending(pm.id)}
          />
        ))}
        <div ref={dummy} className="h-4" />
      </div>

      <form className="chat-form flex p-4 border-t border-gray-700 bg-gray-900" onSubmit={sendMessage}>
        <input
          type="text"
          value={formValue}
          onChange={(e) => setFormValue(e.target.value)}
          placeholder={isDM ? `Send a message to ${title.split(' with ')[1]}` : "Say something nice in public"}
          aria-label="Message"
          className="flex-1 p-3 border border-gray-600 bg-gray-700 text-white rounded-l-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition shadow-inner"
        />
        <button
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

export default ChatRoom;