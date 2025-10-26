import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, query as firestoreQuery, where, orderBy } from 'firebase/firestore';

import { firestore } from '../firebase';
import { useCollectionCustom } from '../hooks';

function UserList({ currentUser }) {
    const navigate = useNavigate();
    
    const usersRef = firestoreQuery(collection(firestore, 'users'), where('uid', '!=', currentUser.uid), orderBy('uid'), orderBy('lastSeen', 'desc'));
    const [usersSnapshot] = useCollectionCustom(usersRef);

    const handleSelectDM = (user) => {
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
                <div key={user.uid} className="flex items-center p-3 rounded-xl cursor-pointer hover:bg-gray-700 transition duration-150 border border-gray-700 bg-gray-800 shadow-md" onClick={() => handleSelectDM(user)}>
                    <img src={user.photoURL || 'https://placehold.co/40x40/cccccc/ffffff?text=U'} alt={user.displayName} className="w-10 h-10 rounded-full mr-4 object-cover border-2 border-blue-500" />
                    <div className="flex flex-col min-w-0">
                        <span className="font-medium text-gray-200 truncate">{user.displayName || 'Anonymous'}</span>
                        <small className="text-blue-500 text-xs font-semibold">Start DM</small>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default UserList;