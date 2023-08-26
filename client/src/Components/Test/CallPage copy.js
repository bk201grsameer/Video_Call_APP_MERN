
import React, { useEffect, useRef, useState } from 'react';
import { useSocketState } from '../../../Context/SocketProvider';
import Notification from '../Notification/Notification';
import { useNotificationGlobalState } from '../../../Context/NotificationProvider';
import { useNavigate } from 'react-router-dom';

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
                        socket.emit('hangup');
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
                return setNotification({
                    title: 'Notification',
                    message: message + 'try again later',
                    color: 'green',
                    handler: clearNotification
                });
            } catch (error) {
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
        <div >
            {/* CREDENTIAL SECTION */}
            <div>
                {/* NAME INPUT */}
                <div>
                    <label htmlFor='name'> Name : </label>
                    <input id='name' type='text' value={name} onChange={handle_Name_Change} />
                </div>
                {/* PHONE NUMBER INPUT */}
                <div>
                    <label htmlFor='phonenumber'> Phone Number : </label>
                    <input id='phonenumber' type='text' value={remotePhoneNumber} onChange={handle_Phone_Number_Change} />
                </div>
                {/* Call */}
                {isCaller && !isInCall && <div>
                    <button onClick={callUser}>
                        Call
                    </button>
                </div>}
                {/* Answer */}
                {isCallee && !isInCall && <div>
                    <button onClick={AnswerCall}>
                        Answer
                    </button>
                </div>}
                {isInCall && <div><button onClick={handleHangUp}>Hang up</button></div>}
                {/* NOTIFICATION SECTION */}
                {notification && <Notification notification={notification} />}
            </div>
            <h3>{status}</h3>
            <div>
                <h3>Name: {userName} </h3>
                <h3>My Number : {myNumber} </h3>
            </div>
            {/* VIDEO PLAYER */}
            <div style={{ padding: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                {/* MYVIDEO */}
                <div>
                    <div>
                        <h3>MyVideo</h3>
                    </div>
                    <div >
                        <div style={{ position: 'relative' }}>
                            <video autoPlay ref={myVideo}
                                style={{ backgroundColor: 'black', height: '250px', width: '250px' }}
                            />
                            {isMyStreamLoading && <h3 style={{ color: 'white', position: 'absolute', left: 80, top: 90 }}>Loading...</h3>}
                        </div>
                    </div>
                </div>

                {/* Remote Video */}
                <div>
                    <div>
                        <h3>Remote Video</h3>
                    </div>
                    <div style={{ position: 'relative' }}>
                        <div style={{ position: 'relative' }}>
                            <video autoPlay ref={remoteVideo}
                                style={{ backgroundColor: 'black', height: '250px', width: '250px' }}
                            />
                            {/* <h3 style={{ color: 'red', position: 'relative', left: '50%' }}>Loading...</h3> */}
                        </div>
                    </div>
                </div>
                {/* PHONE NUMBERS */}
                <div>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <div>
                            <h3>Phone Numbers </h3>
                        </div>
                        <div style={{ height: '20px', width: '20px', backgroundColor: 'green', marginLeft: '10px', borderRadius: '10px' }}></div>
                    </div>
                    <div style={{ height: '250px', width: '450px', border: '2px solid green', overflow: 'auto' }}>
                        {users.map((user) => {
                            return myNumber !== user.phonenumber && (<div
                                key={user.phonenumber}
                                style={{ padding: '5px' }}
                            >
                                <div style={{ padding: '5px', border: '1px solid black', marginTop: '2px', marginBottom: '2px', cursor: 'pointer' }}
                                    onClick={(e) => { setName(user.name); setRemotePhoneNumber(user.phonenumber); setRemoteNumber(user.phonenumber); }}>
                                    <div>Name : <span>{user.name}</span></div>
                                    <div>PhoneNumber : <span>{user.phonenumber}</span></div>
                                </div>
                            </div>);
                        })}
                    </div>
                </div>
            </div>
            <div>
                <textarea ref={textAreaRef} rows={10} cols={150} />
            </div>
        </div >
    );
};

export default CallPage;