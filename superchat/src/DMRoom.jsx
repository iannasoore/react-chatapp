import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from './firebase.js';
import ChatRoom from './ChatRoom.jsx';

// Utility function to generate a consistent chat ID between two users
function getChatId(uid1, uid2) {
    const sortedUids = [uid1, uid2].sort();
    return sortedUids.join('_');
}

function DMRoom({ currentUser }) {
    const { recipientUid } = useParams();
    const [recipient, setRecipient] = useState(null);

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

    const chatId = getChatId(currentUser.uid, recipient.uid);
    const chatTitle = `DM with ${recipient.displayName || 'Unknown User'}`;
    
    return <ChatRoom title={chatTitle} isDM={true} chatId={chatId} recipient={recipient} />;
}

export default DMRoom;