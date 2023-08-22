import React, { useEffect, useRef, useState } from 'react';
import VideoPlayer from '../../Screens/VideoPlayer/VideoPlayer';
import { useSocketState } from '../../../Context/SocketProvider';



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

const CallPageComp_1 = () => {
    /* socket state */
    const { socket } = useSocketState();

    /* call states */
    const [isCaller, setIsCaller] = useState(true);
    const [isCallee, setIsCallee] = useState(false);
    const [status, setStatus] = useState('Make A Call');

    /* VIDEO REF */
    const myVideo = useRef();
    const remoteVideo = useRef();

    /* TEXT AREA REF TO UNDERSTAND WHATS GOING ON */
    const textAreaRef = useRef();
    const [candidates, setCandidates] = useState([]);



    /* STREAMS */
    const [myStream, setMyStream] = useState(null);
    const [isMyStreamLoading, setIsMyStreamLoading] = useState(false);
    const [remoteStream, setRemoteStream] = useState(null);
    const [isInCall, setIsIncall] = useState(false);

    /* OUR PEER CONNECTION OBJECT */
    const pc = useRef(new RTCPeerConnection(configStun_Turn));

    console.log(`[+]GET DERIVED`, { candidates });

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
            /* TO DO ONCE WE GET THE LOCAL STREAM WE HAVE TO ADD THIS TO OUR PEER OBJECT */
            /* ADD TO TRACK */
            localStream.getTracks().forEach(track => {
                _pc.addTrack(track, localStream);
            });
            return localStream;
        } catch (error) {
            setIsMyStreamLoading(false);
            console.log(`[+] GETUSERMEDIA :`, error.message);
            return null;
        }
    };

    /* get user media */
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
                console.log(`[+]ONICECANDIDATE :`);
                if (e.candidate) {
                    console.log(e.candidate);
                    /* ONCE WE HAVE THE ICE CANDIDATE */
                    socket.emit('candidate', { candidate: e.candidate });
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
                        setStatus('You are in call...');
                        setIsIncall(true);
                        break;
                    case 'completed':
                        console.log('[+]ICE checks completed and connection established!');
                        break;
                    case 'disconnected':
                        console.log('[+]Connection lost.');
                        remoteVideo.current.srcObject = null;
                        setStatus("Make A call");
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
    }, []);

    /* use effect dedicated for socket */
    useEffect(() => {
        /* INCOMING OFFER LISTENER */
        const incomingOfferListener = ({ sdp }) => {
            try {
                if (sdp.type === 'offer') {
                    setIsCaller(false);
                    setIsCallee(true);
                    setStatus('Incomming Call.....');
                }
                else if (sdp.type === 'answer') {
                    setIsCaller(true);
                    setIsCallee(false);
                }
                console.log(`[+]incoming offer....`);
                textAreaRef.current.value = JSON.stringify(sdp);
                console.log(`[+]setting remote description.....`);
                pc.current.setRemoteDescription(new RTCSessionDescription(sdp));
            } catch (error) {
                console.log(`[-]incomingOfferListener:`, error);
            }
        };
        socket.on('sdp', incomingOfferListener);
        /* HANDLE ICE CANDIDATES */
        const candidateListener = ({ candidate }) => {
            try {
                setCandidates((data) => [...data, candidate]);
                console.log(`[+] updating ice candidates`);
                /* will add the ice candidate and choose the suitable path for p2p communication*/
                pc.current.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (error) {
                console.log(`[+]candidateListener:`, error.message);
            }
        };
        socket.on('candidate', candidateListener);
        return () => {
            socket.off('sdp', incomingOfferListener);
            socket.off('candidate', candidateListener);
        };
    }, []);

    /* THIS useEffect WILL KEEP THE TRACK OF myStream state and make necessary updates based on it */
    useEffect(() => {
        if (myStream && myVideo.current) {
            myVideo.current.srcObject = myStream;
        }
    }, [myStream]);


    /* handle calling of the user */
    const handleCall = async (e) => {
        try {
            const constraints = {
                offerToReceiveAudio: 1,
                offerToReceiveVideo: 1,
            };
            setStatus('Calling.....');
            console.log(`[+] CREATING OFFER .....`); /* THIS WILL START TO CREATE SDP OFFER FOR OUR REMOTE PEER AND ALSO GATHER THE ICE CANDIDATE */
            const offer = await pc.current.createOffer(constraints);
            pc.current.setLocalDescription(offer);

            /* UPDATE THE TEXT AREA TO SEE IF THE OFFER HAS BEEN CREATED */
            textAreaRef.current.value = JSON.stringify(offer);

            /* NOW WE SEND THIS OFFER TO OUR REMOTE USER */
            console.log(`[+] SENDING OFFER ......`);
            socket.emit('sdp', { sdp: offer });
        } catch (error) {
            console.log(`[-]handleCall`, error.message);
        }
    };


    /* handle answer */
    const handleAnswerCall = async (e) => {
        try {
            const constraints = {
                offerToReceiveAudio: 1,
                offerToReceiveVideo: 1,
            };
            console.log(`[+] Creating answer.......`);
            const answer = await pc.current.createAnswer(constraints);
            textAreaRef.current.value = JSON.stringify(answer);
            pc.current.setLocalDescription(answer);
            console.log('[+] sending answer');
            socket.emit('sdp', { sdp: answer });
        } catch (error) {
            console.log(`[-]handleAnswer`, error.message);
        }
    };
    return (
        <div>
            {/* Video Section */}
            <VideoPlayer myVideo={myVideo} remoteVideo={remoteVideo} isMyStreamLoading={isMyStreamLoading} />
            {/* button group */}
            <div>
                <div>
                    {isCaller && !isInCall && <button onClick={handleCall} > Call </button>}
                    {isCallee && !isInCall && <button onClick={handleAnswerCall} style={{ marginLeft: '5px' }}>Answer </button>}
                    {isInCall && <button>Hang up</button>}
                </div>
                {/* text area */}
                <div>
                    <h4>{status}</h4>
                    <textarea ref={textAreaRef} cols={100} rows={10} />
                </div>
            </div>
        </div>

    );
};

export default CallPageComp_1;