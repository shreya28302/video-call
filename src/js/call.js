"use strict"; 

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
const fileInput = "*"; // allow all file extensions

let background = "rgba(48, 48, 48)"; 
let serverPort = 4000; // must be same of server PORT
let server = getServerUrl();
let roomId = getRoomId();

let connection;
let myName;
let Audio = true;
let Video = true;
let myHandStatus = false;
let myVideoStatus = true;
let myAudioStatus = true;

let isScreenStreaming = false;
let isChatRoomVisible = false;
let isButtonsVisible = false;
let isUsersVisible = false;
let isMoreVisible = false;
let isVideoOnFullScreen = false;

let socket; 
let myMediaStream; 
let othersMediaStream;
let othersMediaControls = false; 

let connections = {}; 
let mediaElements = {};
let chatDataChannels = {}; 
let fileSharingDataChannels = {};  
let iceServers = [{ urls: "stun:stun.l.google.com:19302" }]; 

let countTime;
let callStartTime;
let callElapsedTime;
let recStartTime;
let recElapsedTime;

// start audio-video
let startAudioBtn, startVideoBtn;
// bottom buttons
let bottomButtons;
let usersBtn;
let audioBtn;
let videoBtn;
let chatRoomBtn;
let myHandBtn;
let moreBtn;
let leaveRoomBtn;

let users;
let usersCloseBtn;

// chat room elements
let msgerDraggable;
let msgerHeader;
let msgerIBtn;
let msgerClose;
let msgerChat;
let msgerInput;
let msgerSendBtn;
let msgerI;
let msgerIHeader;
let msgerICloseBtn;
let msgerIList;

let leftChatImg;
let rightChatImg;

let more;
let moreCloseBtn;

// my video element
let myVideo;
let myVideoImg;
// name && hand video audio status
let myInfo;
let myHandStatusIcon;
let myVideoStatusIcon;
let myAudioStatusIcon;
// record Media Stream
let mediaRecorder;
let recordedObjects;
let isStreamRecording = false;

let participantsList;
let shareRoomBtn;
let screenShareBtn;
let recordStreamBtn;
let fileShareBtn;
let muteEveryoneBtn;
let hideEveryoneBtn;

// file transfer settings
let fileToSend;
let fileReader;
let receiveBuffer = [];
let receivedSize = 0;
let incomingFileInfo;
let incomingFileData;
let sendInProgress = false;
let fileShareDataChannelOpen = false;

auth.onAuthStateChanged((user) => {

  if (user) {
    firestore.collection('users').doc(`${user.uid}`).get()
    .then((snapshot) => {
      console.log(snapshot.data().username);
      myName = snapshot.data().username;
    });
  } 
  else {
    window.location.href='/';
  }

});

// Html elements 
function getHtmlElementsById() {
  countTime = getId("countTime");
  myVideo = getId("myVideo");
  myVideoImg = getId("myVideoImg");
  bottomButtons = getId("bottomButtons");
  usersBtn = getId("usersBtn");
  audioBtn = getId("audioBtn");
  videoBtn = getId("videoBtn");
  chatRoomBtn = getId("chatRoomBtn");
  myHandBtn = getId("myHandBtn");
  moreBtn = getId("moreBtn");
  leaveRoomBtn = getId("leaveRoomBtn");
  users = getId("users");
  usersCloseBtn = getId("usersCloseBtn");
  msgerDraggable = getId("msgerDraggable");
  msgerHeader = getId("msgerHeader");
  msgerIBtn = getId("msgerIBtn");
  msgerClose = getId("msgerClose");
  msgerChat = getId("msgerChat");
  msgerInput = getId("msgerInput");
  msgerSendBtn = getId("msgerSendBtn");
  msgerI = getId("msgerI");
  msgerIHeader = getId("msgerIHeader");
  msgerICloseBtn = getId("msgerICloseBtn");
  msgerIList = getId("msgerIList");
  more = getId("more");
  moreCloseBtn = getId("moreCloseBtn");
  myInfo = getId("myInfo");
  myHandStatusIcon = getId("myHandStatusIcon");
  myVideoStatusIcon = getId("myVideoStatusIcon");
  myAudioStatusIcon = getId("myAudioStatusIcon");
  participantsList = getId("participantsList");
  shareRoomBtn = getId("shareRoomBtn");
  screenShareBtn = getId("screenShareBtn");
  recordStreamBtn = getId("recordStreamBtn");
  fileShareBtn = getId("fileShareBtn");
  muteEveryoneBtn = getId("muteEveryoneBtn");
  hideEveryoneBtn = getId("hideEveryoneBtn");
}

function setButtonsTitle() {
  tippy(usersBtn, { content: "participants", placement: "right-start", });
  tippy(audioBtn, { content: "Off", placement: "right-start", });
  tippy(videoBtn, { content: "Off", placement: "right-start", });
  tippy(chatRoomBtn, { content: "Open the chat", placement: "right-start", });
  tippy(myHandBtn, { content: "Raise your hand", placement: "right-start", });
  tippy(moreBtn, { content: "click for more", placement: "right-start", });
  tippy(leaveRoomBtn, { content: "Leave call", placement: "right-start", });


  tippy(msgerIBtn, { content: "Individual messages", });
  tippy(shareRoomBtn, { content: "Invite people to join", placement: "right-start", });
  tippy(screenShareBtn, { content: "start screen sharing", placement: "right-start", });
  tippy(recordStreamBtn, { content: "start recording", placement: "right-start", });
  tippy(fileShareBtn, { content: "share the file", placement: "right-start", });
  tippy(muteEveryoneBtn, { content: "mute everyone", placement: "right-start", });
  tippy(hideEveryoneBtn, { content: "hide everyone", placement: "right-start", });
}

// Get Server url
function getServerUrl() {
  return ( "http" + (location.hostname == "localhost" ? "" : "s") + "://" + location.hostname + (location.hostname == "localhost" ? ":" + serverPort : "") );
}

// Generate random Room id
function getRoomId() {
  // skip /join/
  let roomId = location.pathname.substring(6);
  if (roomId == "") {
    roomId = makeId(15);
    const newurl = server + "/join/" + roomId;
    window.history.pushState({ url: newurl }, roomId, newurl);
  }
  return roomId;
}

// Generate random Id
function makeId(length) {
  let result = "";
  let characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let charactersLength = characters.length;
  for (let i = 0; i < length; i++) result += characters.charAt(Math.floor(Math.random() * charactersLength));  
  return result;
}

// Check if there is peer connections
function thereAreConnections() {
  if (Object.keys(connections).length === 0) return false;
  return true;
}

// On body load Get started
function startRoom() {

  if (!isWebRTCSupported) {
    alert("error: This browser seems not supported WebRTC!");
    return;
  }

  console.log("Connecting to server");
  socket = io(server);
  
  // once access given, join the channel
  socket.on("connect", () => {
    console.log("Connected to server");
    if (myMediaStream) joinToChannel(); 
    else setupMyMedia(() => { whoAreYou(); });
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

    let ontrackCount = 0;
    connections[peer_id].ontrack = (event) => {
      ontrackCount++;
      if (ontrackCount === 2) loadOthersMediaStream(event, peers, peer_id); // audio + video
    };
    myMediaStream.getTracks().forEach((track) => { connections[peer_id].addTrack(track, myMediaStream); });

    // RTC Data Channel
    connections[peer_id].ondatachannel = (event) => {
      console.log("Datachannel event " + peer_id, event);
      event.channel.onmessage = (msg) => {
        switch (event.channel.label) {
          case "chat_channel":
            let dataMessage = {};
            try {
              dataMessage = JSON.parse(msg.data);
              handleDataChannelChat(dataMessage);
            } 
            catch (err) {
              console.log(err);
            }
            break;
          case "file_sharing_channel":
            handleDataChannelFileSharing(msg.data);
            break;
        }
      };
    };
    createChatDataChannel(peer_id);
    createFileSharingDataChannel(peer_id);

    if (config.should_create_offer) {

      console.log("Creating RTC offer to", peer_id);
      connections[peer_id].createOffer()
      .then((local_description) => {
        console.log("Local offer description is", local_description);
        connections[peer_id].setLocalDescription(local_description)
          .then(() => {
            socket.emit("SDP", { peer_id: peer_id, session_description: local_description, });
            console.log("Offer setLocalDescription done!");
          })
          .catch((err) => {
            console.error("[Error] offer setLocalDescription", err);
            alert("error: Offer setLocalDescription failed " + err);
          });
        })
      .catch((err) => {
        console.error("Error sending offer", err);
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
          console.log("Creating answer");
          connections[peer_id].createAnswer()
            .then((local_description) => {
              console.log("Answer description is: ", local_description);
              connections[peer_id].setLocalDescription(local_description)
                .then(() => {
                  socket.emit("SDP", { peer_id: peer_id, session_description: local_description, });
                  console.log("Answer setLocalDescription done!");
                })
                .catch((err) => {
                  console.error("[Error] answer setLocalDescription", err);
                  alert("error: Answer setLocalDescription failed " + err);
                });
            })
            .catch((err) => {
              console.error("[Error] creating answer", err);
            });
        } 
      })
      .catch((err) => {
        console.error("[Error] setRemoteDescription", err);
      });
  });


  socket.on("iceCandidate", (config) => {

    let peer_id = config.peer_id;
    let ice_candidate = config.ice_candidate;
    connections[peer_id]
    .addIceCandidate(new RTCIceCandidate(ice_candidate))
    .catch((err) => {
      console.error("Error addIceCandidate", err);
      alert("error: addIceCandidate failed " + err);
    });
  });

  
  // remove all connections
  socket.on("disconnect", () => {

    console.log("Disconnected from server");
    for (let peer_id in mediaElements) {
      document.body.removeChild(mediaElements[peer_id].parentNode);
      setVideos();
    }
    for (let peer_id in connections) {
      connections[peer_id].close();
      msgerRemovePeer(peer_id);
      participantRemovePeer(peer_id);
    }
    chatDataChannels = {};
    fileSharingDataChannels = {};
    connections = {};
    mediaElements = {};
  });

  
  // 'remove' signal is passed to all the users and the media channels open for that peer are deleted
  socket.on("remove", (config) => {

    console.log("Server said to remove peer:", config);
    let peer_id = config.peer_id;
    if (peer_id in mediaElements) {
      document.body.removeChild(mediaElements[peer_id].parentNode);
      setVideos();
    }
    if (peer_id in connections) connections[peer_id].close();

    msgerRemovePeer(peer_id);
    participantRemovePeer(peer_id);

    delete chatDataChannels[peer_id];
    delete fileSharingDataChannels[peer_id];
    delete connections[peer_id];
    delete mediaElements[peer_id];
  });


  socket.on("status", handlePeerStatus);
  socket.on("muteEveryone", setMyAudioOff);
  socket.on("hideEveryone", setMyVideoOff);
  socket.on("kickOut", kickedOut);
  socket.on("fileInfo", startDownload);

} // end [startRoom]


// set your name for the conference
function whoAreYou() {

  let timerInterval;
  Swal.fire({ allowEscapeKey: false, allowEnterKey: false, allowOutsideClick: false, background: background, position: "top",
    html:`<br><button id="startAudioBtn" class="fas fa-microphone" onclick="handleAudio(event, true)"></button>
    <button id="startVideoBtn" class="fas fa-video" onclick="handleVideo(event, true)"></button>`,
    title: `Joining the meeting`, 
    timer: 5000, 
    didOpen: () => { Swal.showLoading(); timerInterval = setInterval(() => {}, 100); },
    willClose: () => { clearInterval(timerInterval); }, 
  }).then(() => { 
    myInfo.innerHTML = myName + " (me)";
    setPeerImgName("myVideoImg", myName);
    setPeerChatImgName("right", myName);
    joinToChannel();
    welcomeUser(); 
    let ParticipantDiv = getId("participantDiv");
    // if there isn't add it....
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
  });

  // start audio-video
  startAudioBtn = getId("startAudioBtn");
  startVideoBtn = getId("startVideoBtn");
  // popup text
  tippy(startAudioBtn, { content: "Off", placement: "top", });
  tippy(startVideoBtn, { content: "Off", placement: "top", });

}

// join to chennel and send some peer info
function joinToChannel() {
  console.log("join to channel", roomId);
  const meetings = firestore.collection(`${myName}`).doc(`${roomId}`);
  const snapshot = meetings.get();
  let date = new Date().toString().slice(0,-34);
  let timestamp = Date.now();
  if (!snapshot.exists) {
    try {
      meetings.set({ roomId, timestamp, date });
    } catch (err) {
      console.log(err);
    }
  }
  else{
    try {
      meetings.update({'timestamp':timestamp, 'date':date });
    } catch (err) {
      console.log(err);
    }
  }
  socket.emit("join", { channel: roomId, peerName: myName, peerVideo: myVideoStatus, peerAudio: myAudioStatus, peerHand: myHandStatus, });
}

// welcome message
function welcomeUser() {

  loadMessages();
  const myRoomUrl = window.location.href;
  Swal.fire({ allowEnterKey: false, background: background, position: "top", title: "<strong>Welcome " + myName + "</strong>",
    html:`<br/><p style="color:white;">Share this link for others to join.</p>
    <p style="color:#376df9";>` + myRoomUrl + `</p>`,
    showDenyButton: true, confirmButtonText: `Copy URL`, confirmButtonColor: 'black', denyButtonText: `Close`, denyButtonColor: 'grey',
  }).then((result) => { if (result.isConfirmed) copyRoomURL(); });
  
}

// permission to use the microphone and camera
function setupMyMedia(callback, errorback) {
  // if we've already been initialized do nothing
  if (myMediaStream != null) {
    if (callback) callback();
    return;
  }

  console.log("Requesting access to my audio / video inputs");
  const constraints = { audio: Audio, video: Video, };
  navigator.mediaDevices.getUserMedia(constraints)
    .then((stream) => {
      loadMyMedia(stream);
      if (callback) callback();
    })
    .catch((err) => {
      alert("Access denied for audio / video: " + err)
      console.error("Access denied for audio / video", err);
      if (errorback) errorback();
    });
} 

// Load Media Stream obj
function loadMyMedia(stream) {

  console.log("Access granted to audio / video");
  document.body.style.backgroundImage = "none";
  getId("loadingDiv").style.display = "none";

  myMediaStream = stream;

  const videoWrap = document.createElement("div");

  // handle my peer name video audio status
  const myStatusMenu = document.createElement("div");
  const myCountTimeImg = document.createElement("i");
  const myCountTime = document.createElement("p");
  const myInfoImg = document.createElement("i");
  const myInfo = document.createElement("h4");
  const myHandStatusIcon = document.createElement("button");
  const myVideoStatusIcon = document.createElement("button");
  const myAudioStatusIcon = document.createElement("button");
  const myVideoFullScreenBtn = document.createElement("button");
  const myVideoImg = document.createElement("img");

  // menu Status
  myStatusMenu.setAttribute("id", "myStatusMenu");
  myStatusMenu.className = "statusMenu";

  // session time
  myCountTimeImg.setAttribute("id", "countTimeImg");
  myCountTimeImg.className = "fas fa-clock";
  myCountTime.setAttribute("id", "countTime");
  tippy(myCountTime, { content: "Session Time", });
  // my peer name
  myInfoImg.setAttribute("id", "myInfoImg");
  myInfoImg.className = "fas fa-user";
  myInfo.setAttribute("id", "myInfo");
  myInfo.className = "videoPeerName";
  tippy(myInfo, { content: "My name", });
  // my hand status element
  myHandStatusIcon.setAttribute("id", "myHandStatusIcon");
  myHandStatusIcon.className = "fas fa-hand-paper";
  myHandStatusIcon.style.setProperty("color", "#9477CB");
  tippy(myHandStatusIcon, { content: "Raised", });
  // my video status element
  myVideoStatusIcon.setAttribute("id", "myVideoStatusIcon");
  myVideoStatusIcon.className = "fas fa-video";
  tippy(myVideoStatusIcon, { content: "On", });
  // my audio status element
  myAudioStatusIcon.setAttribute("id", "myAudioStatusIcon");
  myAudioStatusIcon.className = "fas fa-microphone";
  tippy(myAudioStatusIcon, { content: "On", });
  // my video full screen mode
  myVideoFullScreenBtn.setAttribute("id", "myVideoFullScreenBtn");
  myVideoFullScreenBtn.className = "fas fa-expand";
  tippy(myVideoFullScreenBtn, { content: "full screen", });
  // my video image
  myVideoImg.setAttribute("id", "myVideoImg");
  myVideoImg.className = "videoImg";

  // add elements to myStatusMenu div
  myStatusMenu.appendChild(myCountTimeImg);
  myStatusMenu.appendChild(myCountTime);
  myStatusMenu.appendChild(myInfoImg);
  myStatusMenu.appendChild(myInfo);
  myStatusMenu.appendChild(myVideoStatusIcon);
  myStatusMenu.appendChild(myAudioStatusIcon);
  myStatusMenu.appendChild(myHandStatusIcon);
  myStatusMenu.appendChild(myVideoFullScreenBtn);

  // add elements to video wrap div
  videoWrap.appendChild(myStatusMenu);
  videoWrap.appendChild(myVideoImg);

  // hand display none on default menad is raised == false
  myHandStatusIcon.style.display = "none";

  const myMedia = document.createElement("video");
  videoWrap.className = "video";
  videoWrap.setAttribute("id", "myVideoWrap");
  videoWrap.appendChild(myMedia);
  myMedia.setAttribute("id", "myVideo");
  myMedia.setAttribute("playsinline", true);
  myMedia.className = "mirror";
  myMedia.autoplay = true;
  myMedia.muted = true;
  myMedia.volume = 0;
  myMedia.controls = false;
  document.body.appendChild(videoWrap);

  //console.log("loadMyMedia", { video: myMediaStream.getVideoTracks()[0].label, audio: myMediaStream.getAudioTracks()[0].label, });

  // attachMediaStream is a part of the adapter.js library
  attachMediaStream(myMedia, myMediaStream);
  setVideos();

  getHtmlElementsById();
  setButtonsTitle();
  manageBottomButtons();
  handleBodyOnMouseMove();
  setupUsers();
  setupMore();
  startCountTime();
  fullScreenVideoPlayer("myVideo", "myVideoFullScreenBtn"); // full screen mode
}

// Load Others Media Stream obj
function loadOthersMediaStream(event, peers, peer_id) {
  //console.log("ontrack", event);
  othersMediaStream = event.streams[0];

  const videoWrap = document.createElement("div");

  // handle peers name video audio status
  const othersStatusMenu = document.createElement("div");
  const othersInfoImg = document.createElement("i");
  const othersInfo = document.createElement("h4");
  const othersHandStatusIcon = document.createElement("button");
  const othersVideoStatusIcon = document.createElement("button");
  const othersAudioStatusIcon = document.createElement("button");
  const othersPeerKickOut = document.createElement("button");
  const othersVideoFullScreenBtn = document.createElement("button");
  const othersVideoImg = document.createElement("img");

  // menu Status
  othersStatusMenu.setAttribute("id", peer_id + "_menuStatus");
  othersStatusMenu.className = "statusMenu";

  // remote peer name element
  othersInfoImg.setAttribute("id", peer_id + "_nameImg");
  othersInfoImg.className = "fas fa-user";
  othersInfo.setAttribute("id", peer_id + "_name");
  othersInfo.className = "videoPeerName";
  tippy(othersInfo, { content: "Participant name", });
  const peerVideoText = document.createTextNode(peers[peer_id]["peer_name"]);
  othersInfo.appendChild(peerVideoText);
  // remote hand status element
  othersHandStatusIcon.setAttribute("id", peer_id + "_handStatus");
  othersHandStatusIcon.style.setProperty("color", "#9477CB");
  othersHandStatusIcon.className = "fas fa-hand-paper";
  tippy(othersHandStatusIcon, { content: "Participant hand is RAISED", });
  // remote video status element
  othersVideoStatusIcon.setAttribute("id", peer_id + "_videoStatus");
  othersVideoStatusIcon.className = "fas fa-video";
  tippy(othersVideoStatusIcon, { content: "Participant video is ON", });
  // remote audio status element
  othersAudioStatusIcon.setAttribute("id", peer_id + "_audioStatus");
  othersAudioStatusIcon.className = "fas fa-microphone";
  tippy(othersAudioStatusIcon, { content: "Participant audio is ON", });
  // remote peer kick out
  othersPeerKickOut.setAttribute("id", peer_id + "_kickOut");
  othersPeerKickOut.className = "fas fa-minus-square";
  tippy(othersPeerKickOut, { content: "remove", });
  // remote video full screen mode
  othersVideoFullScreenBtn.setAttribute("id", peer_id + "_fullScreen");
  othersVideoFullScreenBtn.className = "fas fa-expand";
  tippy(othersVideoFullScreenBtn, { content: "Full screen mode", });
  // my video image
  othersVideoImg.setAttribute("id", peer_id + "_image");
  othersVideoImg.className = "videoImg";

  // add elements to remoteStatusMenu div
  othersStatusMenu.appendChild(othersInfoImg);
  othersStatusMenu.appendChild(othersInfo);
  othersStatusMenu.appendChild(othersPeerKickOut);
  othersStatusMenu.appendChild(othersVideoStatusIcon);
  othersStatusMenu.appendChild(othersAudioStatusIcon);
  othersStatusMenu.appendChild(othersHandStatusIcon);
  othersStatusMenu.appendChild(othersVideoFullScreenBtn);
  
  // add elements to videoWrap div
  videoWrap.appendChild(othersStatusMenu);
  videoWrap.appendChild(othersVideoImg);

  const othersMedia = document.createElement("video");
  videoWrap.className = "video";
  videoWrap.appendChild(othersMedia);
  othersMedia.setAttribute("id", peer_id + "_video");
  othersMedia.setAttribute("playsinline", true);
  othersMedia.mediaGroup = "othersvideo";
  othersMedia.autoplay = true;
  othersMedia.controls = othersMediaControls;
  mediaElements[peer_id] = othersMedia;
  document.body.appendChild(videoWrap);

  attachMediaStream(othersMedia, othersMediaStream);
  setVideos(); 
  fullScreenVideoPlayer(peer_id + "_video", peer_id + "_fullScreen"); // full screen mode
  handlePeerKickOutBtn(peer_id); // handle kick out button event
  setPeerImgName(peer_id + "_image", peers[peer_id]["peer_name"]); 
  setPeerHandStatus( peer_id, peers[peer_id]["peer_name"], peers[peer_id]["peer_hand"] ); // refresh remote peers hand icon status and title
  setPeerVideoStatus(peer_id, peers[peer_id]["peer_video"]); // refresh remote peers video icon status and title
  setPeerAudioStatus(peer_id, peers[peer_id]["peer_audio"]); // refresh remote peers audio icon status and title
  toggleClassElements("statusMenu", "inline"); // show status menu
}

function setVideos() {
  const numToString = ["", "one", "two", "three", "four", "five", "six"];
  const videos = document.querySelectorAll(".video");
  document.querySelectorAll(".video").forEach((v) => {
    v.className = "video " + numToString[videos.length];
  });
}

function setPeerImgName(videoImgId, peerName) {
  let videoImgElement = getId(videoImgId);
  let imgSize = 256;
  videoImgElement.setAttribute( "src", imgUrl + "?name=" + peerName + "&size=" + imgSize + "&background=random&rounded=true" );
}

function setPeerChatImgName(image, peerName) {
  let img = imgUrl + "?name=" + peerName + "&size=32" + "&background=random&rounded=true";
  switch (image) {
    case "left": leftChatImg = img; break;
    case "right": rightChatImg = img; break;
  }
}

// go on full screen mode 
function fullScreenVideoPlayer(videoId, videoFullScreenBtnId) {
  let videoPlayer = getId(videoId);
  let videoFullScreenBtn = getId(videoFullScreenBtnId);

  videoPlayer.addEventListener("fullscreenchange", (e) => {
    if (videoPlayer.controls) return; // if controls enabled do nothing
    let fullscreenElement = document.fullscreenElement;
    if (!fullscreenElement) {
      videoPlayer.style.pointerEvents = "auto";
      isVideoOnFullScreen = false;
    }
  });

  videoPlayer.addEventListener("webkitfullscreenchange", (e) => {
    if (videoPlayer.controls) return; // if controls enabled do nothing
    let webkitIsFullScreen = document.webkitIsFullScreen;
    if (!webkitIsFullScreen) {
      videoPlayer.style.pointerEvents = "auto";
      isVideoOnFullScreen = false;
    }
  });

  // on button click go on FS
  videoFullScreenBtn.addEventListener("click", (e) => { fullScreenVideo(); });

  // on video click go on FS
  videoPlayer.addEventListener("dblclick", (e) => { fullScreenVideo(); });

  function fullScreenVideo() {
    // if Controls enabled, or document on FS do nothing
    if (videoPlayer.controls) return;

    if (!isVideoOnFullScreen) {
      if (videoPlayer.requestFullscreen) videoPlayer.requestFullscreen();
      else if (videoPlayer.webkitRequestFullscreen) videoPlayer.webkitRequestFullscreen();
      else if (videoPlayer.msRequestFullscreen) videoPlayer.msRequestFullscreen();

      isVideoOnFullScreen = true;
      videoPlayer.style.pointerEvents = "none";
    } 
    else {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.webkitCancelFullScreen) document.webkitCancelFullScreen();
      else if (document.msExitFullscreen) document.msExitFullscreen();
      
      isVideoOnFullScreen = false;
      videoPlayer.style.pointerEvents = "auto";
    }
  }
}

// Start talk time
function startCountTime() {
  countTime.style.display = "inline";
  callStartTime = Date.now();
  setInterval(function printTime() {
    callElapsedTime = Date.now() - callStartTime;
    countTime.innerHTML = getTimeToString(callElapsedTime);
  }, 1000);
}

// Return time to string
function getTimeToString(time) {
  let diffInHrs = time / 3600000;
  let hh = Math.floor(diffInHrs);
  let diffInMin = (diffInHrs - hh) * 60;
  let mm = Math.floor(diffInMin);
  let diffInSec = (diffInMin - mm) * 60;
  let ss = Math.floor(diffInSec);
  let formattedHH = hh.toString().padStart(2, "0");
  let formattedMM = mm.toString().padStart(2, "0");
  let formattedSS = ss.toString().padStart(2, "0");
  return `${formattedHH}:${formattedMM}:${formattedSS}`;
}

// Handle WebRTC bottom buttons
function manageBottomButtons() {
  setUsersBtn();
  setAudioBtn();
  setVideoBtn();
  setChatRoomBtn();
  setMyHandBtn();
  setMoreBtn();
  setLeaveRoomBtn();
  showBottomButtonsAndMenu();
}

function setUsersBtn() {
  usersBtn.addEventListener("click", (e) => { hideShowUsers(); });
  usersCloseBtn.addEventListener("click", (e) => { hideShowUsers(); });
}

function setAudioBtn() { audioBtn.addEventListener("click", (e) => { handleAudio(e, false); }); } // Audio mute - unmute button click event
function setVideoBtn() { videoBtn.addEventListener("click", (e) => { handleVideo(e, false); }); } // Video hide - show button click event

function setChatRoomBtn() {

  dragElement(msgerDraggable, msgerHeader);

  // open hide chat room
  chatRoomBtn.addEventListener("click", (e) => {
    if (!isChatRoomVisible) showChatRoomDraggable();
    else {
      hideChatRoom();
      e.target.className = "fas fa-comment-dots";
    }
  });

  // show msger participants section
  msgerIBtn.addEventListener("click", (e) => {
    if (!thereAreConnections()) {
      notify("No participants online in the room");
      return;
    }
    msgerI.style.display = "flex";
  });

  // hide msger participants section
  msgerICloseBtn.addEventListener("click", (e) => { msgerI.style.display = "none"; });

  // close chat room - show bottom button and status menu if hide
  msgerClose.addEventListener("click", (e) => {
    hideChatRoom();
    showBottomButtonsAndMenu();
  });

  // Execute a function when the user releases a key on the keyboard
  msgerInput.addEventListener("keyup", (e) => {
    // Number 13 is the "Enter" key on the keyboard
    if (e.keyCode === 13) {
      e.preventDefault();
      msgerSendBtn.click();
    }
  });

  // chat send msg
  msgerSendBtn.addEventListener("click", (e) => {
    // prevent refresh page
    e.preventDefault();

    if (!thereAreConnections()) {
      const msg = msgerInput.value;
      onlytofirebase(myName, "toAll", msg, false);
      let date = new Date().toString().slice(0,-34).substring(0,15);
      let time = new Date().toString().slice(0,-34).substring(16,21);
      attachMessage(date, time, myName, rightChatImg, "right", msg, false);
      msgerInput.value = "";
      return;
    }

    const msg = msgerInput.value;
    // empity msg
    if (!msg) return;

    emitMsg(myName, "toAll", msg, false, "");
    let date = new Date().toString().slice(0,-34).substring(0,15);
    let time = new Date().toString().slice(0,-34).substring(16,21);
    attachMessage(date, time, myName, rightChatImg, "right", msg, false);
    msgerInput.value = "";
  });
}

function loadMessages() {

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

}

function setMyHandBtn() { myHandBtn.addEventListener("click", async (e) => { setMyHandStatus(); }); }

function setMoreBtn() {
  moreBtn.addEventListener("click", (e) => { hideShowMore(); });
  moreCloseBtn.addEventListener("click", (e) => { hideShowMore(); });
}

function setLeaveRoomBtn() { leaveRoomBtn.addEventListener("click", (e) => { leaveRoom(); }); }

function handleBodyOnMouseMove() { document.body.addEventListener("mousemove", (e) => { showBottomButtonsAndMenu(); }); }

function setupUsers() {
  setShareRoomBtn();
}

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

function setupMore() {
  setScreenShareBtn();
  setRecordStreamBtn();
  setFileShareBtn();
  muteEveryoneBtn.addEventListener("click", (e) => { 
    disableAllPeers("audio");
    isMoreVisible = true;
    hideShowMore();
  });
  hideEveryoneBtn.addEventListener("click", (e) => { 
    disableAllPeers("video");
    isMoreVisible = true;
    hideShowMore(); 
  });
}

function setScreenShareBtn() {
  if (navigator.getDisplayMedia || navigator.mediaDevices.getDisplayMedia) {
    screenShareBtn.addEventListener("click", (e) => { 
      toggleScreenSharing();
      isMoreVisible = true;
      hideShowMore();
    });
  } else screenShareBtn.style.display = "none";
}

function setRecordStreamBtn() {
  recordStreamBtn.addEventListener("click", (e) => {
    if (isStreamRecording) stopStreamRecording();
    else startStreamRecording();  
    isMoreVisible = true;
    hideShowMore();
  });
}

function setFileShareBtn() {
  fileShareBtn.addEventListener("click", (e) => { 
    selectFileToShare();
    isMoreVisible = true;
    hideShowMore(); 
  });
}

// AttachMediaStream stream to element
function attachMediaStream(element, stream) {
  console.log("Success, media stream attached");
  element.srcObject = stream;
}

// Show bottom buttons & status menù for 10 seconds on body mousemove
function showBottomButtonsAndMenu() {
  if ( isButtonsVisible || isUsersVisible || isChatRoomVisible || isMoreVisible) return;
  
  toggleClassElements("statusMenu", "inline");
  bottomButtons.style.display = "flex";
  isButtonsVisible = true;
  setTimeout(() => {
    toggleClassElements("statusMenu", "none");
    bottomButtons.style.display = "none";
    isButtonsVisible = false;
  }, 10000);
}


// Copy Room URL to clipboard
function copyRoomURL() {
  // save Room Url to clipboard
  let roomURL = window.location.href;
  let tmpInput = document.createElement("input");
  document.body.appendChild(tmpInput);
  tmpInput.value = roomURL;
  tmpInput.select();
  document.execCommand("copy");
  document.body.removeChild(tmpInput);
  notify("Meeting link copied");
}

// Handle Audio ON-OFF
function handleAudio(e, init) {
  myMediaStream.getAudioTracks()[0].enabled = !myMediaStream.getAudioTracks()[0].enabled;
  myAudioStatus = myMediaStream.getAudioTracks()[0].enabled;
  e.target.className = "fas fa-microphone" + (myAudioStatus ? "" : "-slash");
  if (init) {
    audioBtn.className = "fas fa-microphone" + (myAudioStatus ? "" : "-slash");
    tippy(startAudioBtn, { content: myAudioStatus ? "Off" : "On", placement: "top", });
  }
  setMyAudioStatus(myAudioStatus);
}

// Handle Video ON-OFF
function handleVideo(e, init) {
  myMediaStream.getVideoTracks()[0].enabled = !myMediaStream.getVideoTracks()[0].enabled;
  myVideoStatus = myMediaStream.getVideoTracks()[0].enabled;
  e.target.className = "fas fa-video" + (myVideoStatus ? "" : "-slash");
  if (init) {
    videoBtn.className = "fas fa-video" + (myVideoStatus ? "" : "-slash");
    tippy(startVideoBtn, { content: myVideoStatus ? "Off" : "On", placement: "top", });
  }
  setMyVideoStatus(myVideoStatus);
}

// Stop Local Video Track
function stopMyVideoTrack() { myMediaStream.getVideoTracks()[0].stop(); }

// Enable - disable screen sharing
function toggleScreenSharing() {
  const constraints = { video: true, };

  let screenMediaPromise;

  if (!isScreenStreaming) {
    // on screen sharing start
    if (navigator.getDisplayMedia) screenMediaPromise = navigator.getDisplayMedia(constraints);
    else if (navigator.mediaDevices.getDisplayMedia) screenMediaPromise = navigator.mediaDevices.getDisplayMedia(constraints);
    else screenMediaPromise = navigator.mediaDevices.getUserMedia({ video: { mediaSource: "screen", }, });
  } 
  else {
    // on screen sharing stop
    const constraints = { audio: Audio, video: Video, };
    screenMediaPromise = navigator.mediaDevices.getUserMedia(constraints);
    // if screen sharing accidentally closed
    if (isStreamRecording) stopStreamRecording();
  }
  screenMediaPromise
    .then((screenStream) => {
      // stop cam video track on screen share
      stopMyVideoTrack();
      isScreenStreaming = !isScreenStreaming;
      refreshMyStreamToOthers(screenStream);
      refreshMyStream(screenStream);
      myVideo.classList.toggle("mirror");
      setScreenSharingStatus(isScreenStreaming);
    })
    .catch((err) => {
      console.error("[Error] Unable to share the screen", err);
      alert("error: Unable to share the screen " + err);
    });
}

// Set Screen Sharing Status
function setScreenSharingStatus(status) {
  screenShareBtn.className = status ? "fas fa-stop-circle" : "fas fa-desktop";
  tippy(screenShareBtn, { content: status ? "stop screen sharing" : "start screen sharing", placement: "right-start", });
}

// Refresh my stream changes to connected peers in the room
function refreshMyStreamToOthers(stream, myAudioTrackChange = false) {
  if (thereAreConnections()) {
    // refresh my video stream
    for (let peer_id in connections) {
      let sender = connections[peer_id]
        .getSenders()
        .find((s) => (s.track ? s.track.kind === "video" : false));
      sender.replaceTrack(stream.getVideoTracks()[0]);

      if (myAudioTrackChange) {
        let sender = connections[peer_id]
          .getSenders()
          .find((s) => (s.track ? s.track.kind === "audio" : false));
        sender.replaceTrack(stream.getAudioTracks()[0]);
      }
    }
  }
}

// Refresh my local stream
function refreshMyStream(stream, myAudioTrackChange = false) {
  stream.getVideoTracks()[0].enabled = true;

  // enable audio
  if (myAudioTrackChange && myAudioStatus === false) {
    audioBtn.className = "fas fa-microphone";
    setMyAudioStatus(true);
    myAudioStatus = true;
  }

  const newStream = new MediaStream([
    stream.getVideoTracks()[0],
    myAudioTrackChange ? stream.getAudioTracks()[0] : myMediaStream.getAudioTracks()[0],
  ]);
  myMediaStream = newStream;
 
  attachMediaStream(myVideo, myMediaStream); // attachMediaStream - adapter.js

  // on toggleScreenSharing video stop
  stream.getVideoTracks()[0].onended = () => {
    if (isScreenStreaming) toggleScreenSharing();
  };

  if (myVideoStatus === false) {
    myMediaStream.getVideoTracks()[0].enabled = false;
  }
}

// Start recording time
function startRecordingTime() {
  recStartTime = Date.now();
  setInterval(function printTime() {
    if (isStreamRecording) {
      recElapsedTime = Date.now() - recStartTime;
      myInfo.innerHTML = myName + "&nbsp;&nbsp;  REC " + getTimeToString(recElapsedTime);
      return;
    }
  }, 1000);
}

// Start Recording
function startStreamRecording() {
  recordedObjects = [];
  let options = { mimeType: "video/webm;codecs=vp9,opus" };
  if (!MediaRecorder.isTypeSupported(options.mimeType)) {
    console.error(`${options.mimeType} is not supported`);
    options = { mimeType: "video/webm;codecs=vp8,opus" };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      console.error(`${options.mimeType} is not supported`);
      options = { mimeType: "video/webm" };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        console.error(`${options.mimeType} is not supported`);
        options = { mimeType: "" };
      }
    }
  }

  try {
    // record only my local Media Stream
    mediaRecorder = new MediaRecorder(myMediaStream, options);
  } catch (err) {
    console.error("Exception while creating MediaRecorder:", err);
    alert("error: Can't start stream recording: " + err);
    return;
  }

  console.log("Created MediaRecorder", mediaRecorder, "with options", options);
  mediaRecorder.onstop = (event) => {
    console.log("MediaRecorder stopped: ", event);
    myInfo.innerHTML = myName + " (me)";
    screenShareBtn.disabled = false;
    downloadRecordedStream();
    tippy(recordStreamBtn, { content: "Start recording", placement: "right-start", });
  };

  mediaRecorder.ondataavailable = handleDataAvailable;
  mediaRecorder.start();
  console.log("MediaRecorder started", mediaRecorder);
  isStreamRecording = true;
  recordStreamBtn.style.setProperty("background-color", "red");
  startRecordingTime();
  screenShareBtn.disabled = true;
  tippy(recordStreamBtn, { content: "Stop recording", placement: "right-start", });
}

// Stop recording
function stopStreamRecording() {
  mediaRecorder.stop();
  isStreamRecording = false;
  recordStreamBtn.style.setProperty("background-color", "rgba(48,48,48)");
}

// recordind stream data
function handleDataAvailable(event) {
  console.log("handleDataAvailable", event);
  if (event.data && event.data.size > 0) recordedObjects.push(event.data);
}

// Download recorded stream
function downloadRecordedStream() {
  try {
    const blob = new Blob(recordedObjects, { type: "video/webm" });
    const recFileName = getDate() + "-REC.webm";
    const blobFileSize = bytesToSize(blob.size);

    Swal.fire({ background: background, position: "top", icon: "success", title: "Success", 
      html: `<div style="text-align: left;"> FILE: ${recFileName} <br/> SIZE: ${blobFileSize} <br/>
      Recording is downloaded to your device.</div>`,
      showConfirmButton: false, 
    });

    // save the recorded file to device
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = recFileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 100);
  } catch (err) {
    alert("error: Recording save failed: " + err);
  }
}


// Create Chat Room Data Channel
function createChatDataChannel(peer_id) { chatDataChannels[peer_id] = connections[peer_id].createDataChannel( "chat_channel" ); }

// Show msger draggable on center screen position
function showChatRoomDraggable() {
  
  chatRoomBtn.className = "fas fa-comment-slash";
  msgerDraggable.style.top = "50%";
  msgerDraggable.style.left = "50%";
  msgerDraggable.style.display = "flex";
  isChatRoomVisible = true;
}


// Hide chat room 
function hideChatRoom() {
  msgerDraggable.style.display = "none";
  chatRoomBtn.className = "fas fa-comment-dots";
  isChatRoomVisible = false;
}

// handle Incoming Data Channel Chat Messages
function handleDataChannelChat(dataMessages) {
  switch (dataMessages.type) {
    case "chat":
      // individual message but not for me return
      if (dataMessages.individualMsg && dataMessages.toName != myName) return;
      // log incoming dataMessages json
      console.log("handleDataChannelChat", dataMessages);
      // chat message for me also
      if (!isChatRoomVisible) {
        showChatRoomDraggable();
        chatRoomBtn.className = "fas fa-comment-slash";
      }
      
      setPeerChatImgName("left", dataMessages.name);
      let date = new Date().toString().slice(0,-34).substring(0,15);
      let time = new Date().toString().slice(0,-34).substring(16,21);
      attachMessage( date, time, dataMessages.name, leftChatImg, "left", dataMessages.msg, dataMessages.individualMsg );
      break;
    
    default: break;
  }
}

// Append Message to msger chat room
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
        <div class="msg-info-time"><small>${date}   </small></div>
        <div class="msg-info-time"><small>${time}</small></div>
      </div>
    </div>
	</div>
  `;
  msgerChat.insertAdjacentHTML("beforeend", msgHTML);
  msgerChat.scrollTop += 500;
}

// Add participants in the chat room lists
function msgerAddPeers(peers) {
  // add all current Participants
  for (let peer_id in peers) {
    let peer_name = peers[peer_id]["peer_name"];
    // bypass insert to myself in the list :)
    if (peer_name != myName) {
      let MsgerIndividualDiv = getId(peer_id + "_iMsgDiv");
      // if there isn't add it....
      if (!MsgerIndividualDiv) {
        let msgerIndividualDiv = `
        <div id="${peer_id}_iMsgDiv" class="msger-inputarea">
          <input
            id="${peer_id}_iMsgInput"
            class="msger-input"
            type="text"
            placeholder="Enter your message..."
          />
          <button id="${peer_id}_iMsgBtn" class="fas fa-paper-plane" value="${peer_name}">&nbsp;${peer_name}</button>
        </div>
        `;
        msgerIList.insertAdjacentHTML("beforeend", msgerIndividualDiv);
        msgerIList.scrollTop += 500;

        let msgerIndividualMsgInput = getId(peer_id + "_iMsgInput");
        let msgerIndividualBtn = getId(peer_id + "_iMsgBtn");
        addMsgerIndividualBtn(msgerIndividualBtn, msgerIndividualMsgInput, peer_id);
      }
    }
  }
}

function participantAddPeers(peers) {
  // add all current Participants
  for (let peer_id in peers) {
    let peer_name = peers[peer_id]["peer_name"];
    // bypass insert to myself in the list :)
    if (peer_name != myName) {
      let ParticipantDiv = getId(peer_id + "_participantDiv");
      // if there isn't add it....
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

// Remove participant from chat room lists
function msgerRemovePeer(peer_id) {
  let msgerIndividualDiv = getId(peer_id + "_iMsgDiv");
  if (msgerIndividualDiv) {
    let peerToRemove = msgerIndividualDiv.firstChild;
    while (peerToRemove) {
      msgerIndividualDiv.removeChild(peerToRemove);
      peerToRemove = msgerIndividualDiv.firstChild;
    }
    msgerIndividualDiv.remove();
  }
}

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
    let iMsg = msgerIndividualMsgInput.value;
    if (!iMsg) return;
    let toPeerName = msgerIndividualBtn.value;

    emitMsg(myName, toPeerName, iMsg, true, peer_id);
    let date = new Date().toString().slice(0,-34).substring(0,15);
    let time = new Date().toString().slice(0,-34).substring(16,21);
    attachMessage( date, time, myName, rightChatImg, "right", iMsg + "<br/><hr>to " + toPeerName, true );
    msgerIndividualMsgInput.value = "";
    msgerI.style.display = "none";
  });
}

// Detect url from text 
function detectUrl(text) {
  let urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.replace(urlRegex, (url) => {
    if (isImageURL(text)) return ( '<p><img src="' + url + '" alt="img" width="200" height="auto"/></p>' ); 
    return ( '<a id="chat-msg-a" href="' + url + '" target="_blank">' + url + "</a>" );
  });
}

// Check if url is an image
function isImageURL(url) { return url.match(/\.(jpeg|jpg|gif|png|tiff|bmp)$/) != null; }

// Send message over Secure dataChannels
function emitMsg(name, toName, msg, individualMsg, peer_id) {
  if (msg) {
    const chatMessage = { type: "chat", name: name, toName: toName, msg: msg, individualMsg: individualMsg, };
    // peer to peer over DataChannels
    Object.keys(chatDataChannels).map((peerId) => chatDataChannels[peerId].send(JSON.stringify(chatMessage)) );
    //console.log("Send msg", chatMessage);
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
}

function onlytofirebase(name, toName, msg, individualMsg) {
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

// Hide - show users
function hideShowUsers() {
  if (!isUsersVisible) {
    // center screen on show
    users.style.top = "50%";
    users.style.left = "50%";
    users.style.display = "block";
    isUsersVisible = true;
    return;
  }
  users.style.display = "none";
  isUsersVisible = false;
}

// Hide - show more
function hideShowMore() {
  if (!isMoreVisible) {
    // center screen on show
    more.style.top = "50%";
    more.style.left = "50%";
    more.style.display = "block";
    isMoreVisible = true;
    return;
  }
  more.style.display = "none";
  isMoreVisible = false;
}

// Send my Video-Audio-Hand... status
function emitStatus(element, status) {
  socket.emit("status", { connections: connections, room_id: roomId, peer_name: myName, element: element, status: status, });
}

// Set my Hand Status and Icon
function setMyHandStatus() {
  if (myHandStatus) {
    // Raise hand
    myHandStatus = false;
    tippy(myHandBtn, { content: "Raise your hand", placement: "right-start", });
  } 
  else {
    // Lower hand
    myHandStatus = true;
    tippy(myHandBtn, { content: "Lower your hand", placement: "right-start", });
  }
  myHandStatusIcon.style.display = myHandStatus ? "inline" : "none";
  emitStatus("hand", myHandStatus);
}

// Set My Audio Status Icon and Title
function setMyAudioStatus(status) {
  myAudioStatusIcon.className = "fas fa-microphone" + (status ? "" : "-slash");
  // send my audio status to all peers in the room
  emitStatus("audio", status);
  tippy(myAudioStatusIcon, { content: status ? "My audio is On" : "My audio is Off", });
  tippy(audioBtn, { content: status ? "Off" : "On", placement: "right-start", });
}

// Set My Video Status Icon and Title
function setMyVideoStatus(status) {

  myVideoImg.style.display = status ? "none" : "block";
  myVideoStatusIcon.className = "fas fa-video" + (status ? "" : "-slash");
  // send my video status to all peers in the room
  emitStatus("video", status);
  tippy(myVideoStatusIcon, { content: status ? "My video is On" : "My video is Off", });
  tippy(videoBtn, { content: status ? "Off" : "On", placement: "right-start", });
}

// Handle peer status
function handlePeerStatus(config) {
  switch (config.element) {
    case "video": setPeerVideoStatus(config.peer_id, config.status); break;
    case "audio": setPeerAudioStatus(config.peer_id, config.status); break;
    case "hand": setPeerHandStatus(config.peer_id, config.peer_name, config.status); break;
  }
}

// Set Participant Hand Status Icon and Title
function setPeerHandStatus(peer_id, peer_name, status) {
  let peerHandStatus = getId(peer_id + "_handStatus");
  peerHandStatus.style.display = status ? "block" : "none";
  if (status) notify(peer_name + " has raised the hand");
}

// Set Participant Audio Status Icon and Title
function setPeerAudioStatus(peer_id, status) {
  let peerAudioStatus = getId(peer_id + "_audioStatus");
  peerAudioStatus.className = "fas fa-microphone" + (status ? "" : "-slash");
  tippy(peerAudioStatus, { content: status ? "Participant audio is On" : "Participant audio is Off", });
}

// Set Participant Video Status Icon and Title
function setPeerVideoStatus(peer_id, status) {
  let peerVideoImg = getId(peer_id + "_image");
  let peerVideoStatus = getId(peer_id + "_videoStatus");
  peerVideoStatus.className = "fas fa-video" + (status ? "" : "-slash");
  peerVideoImg.style.display = status ? "none" : "block";
  tippy(peerVideoStatus, { content: status ? "Participant video is On" : "Participant video is Off", });
}


// Create File Sharing Data Channel
function createFileSharingDataChannel(peer_id) {
  fileSharingDataChannels[peer_id] = connections[peer_id].createDataChannel( "file_sharing_channel" );
  fileSharingDataChannels[peer_id].binaryType = "arraybuffer";
  fileSharingDataChannels[peer_id].addEventListener( "open", fileShareChannelStateChange );
  fileSharingDataChannels[peer_id].addEventListener( "close", fileShareChannelStateChange );
  fileSharingDataChannels[peer_id].addEventListener("error", fileShareError);
}

// Handle File Sharing
function handleDataChannelFileSharing(data) {
  receiveBuffer.push(data);
  receivedSize += data.byteLength;

  if (receivedSize === incomingFileInfo.fileSize) {
    incomingFileData = receiveBuffer;
    receiveBuffer = [];
    endDownload();
  }
}

// Handle File Sharing data channel state
function fileShareChannelStateChange(event) {
  console.log("fileScreenChannelStateChange", event.type);
  if (event.type === "close") {
    if (sendInProgress) {
      alert("error: File Sharing channel closed");
      sendInProgress = false;
    }
    fileShareDataChannelOpen = false;
    return;
  }
  fileShareDataChannelOpen = true;
}

// Handle File sharing data channel error
function fileShareError(event) {
  // cleanup
  receiveBuffer = [];
  incomingFileData = [];
  receivedSize = 0;
  // Popup what wrong
  if (sendInProgress) {
    console.error("fileShareError", event);
    alert("error: File Sharing " + event.error);
    sendInProgress = false;
  }
}

// Send File Data trought datachannel
function sendFileData() {
  //console.log( "Send file " + fileToSend.name + " size " + bytesToSize(fileToSend.size) + " type " + fileToSend.type );

  sendInProgress = true;
  fileReader = new FileReader();
  let offset = 0;

  fileReader.addEventListener("error", (err) => console.error("fileReader error", err) );
  fileReader.addEventListener("abort", (e) => console.log("fileReader aborted", e) );
  fileReader.addEventListener("load", (e) => {
    if (!sendInProgress || !fileShareDataChannelOpen) return;

    // send if channel open
    for (let peer_id in fileSharingDataChannels) {
      if (fileSharingDataChannels[peer_id].readyState === "open") {
        fileSharingDataChannels[peer_id].send(e.target.result); 
      }
    }
    
    offset += e.target.result.byteLength;

    // send file completed
    if (offset === fileToSend.size) {
      sendInProgress = false;
      Swal.fire({ background: background, position: "top", icon: "success", title: "Success", 
        text: "The file " + fileToSend.name + " was sent successfully.",
        showConfirmButton: false 
      });
    }

    if (offset < fileToSend.size) readSlice(offset);
    
  });

  const readSlice = (p) => {
    const slice = fileToSend.slice(offset, p + 16 * 1024);
    fileReader.readAsArrayBuffer(slice);
  };
  readSlice(0);
}

// Select the File to Share
function selectFileToShare() {
  

  Swal.fire({ allowOutsideClick: false, background: background, position: "top", title: "Share the file",
    input: "file", inputAttributes: { accept: fileInput, "aria-label": "Select the file", },
    showDenyButton: true, confirmButtonText: `Send`, confirmButtonColor: 'black', denyButtonText: `Cancel`, denyButtonColor: 'grey',
  }).then((result) => {
    if (result.isConfirmed) {
      fileToSend = result.value;
      if (fileToSend && fileToSend.size > 0) {
        // no peers in the room
        if (!thereAreConnections()) {
          notify("No participants in the call");
          return;
        }
        // something wrong channel not open
        if (!fileShareDataChannelOpen) {
          alert( "error: Unable to Sharing the file, DataChannel seems closed." );
          return;
        }
        // send some metadata about our file to peers in the room
        socket.emit("fileInfo", {
          connections: connections,
          peer_name: myName,
          room_id: roomId,
          file: { fileName: fileToSend.name, fileSize: fileToSend.size, fileType: fileToSend.type, fileSender: myName},
        });
        // send the File
        setTimeout(() => { sendFileData(); }, 1000);
      } 
      else alert("error: File not selected or empty.");     
    }
  });
}

// Start to Download the File
function startDownload(config) {
  incomingFileInfo = config;
  incomingFileData = [];
  receiveBuffer = [];
  receivedSize = 0;
  let fileToReceiveInfo = "incoming file: " + incomingFileInfo.fileName + " size: " + bytesToSize(incomingFileInfo.fileSize) + " type: " + incomingFileInfo.fileType;
  //console.log(fileToReceiveInfo);
  notify(fileToReceiveInfo);
}

// The file will be saved in the blob
function endDownload() {

  // save received file into Blob
  const blob = new Blob(incomingFileData);
  incomingFileData = [];

  // if file is image, show the preview
  if (isImageURL(incomingFileInfo.fileName)) {
    const reader = new FileReader();
    reader.onload = (e) => {
      Swal.fire({ allowOutsideClick: false, background: background, position: "top", title: "Received file from " + incomingFileInfo.fileSender ,
        text: incomingFileInfo.fileName + " size " + bytesToSize(incomingFileInfo.fileSize),
        showDenyButton: true, confirmButtonText: `Save`, confirmButtonColor: 'black', denyButtonText: `Cancel`, denyButtonColor: 'grey',
      }).then((result) => {
        if (result.isConfirmed) saveFileFromBlob();
      });
    };
    // blob where is stored downloaded file
    reader.readAsDataURL(blob);
  } 
  else {
    // not img file
    Swal.fire({ allowOutsideClick: false, background: background, position: "top", title: "Received file",
      text: incomingFileInfo.fileName + " size " + bytesToSize(incomingFileInfo.fileSize),
      showDenyButton: true, confirmButtonText: `Save`, confirmButtonColor: 'black', denyButtonText: `Cancel`, denyButtonColor: 'grey',
    }).then((result) => {
      if (result.isConfirmed) saveFileFromBlob();   
    });
  }

  // save to PC 
  function saveFileFromBlob() {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = incomingFileInfo.fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 100);
  }
}

function muteEveryone() { socket.emit("muteEveryone", { connections: connections, room_id: roomId, peer_name: myName, }); } // Mute everyone except yourself
function hideEveryone() { socket.emit("hideEveryone", { connections: connections, room_id: roomId, peer_name: myName, }); } // Hide everyone except yourself

// Popup the peer_name that do this actions
function setMyAudioOff(config) {
  let peer_name = config.peer_name;
  if (myAudioStatus === false) return;
  myMediaStream.getAudioTracks()[0].enabled = false;
  myAudioStatus = myMediaStream.getAudioTracks()[0].enabled;
  audioBtn.className = "fas fa-microphone-slash";
  setMyAudioStatus(myAudioStatus);
  notify(peer_name + " has disabled your audio");
}

// Popup the peer_name that do this actions
function setMyVideoOff(config) {
  let peer_name = config.peer_name;
  if (myVideoStatus === false) return;
  myMediaStream.getVideoTracks()[0].enabled = false;
  myVideoStatus = myMediaStream.getVideoTracks()[0].enabled;
  videoBtn.className = "fas fa-video-slash";
  setMyVideoStatus(myVideoStatus);
  notify(peer_name + " has disabled your video");
}

// Mute or Hide everyone except yourself
function disableAllPeers(element) {
  if (!thereAreConnections()) {
    notify("No participants in the call");
    return;
  }
  Swal.fire({ background: background, position: "top", title: element == "audio" ? "Mute everyone except myself?" : "Hide everyone except myself?",
    showDenyButton: true, confirmButtonText: element == "audio" ? `Mute` : `Hide`, confirmButtonColor: 'black', denyButtonText: `Cancel`, denyButtonColor: 'grey',
  }).then((result) => {
    if (result.isConfirmed) {
      switch (element) {
        case "audio": muteEveryone(); break;
        case "video": hideEveryone(); break;
      }
    }
  });
}

// Handle peer kick out event button
function handlePeerKickOutBtn(peer_id) {
  let peerKickOutBtn = getId(peer_id + "_kickOut");
  peerKickOutBtn.addEventListener("click", (e) => { kickOut(peer_id, peerKickOutBtn); });
}

// Kick out confirm
function kickOut(peer_id, peerKickOutBtn) {
  let name = getId(peer_id + "_name").innerHTML;

  Swal.fire({ background: background, position: "top", title: "Remove " + name, text: "Are you sure you want to remove this participant?",
    showDenyButton: true, confirmButtonText: `Yes`, confirmButtonColor: 'black', denyButtonText: `No`, denyButtonColor: 'grey',
  }).then((result) => {
    if (result.isConfirmed) {
      // send peer to kick out from room
      socket.emit("kickOut", { room_id: roomId, peer_id: peer_id, peer_name: myName, });
      peerKickOutBtn.style.display = "none";
    }
  });
}

// Who Kick out you msg popup
function kickedOut(config) {
  let peer_name = config.peer_name;
  let timerInterval;
  Swal.fire({ allowOutsideClick: false, background: background, position: "top",
    html: `<p>` + peer_name + ` is removing you </p>`,
    timer: 2000, 
    didOpen: () => { Swal.showLoading(); timerInterval = setInterval(() => {}, 100); },
    willClose: () => { clearInterval(timerInterval); }, 
  })
  .then(() => { window.location.href = "/main"; });
}

// Leave the Room and create a new one
function leaveRoom() {
  let chatLink = server + '/chat/' + roomId;
  Swal.fire({ background: background, position: "top", title: "Leave this room?",
    html: `<p>If you want to continue to chat,</br> go to the main page and</br> click on chat of this room</p>`,
    showDenyButton: true, confirmButtonText: `Yes`, confirmButtonColor: 'black', denyButtonText: `No`, denyButtonColor: 'grey',
  }).then((result) => { if (result.isConfirmed) window.location.href = "/main"; });
}

// Make Obj draggable
function dragElement(elmnt, dragObj) {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  if (dragObj) dragObj.onmousedown = dragMouseDown;
  else elmnt.onmousedown = dragMouseDown;
  
  function dragMouseDown(e) {
    e = e || window.event;
    e.preventDefault();
    // get the mouse cursor position at startup:
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    // call a function whenever the cursor moves:
    document.onmousemove = elementDrag;
  }
  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    // calculate the new cursor position:
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    // set the element's new position:
    elmnt.style.top = elmnt.offsetTop - pos2 + "px";
    elmnt.style.left = elmnt.offsetLeft - pos1 + "px";
  }
  function closeDragElement() {
    // stop moving when mouse button is released:
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

// Data Formated DD-MM-YYYY-H_M_S
function getDate() {
  const date = new Date().toString().slice(0,-34).substring(0,15);
  const time = new Date().toString().slice(0,-34).substring(16,21);
  return `${date}-${time}`;
}

// Convert bytes to KB-MB-GB-TB
function bytesToSize(bytes) {
  let sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  if (bytes == 0) return "0 Byte";
  let i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
  return Math.round(bytes / Math.pow(1024, i), 2) + " " + sizes[i];
}

function notify(message) { Swal.fire({ background: 'black', position: "top", text: message, showConfirmButton: false, timer:1000, }); } // notifying the message

// Show-Hide all elements grp by class name
function toggleClassElements(className, displayState) {
  let elements = document.getElementsByClassName(className);
  for (let i = 0; i < elements.length; i++) elements[i].style.display = displayState;
}

function getId(id) { return document.getElementById(id); } // Get Html element by Id

