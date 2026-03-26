import React from 'react';

const MyKapLogo: React.FC = () => {
    return (
        <div className="flex items-end space-x-1 text-blue-800">
            <span className="text-4xl font-bold leading-none">MyKap</span>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mb-1">
                <path d="M3 9.5L12 4L21 9.5V18.5C21 19.0523 20.5523 19.5 20 19.5H4C3.44772 19.5 3 19.0523 3 18.5V9.5Z" stroke="#064491" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9 19.5V13.5C9 12.9477 9.44772 12.5 10 12.5H14C14.5523 12.5 15 12.9477 15 13.5V19.5" stroke="#064491" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
        </div>
    );
};

export default MyKapLogo;
