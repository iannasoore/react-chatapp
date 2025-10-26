import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { auth } from './firebase.js';

import UserList from './UserList.jsx';
import ChatRoom from './ChatRoom.jsx';
import DMRoom from './DMRoom.jsx';

function MainDashboard() {
    const user = auth.currentUser;

    return (
        <div className="flex h-[calc(100vh-110px)] overflow-hidden rounded-xl shadow-2xl bg-gray-800 border border-gray-700">
            <div className="w-1/4 bg-gray-900 border-r border-gray-700 overflow-y-auto p-4 flex-shrink-0">
                <UserList currentUser={user} />
            </div>

            <div className="flex-1 flex flex-col min-w-0">
                <Routes>
                    <Route
                        path="public"
                        element={<ChatRoom title="Public Chat" isDM={false} />}
                    />
                    <Route
                        path="dm/:recipientUid"
                        element={<DMRoom />}
                    />
                    <Route path="*" element={<Navigate to="public" replace />} />
                </Routes>
            </div>
        </div>
    );
}

export default MainDashboard;