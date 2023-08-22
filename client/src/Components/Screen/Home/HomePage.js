// HomePage.js
import React, { useState } from 'react';
import FormInput from '../../Reusables/FormInput';
import ButtonFunction from '../../Reusables/ButtonFunction';
import { useNotificationGlobalState } from '../../../Context/NotificationProvider';
import Notification from '../Notification/Notification';
import { useSocketState } from '../../../Context/SocketProvider';
import { useNavigate } from 'react-router-dom';

const HomePage = () => {
    const { notification, setNotification, clearNotification } = useNotificationGlobalState();
    const { socket, setUserName } = useSocketState();
    const navigate = useNavigate();
    const [name, setName] = useState('');


    const handle_Name_Change = (e) => {
        setName(e.target.value);
    };


    const handle_Go_To_Call_page = () => {
        try {
            if (!name)
                throw new Error("Name field required");
            console.log({ name });
            setUserName(name);
            socket.emit('user:joined', { name });
            navigate('/callpage');
        } catch (error) {
            setNotification({
                title: 'Notification',
                color: 'red',
                message: error.message,
                handler: clearNotification
            });
        }
    };

    return (
        <div>
            <FormInput labl={"Enter Your Name : "} id={'name'} value={name} handler={handle_Name_Change} />
            <div>
                <ButtonFunction name={'OK'} handler={handle_Go_To_Call_page} />
            </div>
            {notification && <Notification notification={notification} />}
        </div>
    );
};

export default HomePage;
