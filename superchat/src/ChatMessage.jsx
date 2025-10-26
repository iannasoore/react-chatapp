import React from 'react';
import { auth } from '../firebase.js';

function ChatMessage(props) {
  const { text, uid, photoURL, status } = props.message;
  
  if (!auth.currentUser) return null; 
  
  const messageClass = uid === auth.currentUser.uid ? 'sent' : 'received';
  const isSent = messageClass === 'sent';

  let ts = null;
  if (props.message.createdAt) {
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
        
        {(ts && typeof ts.toLocaleTimeString === 'function') ? (
          <small className={`text-xs block mt-1 text-right ${isSent ? 'text-blue-200' : 'text-gray-400'}`}>
            {ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </small>
        ) : (
            props.isPending && (
              <div className={`text-xs block mt-1 text-right ${status === 'failed' ? 'text-red-300' : 'text-gray-400'}`}>
                {status === 'sending' ? 'Sending…' : 'Failed'}
              </div>
            )
        )}
        
        {props.isPending && status === 'failed' && (
          <button
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

export default ChatMessage;