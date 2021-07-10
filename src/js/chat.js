"use strict"; 

// set up firebase
const firebaseConfig = {
  apiKey: "AIzaSyBU4FO5YbU0wCi4DR2Dqbj7kCGeOMKNpyI",
  authDomain: "ms-teams-414ee.firebaseapp.com",
  databaseURL: "https://ms-teams-414ee-default-rtdb.firebaseio.com",
  projectId: "ms-teams-414ee",
  storageBucket: "ms-teams-414ee.appspot.com",
  messagingSenderId: "587982795894",
  appId: "1:587982795894:web:72322e5e8055d40e2b9b57",
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const firestore = firebase.firestore();

const isWebRTCSupported = DetectRTC.isWebRTCSupported;
const imgUrl = "https://eu.ui-avatars.com/api";

let background = "rgba(48, 48, 48)"; 
let port = 4000; // must be same of server 
let server = "http" + (location.hostname == "localhost" ? "" : "s") + "://" + location.hostname + (location.hostname == "localhost" ? ":" + port : "")
let roomId = location.pathname.substring(6);
let roomName;
let createdBy;

let connection;
let myName;
let socket; 

let connections = {}; 
let chatChannels = {};  
let iceServers = [{ urls: "stun:stun.l.google.com:19302" }]; 

let msgerDraggable;
let msgerHeader;
let msgerIBtn;
let msgerChat;
let msgerInput;
let msgerSendBtn;
let msgerI;
let msgerIHeader;
let msgerICloseBtn;
let msgerIList;
let leftChatImg;
let rightChatImg;
let users;
let participantsList;
let shareRoomBtn;
let joinCallBtn;
let leaveRoomBtn;

// get name and room name
// couldn't join - if room is not created 
auth.onAuthStateChanged(async (user) => {

  if (user) {
    await firestore.collection('users').doc(`${user.uid}`).get()
    .then((snapshot) => {
      //console.log(snapshot.data().username);
      myName = snapshot.data().username;
    });
    await firestore.collection('meetings').doc(`${roomId}`).get()
    .then(function(doc) {
      roomName = doc.data().roomName;
      createdBy = doc.data().createdBy;
    })
    .catch(function(err) {
      alert("couldn't join, room does not exist");
      window.location.href='/main';
    });
  } 
  else {
    window.location.href='/';
  }

});

function setElements() {
  users = getId("users");
  msgerDraggable = getId("msgerDraggable");
  msgerHeader = getId("msgerHeader");
  msgerIBtn = getId("msgerIBtn");
  msgerChat = getId("msgerChat");
  msgerInput = getId("msgerInput");
  msgerSendBtn = getId("msgerSendBtn");
  msgerI = getId("msgerI");
  msgerIHeader = getId("msgerIHeader");
  msgerICloseBtn = getId("msgerICloseBtn");
  msgerIList = getId("msgerIList");
  participantsList = getId("participantsList");
  shareRoomBtn = getId("shareRoomBtn");
  joinCallBtn = getId("joinCallBtn");
  leaveRoomBtn = getId("leaveRoomBtn");

  tippy(msgerIBtn, { content: "Individual messages", });
  tippy(shareRoomBtn, { content: "Invite people to join", placement: "right-start", });
  tippy(joinCallBtn, { content: "Join call", placement: "right-start", });
  tippy(leaveRoomBtn, { content: "Leave chat", placement: "right-start", });
}

// Check if there are peer connections
function thereAreConnections() {
  if (Object.keys(connections).length === 0) return false;
  return true;
}

// On body load Get started
function Chat() {

  if (!isWebRTCSupported) {
    alert("error: This browser does not support WebRTC");
    return;
  }

  console.log("Connecting to server");
  socket = io(server);
  
  // once access given, join the channel
  socket.on("connect", () => {
    console.log("Connected to server");
    getId("loadingDiv").style.display = "none";
    setElements();
    setChatRoom();
    setLeaveRoomBtn();
    setShareRoomBtn();
    setJoinCallBtn();
    start();
  });


  // server sends out 'add' signals to each pair of users in the channel 
  socket.on("add", (config) => {

    let peer_id = config.peer_id;
    let peers = config.peers;

    if (peer_id in connections) return;
    if (config.iceServers) iceServers = config.iceServers;

    connection = new RTCPeerConnection({ iceServers: iceServers });
    connections[peer_id] = connection;

    msgerAddPeers(peers);
    participantAddPeers(peers);

    connections[peer_id].onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ICE", { 
          peer_id: peer_id, 
          ice_candidate: { 
            sdpMLineIndex: event.candidate.sdpMLineIndex, 
            candidate: event.candidate.candidate, 
            address: event.candidate.address, 
          }, 
        });
      }   
    };

    // RTC Data Channel
    connections[peer_id].ondatachannel = (event) => {
      console.log("Datachannel event " + peer_id, event);
      event.channel.onmessage = (msg) => {
        switch (event.channel.label) {
          case "chat_channel":
            let message = {};
            try {
              message = JSON.parse(msg.data);
              ChatChannel(message);
            } 
            catch (err) {
              console.log(err);
            }
            break;
        }
      };
    };
    createChatChannel(peer_id);

    if (config.should_create_offer) {

      console.log("creating RTC offer to", peer_id);
      connections[peer_id].createOffer()
      .then((local_description) => {
        console.log("local offer description is", local_description);
        connections[peer_id].setLocalDescription(local_description)
          .then(() => {
            socket.emit("SDP", { peer_id: peer_id, session_description: local_description, });
            console.log("offer setLocalDescription done!");
          })
          .catch((err) => {
            console.error("error: offer setLocalDescription", err);
            alert("error: offer setLocalDescription failed " + err);
          });
        })
      .catch((err) => {
        console.error("error: sending offer", err);
      });
    }

  });

  
  socket.on("sessionDescription", (config) => {

    let peer_id = config.peer_id;
    let remote_description = config.session_description;
    let description = new RTCSessionDescription(remote_description);

    connections[peer_id].setRemoteDescription(description)
      .then(() => {
        console.log("setRemoteDescription done!");
        if (remote_description.type == "offer") {
          console.log("creating answer");
          connections[peer_id].createAnswer()
            .then((local_description) => {
              console.log("answer description is: ", local_description);
              connections[peer_id].setLocalDescription(local_description)
                .then(() => {
                  socket.emit("SDP", { peer_id: peer_id, session_description: local_description, });
                  console.log("answer setLocalDescription done!");
                })
                .catch((err) => {
                  console.error("error: answer setLocalDescription", err);
                  alert("error: answer setLocalDescription failed " + err);
                });
            })
            .catch((err) => {
              console.error("error: creating answer", err);
            });
        } 
      })
      .catch((err) => {
        console.error("error: setRemoteDescription", err);
      });
  });


  socket.on("iceCandidate", (config) => {

    let peer_id = config.peer_id;
    let ice_candidate = config.ice_candidate;
    connections[peer_id]
    .addIceCandidate(new RTCIceCandidate(ice_candidate))
    .catch((err) => {
      console.error("error: addIceCandidate", err);
      alert("error: addIceCandidate failed " + err);
    });
  });

  
  // remove all connections
  socket.on("disconnect", () => {

    console.log("Disconnected from server");
    for (let peer_id in connections) {
      connections[peer_id].close();
      msgerRemovePeer(peer_id);
      participantRemovePeer(peer_id);
    }
    chatChannels = {};
    connections = {};
  });

  
  // 'remove' signal is passed to all the users and the media channels open for that peer are deleted
  socket.on("remove", (config) => {

    console.log("Server said to remove peer:", config);
    let peer_id = config.peer_id;
    if (peer_id in connections) connections[peer_id].close();

    msgerRemovePeer(peer_id);
    participantRemovePeer(peer_id);

    delete chatChannels[peer_id];
    delete connections[peer_id];
  });

} // end Chat


function start() {

  let timerInterval;
  Swal.fire({ allowEscapeKey: false, allowEnterKey: false, allowOutsideClick: false, 
    background: background, position: "top", title: `Joining the Chat`, 
    timer: 5000, 
    didOpen: () => { Swal.showLoading(); timerInterval = setInterval(() => {
      setPeerChatImgName("right", myName);
    }, 100); },
    willClose: () => { clearInterval(timerInterval); }, 
  }).then(() => { 
    joinToChannel();
    welcomeMessage(); 
    // add my name to the participant list
    let ParticipantDiv = getId("participantDiv");
    if (!ParticipantDiv) {
      let my = myName + " (me)";
      let participantDiv = `
      <div id="participantDiv" class="participants-area">
        <p value="${myName}">&nbsp;${my}</p>
      </div>
      `;
      participantsList.insertAdjacentHTML("beforeend", participantDiv);
      participantsList.scrollTop += 500;
    }
    document.getElementById("meetingName").innerHTML = `${roomName}`;
    document.getElementById("createdBy").innerHTML = `- created by ${createdBy}`;
  });

}

// join to channel and send some peer info
function joinToChannel() {
  console.log("join to channel", roomId);
  
  // store the room info to my meetings
  // if room does not exist set the whole info
  // if room exists update timestamp and date (to track for the recent call made) 
  const mymeetings = firestore.collection(`${myName}`).doc(`${roomId}`);
  const snapshot = mymeetings.get();
  let timestamp = Date.now();
  let date = new Date().toString().slice(0,-34);
  if (!snapshot.exists) {
    try {
      mymeetings.set({ roomId, timestamp, date, roomName, createdBy });
    } catch (err) {
      console.log(err);
    }
  }
  else{
    try {
      mymeetings.update({'timestamp':timestamp, 'date':date });
    } catch (err) {
      console.log(err);
    }
  }
  socket.emit("join", { channel: roomId, peerName: myName, });
}

// welcome message
function welcomeMessage() {

  loadMessages();
  const myRoomUrl = window.location.href;
  Swal.fire({ allowEnterKey: false, background: background, position: "top", title: "<strong>Welcome " + myName + "</strong>",
    html:`<br/><p style="color:white;">Share this link for others to join.</p>
    <p style="color:#376df9";>` + myRoomUrl + `</p>`,
    showDenyButton: true, confirmButtonText: `Copy URL`, confirmButtonColor: 'black', denyButtonText: `Close`, denyButtonColor: 'grey',
  }).then((result) => { if (result.isConfirmed) copyRoomURL(); });

}

// get the previous messages in a particular room from firebase 
function loadMessages() {
  
  // if the sender of the message is myself attach the message to the right,
  // if not attach to the left and if message is individual add the reciever name to the message
  // if the message from others is individual and if reciever is myself attach the message, if not do nothing
  firestore.collection('messages').doc(`${roomId}`).collection(`${roomId}`).orderBy('timestamp', 'asc').get()
  .then(function(snapshot) {
    snapshot.forEach(function(doc) {
      if(myName === doc.data().name){
        if(doc.data().individualMsg) attachMessage(doc.data().date, doc.data().time, myName, rightChatImg, "right", doc.data().msg + "<br/><hr>to " + doc.data().toName, doc.data().individualMsg);
        else attachMessage(doc.data().date, doc.data().time, myName, rightChatImg, "right", doc.data().msg, doc.data().individualMsg);
      }
      else{
        setPeerChatImgName("left", doc.data().name);
        if(doc.data().individualMsg) {
          if (myName === doc.data().toName) attachMessage(doc.data().date, doc.data().time, doc.data().name, leftChatImg, "left", doc.data().msg, doc.data().individualMsg);
        }
        else attachMessage(doc.data().date, doc.data().time, doc.data().name, leftChatImg, "left", doc.data().msg, doc.data().individualMsg);
      }
    });
  });
  msgerChat.scrollTop += msgerChat.scrollHeight;
}

function setPeerChatImgName(image, peerName) {
  let img = imgUrl + "?name=" + peerName + "&size=32" + "&background=random&rounded=true";
  switch (image) {
    case "left": leftChatImg = img; break;
    case "right": rightChatImg = img; break;
  }
}

function setChatRoom() {

  // show msger participants 
  msgerIBtn.addEventListener("click", (e) => {
    if (!thereAreConnections()) {
      notify("No participants online in the room");
      return;
    }
    msgerI.style.display = "flex";
  });

  // hide msger participants 
  msgerICloseBtn.addEventListener("click", (e) => { msgerI.style.display = "none"; });

  msgerInput.addEventListener("keyup", (e) => {
    // Number 13 is the "Enter" key on the keyboard
    if (e.keyCode === 13) {
      e.preventDefault();
      msgerSendBtn.click();
    }
  });

  // chat send msg
  msgerSendBtn.addEventListener("click", (e) => {
    e.preventDefault();
    
    // if there are no peers in the room store the message in firebase and attach it to the message box
    if (!thereAreConnections()) {
      const msg = msgerInput.value;
      toFirebase(myName, "toAll", msg, false);
      let date = new Date().toString().slice(0,-34).substring(0,15);
      let time = new Date().toString().slice(0,-34).substring(16,21);
      attachMessage(date, time, myName, rightChatImg, "right", msg, false);
      msgerInput.value = "";
      return;
    }

    const msg = msgerInput.value;
    if (!msg) return;

    sendMessage(myName, "toAll", msg, false, "");
    let date = new Date().toString().slice(0,-34).substring(0,15);
    let time = new Date().toString().slice(0,-34).substring(16,21);
    attachMessage( date, time, myName, rightChatImg, "right", msg, false);
    msgerInput.value = "";
  });
}

function setLeaveRoomBtn() { leaveRoomBtn.addEventListener("click", (e) => { leaveRoom(); }); }

// Copy - share room url button click event
function setShareRoomBtn() {
  shareRoomBtn.addEventListener("click", async (e) => {
    const myRoomUrl = window.location.href;
    Swal.fire({ background: background, position: "top", 
    html: `<br/><p style="color:white;">Share this meeting invite for others to join.</p>
    <p style="color:#376df9;">` + myRoomUrl + `</p>`,
    showDenyButton: true, confirmButtonText: `Copy URL`, confirmButtonColor: 'black', denyButtonText: `Close`, denyButtonColor: 'grey',})
    .then((result) => { if (result.isConfirmed) copyRoomURL(); }); 
  });
}

// join the call of this room
function setJoinCallBtn() {
  joinCallBtn.addEventListener("click", async (e) => {
    window.location.href='/join/' + roomId;
  });
}

// copy room url to clipboard
function copyRoomURL() {
  let roomURL = window.location.href;
  let tmpInput = document.createElement("input");
  document.body.appendChild(tmpInput);
  tmpInput.value = roomURL;
  tmpInput.select();
  document.execCommand("copy");
  document.body.removeChild(tmpInput);
  notify("Meeting link copied");
}

// Create Chat Room Data Channel
function createChatChannel(peer_id) { chatChannels[peer_id] = connections[peer_id].createDataChannel( "chat_channel" ); }

// Incoming Channel Messages
function ChatChannel(messages) {
  switch (messages.type) {
    case "chat":
      if (messages.individualMsg && messages.toName != myName) return; // individual message but not for me return
      //console.log("ChatChannel", messages); // log incoming messages json
      setPeerChatImgName("left", messages.name);
      let date = new Date().toString().slice(0,-34).substring(0,15);
      let time = new Date().toString().slice(0,-34).substring(16,21);
      attachMessage( date, time, messages.name, leftChatImg, "left", messages.msg, messages.individualMsg );
      break;
    
    default: break;
  }
}

// attch message to message box
function attachMessage( date, time, name, img, side, text, individualMsg) {

  // check if i receive a individual message
  let msgBubble = individualMsg ? "individual-msg-bubble" : "msg-bubble";

  let ctext = detectUrl(text);
  const msgHTML = `
	<div class="msg ${side}-msg">
		<div class="msg-img" style="background-image: url('${img}')"></div>
		<div class=${msgBubble}>
      <div class="msg-info">
        <div class="msg-info-name">${name}</div>
      </div>
      <div class="msg-text">${ctext}</div>
      <div class="msg-info">
        <div class="msg-info-time">${date}   </div>
        <div class="msg-info-time">${time}</div>
      </div>
    </div>
	</div>
  `;
  msgerChat.insertAdjacentHTML("beforeend", msgHTML);
  msgerChat.scrollTop += msgerChat.scrollHeight;
}

// add all current participants in the room to msger list
function msgerAddPeers(peers) {

  for (let peer_id in peers) {
    let peer_name = peers[peer_id]["peer_name"];
    
    if (peer_name != myName) {
      let MsgerIndividualDiv = getId(peer_id + "_imsgDiv");
      
      if (!MsgerIndividualDiv) {
        let msgerIndividualDiv = `
        <div id="${peer_id}_imsgDiv" class="msger-inputarea">
          <input id="${peer_id}_imsgInput" class="msger-input" type="text" placeholder="Enter your message..."/>
          <button id="${peer_id}_imsgBtn" class="fas fa-paper-plane" value="${peer_name}">&nbsp;${peer_name}</button>
        </div>
        `;
        msgerIList.insertAdjacentHTML("beforeend", msgerIndividualDiv);
        msgerIList.scrollTop += 500;

        let msgerIndividualMsgInput = getId(peer_id + "_imsgInput");
        let msgerIndividualBtn = getId(peer_id + "_imsgBtn");
        addMsgerIndividualBtn(msgerIndividualBtn, msgerIndividualMsgInput, peer_id);
      }

    }

  }
}

// add all current participants in the room to users list
function participantAddPeers(peers) {

  for (let peer_id in peers) {
    let peer_name = peers[peer_id]["peer_name"];
    
    if (peer_name != myName) {
      let ParticipantDiv = getId(peer_id + "_participantDiv");
      
      if (!ParticipantDiv) {
        let participantDiv = `
        <div id="${peer_id}_participantDiv" class="participants-area">
          <p value="${peer_name}">&nbsp;${peer_name}</p>
        </div>
        `;
        participantsList.insertAdjacentHTML("beforeend", participantDiv);
        participantsList.scrollTop += 500;
      }

    }

  }
}

// Remove participant from msger room lists
function msgerRemovePeer(peer_id) {
  let msgerIndividualDiv = getId(peer_id + "_imsgDiv");
  if (msgerIndividualDiv) {
    let peerToRemove = msgerIndividualDiv.firstChild;
    while (peerToRemove) {
      msgerIndividualDiv.removeChild(peerToRemove);
      peerToRemove = msgerIndividualDiv.firstChild;
    }
    msgerIndividualDiv.remove();
  }
}

// Remove participant from user lists
function participantRemovePeer(peer_id) {
  let participantDiv = getId(peer_id + "_participantDiv");
  if (participantDiv) {
    let peerToRemove = participantDiv.firstChild;
    while (peerToRemove) {
      participantDiv.removeChild(peerToRemove);
      peerToRemove = participantDiv.firstChild;
    }
    participantDiv.remove();
  }
}

// Setup msger buttons to send individual messages
function addMsgerIndividualBtn(msgerIndividualBtn, msgerIndividualMsgInput, peer_id) {
  // add button to send individual messages
  msgerIndividualBtn.addEventListener("click", (e) => {
    e.preventDefault();
    let imsg = msgerIndividualMsgInput.value;
    if (!imsg) return;
    let toPeerName = msgerIndividualBtn.value;

    sendMessage(myName, toPeerName, imsg, true, peer_id);
    let date = new Date().toString().slice(0,-34).substring(0,15);
    let time = new Date().toString().slice(0,-34).substring(16,21);
    attachMessage( date,time, myName, rightChatImg, "right", imsg + "<br/><hr>to " + toPeerName, true );
    msgerIndividualMsgInput.value = "";
    msgerI.style.display = "none";
  });
}

// Detect url from text and make it clickable
function detectUrl(text) {
  let urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.replace(urlRegex, (url) => {
    if (isImageURL(text)) return ( '<p><img src="' + url + '" alt="img" width="200" height="auto"/></p>' ); 
    return ( '<a id="chat-msg-a" href="' + url + '" target="_blank">' + url + "</a>" );
  });
}

// Check if url passed is a image
function isImageURL(url) { return url.match(/\.(jpeg|jpg|gif|png|tiff|bmp)$/) != null; }

// Send message over Secure dataChannels
function sendMessage(name, toName, msg, individualMsg, peer_id) {
  if (msg) {
    const chatMessage = { type: "chat", name: name, toName: toName, msg: msg, individualMsg: individualMsg, };
    // peer to peer over DataChannels
    Object.keys(chatChannels).map((peerId) => chatChannels[peerId].send(JSON.stringify(chatMessage)) );
    toFirebase(name, toName, msg, individualMsg);
  }
}

function toFirebase(name, toName, msg, individualMsg) {
  let date = new Date().toString().slice(0,-34).substring(0,15);
  let time = new Date().toString().slice(0,-34).substring(16,21);
  let timestamp = Date.now();
  const messages = firestore.collection('messages').doc(`${roomId}`).collection(`${roomId}`).doc(`${timestamp}`);
  const snapshot = messages.get();
  if (!snapshot.exists) {
    try {
      messages.set({ name, toName, msg, individualMsg, date, time, timestamp });
    } catch (err) {
      console.log(err);
    }
  }
}

// Leave the Room and create a new one
function leaveRoom() {
  Swal.fire({ background: background, position: "top", title: "Leave this room?",
    showDenyButton: true, confirmButtonText: `Yes`, confirmButtonColor: 'black', denyButtonText: `No`, denyButtonColor: 'grey',
  }).then((result) => { if (result.isConfirmed) window.location.href = "/main"; });
}

function notify(message) { Swal.fire({ background: 'black', position: "top", text: message, showConfirmButton: false, timer:1000, }); } // notifying the message
function getId(id) { return document.getElementById(id); } // Get Html element by Id

