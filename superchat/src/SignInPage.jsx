import React from 'react';

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

export default SignInPage;