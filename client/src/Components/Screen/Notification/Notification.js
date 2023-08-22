import React from 'react';

const Notification = ({ notification }) => {
    return (
        <>
            <div>
                <h3>{notification.title}</h3>
            </div>
            <div style={
                {
                    display: 'flex',
                    // justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '5px'
                }}
            >
                <div style={{ color: notification.color }}>
                    {notification.message}
                </div>
                <div style={{ marginLeft: '10px' }}>
                    <button onClick={notification.handler}>
                        x
                    </button>
                </div>
            </div>
        </>
    );
};

export default Notification;