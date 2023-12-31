import React, { useEffect, useRef, useState } from 'react';
import { useSocketState } from '../../../Context/SocketProvider';
import Notification from '../Notification/Notification';
import { useNotificationGlobalState } from '../../../Context/NotificationProvider';
import { useNavigate } from 'react-router-dom';
import './CallPage.css';
const configStun_Turn = {
    iceServers: [
        {
            urls: [
                "stun:stun.l.google.com:19302",
                "stun:global.stun.twilio.com:3478",
            ],
        },
    ],
};


const CallPage = () => {
    /* SOCKET && NOTIFICATION STATE */
    const { socket, myNumber, userName } = useSocketState();
    /* OUR PEER CONNECTION OBJECT */
    const pc = useRef(new RTCPeerConnection(configStun_Turn));

    const navigate = useNavigate();


    /* CREDENTIAL STATES */
    const [name, setName] = useState('');
    const [remoteNumber, setRemoteNumber] = useState('');
    const [remotePhoneNumber, setRemotePhoneNumber] = useState('');
    const [users, setUsers] = useState([]);

    /*  */
    const [isCaller, setIsCaller] = useState(true);
    const [isCallee, setIsCallee] = useState(false);
    const [status, setStatus] = useState('Make A Call');
    const [isInCall, setIsIncall] = useState(false);
    const [isCallEnded, setIsCallEnded] = useState(false);
    /* STREAM STATES */
    const [myStream, setMyStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [isMyStreamLoading, setIsMyStreamLoading] = useState(false);

    /* ICE CANDIDATES */
    const [candidates, setCandidates] = useState([]);
    const [candi, setCandi] = useState('');

    /* REFS */
    const myVideo = useRef();
    const remoteVideo = useRef();
    const textAreaRef = useRef();
    /* ERROR STATE */
    const { notification, setNotification, clearNotification, inserNotification } = useNotificationGlobalState();
    console.log({ pc: pc.current, candidates });


    useEffect(() => {
        if (isInCall == true) {
            socket.emit('incall', { peer1: myNumber, peer2: remoteNumber });
        }
    }, [isInCall]);

    /* USE EFFECT THAT WILL KEEP THE TRACK OF USERNAME */
    useEffect(() => {
        if (!userName)
            return navigate('/');
    }, [userName]);

    useEffect(() => {
        socket.emit('candidate', { candidate: candi, phonenumber: remoteNumber });
    }, [candi]);
    /* HANDLE PEER CONNECTION */
    useEffect(() => {

        /* CREATE A PEER CONNECTION */
        const _pc = new RTCPeerConnection(configStun_Turn);
        getUserMedia(_pc);

        /*Listen for the icegatheringstatechange event */
        _pc.onicegatheringstatechange = () => {
            if (_pc.iceGatheringState === 'gathering') {
                console.log('[+] ICE candidate gathering has started');
                /* You can perform any actions or fire custom events here */
            }
        };

        /* WHEN WE HAVE THE ICE CANDIDATES */
        _pc.onicecandidate = (e) => {
            try {
                console.log(`[+]ONICECANDIDATE :`, remoteNumber);
                if (e.candidate) {
                    console.log(e.candidate);
                    /* ONCE WE HAVE THE ICE CANDIDATE */
                    // socket.emit('candidate', { candidate: e.candidate });
                    setCandi(e.candidate);
                }
            } catch (error) {
                console.log(`[-]onicecandidate:`, error.message);
            }
        };

        /* Listen for the iceconnectionstatechange event */
        _pc.oniceconnectionstatechange = (e) => {
            try {
                console.log('ICE connection state changed:', _pc.iceConnectionState);
                console.log(`[+]oniceconnectionstatechange....`);
                console.log(e);
                switch (_pc.iceConnectionState) {
                    case 'connected':
                        console.log('[+]Connection established!');
                        setStatus(`In call `);
                        setIsIncall(true);
                        break;
                    case 'completed':
                        console.log('[+]ICE checks completed and connection established!');
                        break;
                    case 'disconnected':
                        console.log('[+] Connection lost.');
                        remoteVideo.current.srcObject = null;
                        setStatus('Make a Call Again...');
                        setIsIncall(false);
                        setIsCaller(true);
                        setIsCallee(false);
                        socket.emit('hangup', { phonenumber: remoteNumber });
                        break;
                    case 'failed':
                        console.log('[+]ICE connection failed.');
                        break;
                    case 'closed':
                        console.log('[+]Connection closed.');
                        break;
                    default:
                        break;
                }
            } catch (error) {
                console.log(`[+] oniceconnectionStatechange:`, error.message);
            }
        };

        /* WILL KEEP THE TRACK OF THE REMOTE PEER STREAM */
        _pc.ontrack = (e) => {
            /* remote peer */
            const track = e.track;
            const rmstrm = e.streams[0];
            console.log(`[+] Remote Peer stream.....`, track, rmstrm);
            /* UPDATE THE REMOTE STREAM */
            setRemoteStream(rmstrm);
            remoteVideo.current.srcObject = e.streams[0];
        };

        // Listen for the onnegotiationneeded event
        _pc.onnegotiationneeded = async () => {
            try {
                console.log('Negotiation needed event fired...');
                // Create an offer to update the connection's configuration

                // Set the local description to the offer

                // Send the offer to the remote peer using your signaling mechanism

            } catch (error) {
                console.error('Error in onnegotiationneeded:', error);
            }
        };

        pc.current = _pc;
        return () => {
            // Cleanup function to detach event listeners
            return () => {
                _pc.onicegatheringstatechange = null;
                _pc.onicecandidate = null;
                _pc.oniceconnectionstatechange = null;
                _pc.ontrack = null;
                _pc.onnegotiationneeded = null;

                // Close the peer connection if needed
                _pc.close();
            };
        };
    }, []);


    /* USEEFFECT TO HANDLE SOCKET EVENTS */
    useEffect(() => {
        /* USER JOINED */
        const user_Joined_Listener = async ({ users }) => setUsers(users);
        socket.on("user:joined", user_Joined_Listener);

        /* USER LEFT EVENT */
        const user_Left_Listener = async ({ users }) => setUsers(users);
        socket.on('user:left', user_Left_Listener);

        /* INCOMING OFFER SDP */
        const incoming_Offer_Sdp_Listener = async ({ sdp, from, Caller }) => {
            try {
                console.log(`[+] Incoming Offer from ${Caller} - ${from} ......`);
                /* WE UPDATE OUR PEER 2 WITH INCOMING OFFER */
                setRemoteNumber(from);
                setRemotePhoneNumber(from);
                setName(Caller);
                setIsCaller(false);
                setIsCallee(true);
                setStatus(`Incoming call from ${Caller}.....`);
                textAreaRef.current.value = JSON.stringify(sdp);
                console.log(`[+] SETTING REMOTE DESCRIPTION .....`);
                pc.current.setRemoteDescription(new RTCSessionDescription(sdp));
            } catch (error) {
                console.log(`[-] Error :`, error.message);
                setIsCaller(true);
                setIsCallee(false);
                return setNotification({

                });
            }
        };
        socket.on('sdp:offer', incoming_Offer_Sdp_Listener);
        /* INCOMING ANSWER */
        const incoming_Answer_Listener = async ({ sdp, from, Callee }) => {
            try {
                console.log(`[+] Incoming Answer from ${from}-${Callee}`);
                setIsCaller(true);
                setIsCallee(false);
                textAreaRef.current.value = JSON.stringify(sdp);
                console.log(`[+] SETTING REMOTE DESCRIPTION .....`);
                pc.current.setRemoteDescription(new RTCSessionDescription(sdp));
            } catch (error) {
                setIsCaller(true);
                setIsCallee(false);
                return setNotification({
                    title: 'Notification',
                    message: error.message,
                    color: 'red',
                    handler: clearNotification
                });
            }
        };
        socket.on('sdp:answer', incoming_Answer_Listener);


        /* INCOMING CANDIDATE */
        const candidateListener = async ({ candidate, from }) => {
            try {
                setCandidates((data) => [...data, candidate]);
                if (pc.current)
                    pc.current.addIceCandidate(new RTCIceCandidate(candidate));
                else
                    console.log(`addice null...`);
            } catch (error) {
                return setNotification({
                    title: 'Notification',
                    message: error.message,
                    color: 'red',
                    handler: clearNotification
                });
            }
        };
        socket.on('candidate', candidateListener);

        /* incall */
        socket.on('alreadyincall', ({ message }) => {
            try {
                setStatus("Make A Call Again");
                return setNotification({
                    title: 'Notification',
                    message: message + 'try again later',
                    color: 'green',
                    handler: clearNotification
                });
            } catch (error) {
                setStatus("Make A Call Again");
                return setNotification({
                    title: 'Notification',
                    message: error.message,
                    color: 'red',
                    handler: clearNotification
                });
            }
        });

        /* hangup */
        const handle_hangup = async ({ from }) => {
            try {
                window.location.reload();
            } catch (error) {
                console.log(`[+] hanguperror`, error.message);
            }
        };
        socket.on('hangup', handle_hangup);
        return () => {
            socket.off("user:joined", user_Joined_Listener);
            socket.off('user:left', user_Left_Listener);
            socket.off('sdp:offer', incoming_Offer_Sdp_Listener);
            socket.off('sdp:answer', incoming_Answer_Listener);
            socket.off('candidate', candidateListener);
            socket.off('hangup', handleHangUp);
        };
    }, []);

    useEffect(() => {
        if (myStream && myVideo.current)
            myVideo.current.srcObject = myStream;
    }, [myStream]);


    /* HANDLE NAME CHANGE */
    const handle_Name_Change = async (e) => {
        setName(e.target.value);
    };
    /* HANDLE PHONE NUMBER CHANGE */
    const handle_Phone_Number_Change = async (e) => {
        setRemotePhoneNumber(e.target.value);
    };




    /* GET USER MEDIA */
    const getUserMedia = async (_pc) => {
        if (myStream)
            return;
        try {
            const constraints = {
                audio: false,
                video: true
            };
            setIsMyStreamLoading(true);
            const localStream = await navigator.mediaDevices.getUserMedia(constraints);
            setMyStream(localStream);
            setIsMyStreamLoading(false);
            /* ADD TO TRACK */
            localStream.getTracks().forEach(track => {
                _pc.addTrack(track, localStream);
            });
            return localStream;
        } catch (error) {
            setIsMyStreamLoading(false);
            console.log(`[+] GETUSERMEDIA :`, error.message);
            setNotification({
                title: 'Notification',
                message: error.message,
                color: 'red',
                handler: clearNotification
            });
            return null;
        }
    };


    /* HANDLE CALL */
    const callUser = async (e) => {
        try {
            if (!name || !remotePhoneNumber)
                throw new Error("ALL FIEDS REQUIRED");
            setRemoteNumber(remotePhoneNumber);
            console.log({ name, remoteNumber });
            /* create offer */
            const constraints = {
                offerToReceiveAudio: 1,
                offerToReceiveVideo: 1,
            };

            setIsCaller(true);
            setStatus(`Calling ${remoteNumber}......`);
            console.log(`[+]CREATING OFFER....`);
            const offer = await pc.current.createOffer(constraints);
            console.log(`[+] SETTINGLOCAL DESCRIPTION `);
            pc.current.setLocalDescription(offer);
            /* test text area */
            textAreaRef.current.value = JSON.stringify(offer);
            /* NOW WE SEND THIS OFFER TO OUR REMOTE USER */
            console.log(`[+] SENDING OFFER ......`);
            socket.emit('sdp:offer', { sdp: offer, phonenumber: remoteNumber, name: userName });
        } catch (error) {
            return setNotification({
                title: 'Notification',
                message: error.message,
                color: 'red',
                handler: clearNotification
            });
        }
    };

    /* ANWER CALL */
    const AnswerCall = async (e) => {
        try {
            const constraints = {
                offerToReceiveAudio: 1,
                offerToReceiveVideo: 1,
            };
            setStatus('Accepting Call..');
            console.log(`[+] Creating answer.......`);
            const answer = await pc.current.createAnswer(constraints);
            textAreaRef.current.value = JSON.stringify(answer);
            pc.current.setLocalDescription(answer);
            console.log('[+] sending answer');
            socket.emit('sdp:answer', { sdp: answer, phonenumber: remoteNumber, name: userName });
        } catch (error) {
            console.log(`[-]handleAnswer`, error.message);
            return setNotification({
                title: 'Notification',
                message: error.message,
                color: 'red',
                handler: clearNotification
            });
        }
    };


    /* handle cloase */
    const handleHangUp = async () => {
        try {
            pc.current.close();
            socket.emit('hangup', { phonenumber: remoteNumber });
            window.location.reload();
        } catch (error) {
            console.log(`[-] Error handleHangUp:`, error.message);
        }
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh'
        }}>
            <div style={{ marginTop: '10px', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', backgroundColor: '#f5f5f5', borderRadius: '10px', boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.1)', width: '96.5%' }}>
                <h9 style={{ fontWeight: 'bold', fontSize: '20px' }}>Naruto Video Call App</h9>
            </div>
            {/* CREDENTIAL SECTION */}
            <div>
                <div style={{
                    marginTop: '10px', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', backgroundColor: '#f5f5f5', borderRadius: '10px', boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.1)'

                    // width: '500px'

                }}>
                    {/* NAME INPUT */}
                    <div style={{ marginBottom: '10px' }}>
                        {/* myInfo */}
                        <h3 style={{ position: 'relative', top: 20 }}> My INfo : </h3>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <p> Name :  <span style={{ fontWeight: 'bold', padding: '1px' }}>{userName}</span> </p>
                            <p style={{ marginLeft: '5px' }}> My Number : <span style={{ fontWeight: 'bold', }}>{myNumber}</span> </p>
                        </div>

                        <div>
                            <h3> Make A Call To :</h3>
                        </div>
                        <div style={{ alignItems: 'center', marginBottom: '5px', flexDirection: 'column' }}>
                            <div>
                                <label htmlFor='name' style={{ fontSize: '16px', fontWeight: 'bold', marginRight: '10px' }}>Name:</label>
                            </div>
                            <div>
                                <input id='name' type='text' value={name} onChange={handle_Name_Change} style={{ width: "100%", padding: '8px', borderRadius: '5px', border: '1px solid #ccc' }} />
                            </div>
                        </div>
                        {/* PHONE NUMBER INPUT */}
                        <div style={{ marginBottom: '15px' }}>
                            <div style={{ alignItems: 'center', marginBottom: '5px' }}>
                                <div>
                                    <label htmlFor='phonenumber' style={{ fontSize: '16px', fontWeight: 'bold', marginRight: '10px' }}>Phone Number:</label>
                                </div>
                                <div>
                                    <input id='phonenumber' type='text' value={remotePhoneNumber} onChange={handle_Phone_Number_Change} style={{ padding: '8px', borderRadius: '5px', border: '1px solid #ccc', width: "100%", }} />
                                </div>
                            </div>
                        </div>
                        {/* Call */}
                        {isCaller && !isInCall && <div style={{ marginBottom: '10px' }}>
                            <button onClick={callUser} style={{
                                padding: '10px 20px',
                                borderRadius: '5px',
                                background: '#007BFF',
                                color: 'white',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '16px',
                                fontWeight: 'bold',
                                transition: 'background 0.3s ease-in-out',
                            }}>
                                Call
                            </button>
                        </div>}
                        {/* Answer */}
                        {isCallee && !isInCall && <div style={{ marginBottom: '10px' }}>
                            <button onClick={AnswerCall}
                                style={{
                                    padding: '10px 20px',
                                    borderRadius: '5px',
                                    background: '#007BFF',
                                    color: 'white',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    transition: 'background 0.3s ease-in-out',
                                }}>
                                Answer
                            </button>
                        </div>}
                        {isInCall && <div><button onClick={handleHangUp} style={{
                            padding: '10px 20px',
                            borderRadius: '5px',
                            background: '#007BFF',
                            color: 'white',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            transition: 'background 0.3s ease-in-out',
                        }}>Hang up</button></div>}
                    </div>

                    {/* Status */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div>
                            <h3 className="status-text">{status}</h3>
                        </div>
                    </div>

                </div>
                {/* VIDEO PLAYER */}
                <div style=
                    {{ marginTop: '10px', padding: '20px', display: 'flex', alignItems: 'center', gap: '20px', backgroundColor: '#f5f5f5', borderRadius: '10px', boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.1)' }}>
                    {/* MYVIDEO */}
                    <div>
                        <div style={{ marginBottom: '10px' }}>
                            <h3>My Video</h3>
                        </div>
                        <div style={{ position: 'relative', backgroundColor: 'black', height: '250px', width: '250px', borderRadius: '10px', overflow: 'hidden' }}>
                            <video autoPlay ref={myVideo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            {isMyStreamLoading && <h3 style={{ color: 'white', position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}>Loading...</h3>}
                        </div>
                    </div>

                    {/* Remote Video */}
                    <div>
                        <div style={{ marginBottom: '10px' }}>
                            <h3>Remote Video</h3>
                        </div>
                        <div style={{ position: 'relative', backgroundColor: 'black', height: '250px', width: '250px', borderRadius: '10px', overflow: 'hidden' }}>
                            <video autoPlay ref={remoteVideo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            {/* Loading message if needed */}
                        </div>
                    </div>

                    {/* PHONE NUMBERS */}
                    <div>
                        <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center' }}>
                            <div>
                                <h3>Phone Numbers</h3>
                            </div>
                            <div style={{ height: '20px', width: '20px', backgroundColor: 'green', marginLeft: '10px', borderRadius: '10px' }}></div>
                        </div>
                        <div style={{ height: '250px', width: '450px', border: '2px solid white', overflow: 'auto' }}>
                            {users.map((user) => (
                                myNumber !== user.phonenumber && (
                                    <div key={user.phonenumber} style={{ padding: '10px', border: '1px solid #ddd', marginBottom: '5px', cursor: 'pointer', borderRadius: '5px', backgroundColor: '#fff' }}
                                        onClick={(e) => { setName(user.name); setRemotePhoneNumber(user.phonenumber); setRemoteNumber(user.phonenumber); }}>
                                        <div><strong>Name:</strong> {user.name}</div>
                                        <div><strong>PhoneNumber:</strong> {user.phonenumber}</div>
                                    </div>
                                )
                            ))}
                        </div>
                    </div>
                </div>

                {/* NOTIFICATION SECTION */}
                {notification && <Notification notification={notification} />}
            </div>


            <div>
                <textarea ref={textAreaRef} rows={10} cols={150} style={{ display: 'none' }} />
            </div>
        </div >
    );
};

export default CallPage;