"use strict"; 

const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const app = express();

const compression = require("compression");
app.use(compression());

const path = require("path");
const http = require("http");
const server = http.createServer(app);

const { Server } = require("socket.io");
const io = new Server().listen(server);
const ngrok = require("ngrok");

let ngrokEnabled = process.env.NGROK_ENABLED;
let ngrokAuthToken = process.env.NGROK_AUTH_TOKEN;
let turnEnabled = process.env.TURN_ENABLED;
let turnUrls = process.env.TURN_URLS;
let turnUsername = process.env.TURN_USERNAME;
let turnCredential = process.env.TURN_PASSWORD;
let PORT = process.env.PORT || 4000; 

let channels = {}; 
let sockets = {}; 
let peers = {}; 

app.use(express.static(path.join(__dirname, "src"))); // to use static files
app.use(express.json()); // to parse the data from request body to json

// Remove trailing slashes in url handle bad requests
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    console.log("Request Error", { header: req.headers, body: req.body, error: err.message, });
    return res.status(400).send({ status: 404, message: err.message }); // Bad request
  }
  if (req.path.substr(-1) === "/" && req.path.length > 1) {
    let query = req.url.slice(req.path.length);
    res.redirect(301, req.path.slice(0, -1) + query);
  } else {
    next();
  }
});

app.get(["/"], (req, res) => { res.sendFile(path.join(__dirname, "src/start.html")) });
app.get(["/main"], (req, res) => { res.sendFile(path.join(__dirname, "src/main.html")) });
app.get("/join/", (req, res) => { res.redirect("/main"); });
app.get("/join/*", (req, res) => {
  if (Object.keys(req.query).length > 0) {
    console.log("redirect:" + req.url + " to " + url.parse(req.url).pathname);
    res.redirect(url.parse(req.url).pathname);
  } else res.sendFile(path.join(__dirname, "src/call.html")); 
});
app.get("/chat/", (req, res) => { res.redirect("/main"); });
app.get("/chat/*", (req, res) => {
  if (Object.keys(req.query).length > 0) {
    console.log("redirect:" + req.url + " to " + url.parse(req.url).pathname);
    res.redirect(url.parse(req.url).pathname);
  } else res.sendFile(path.join(__dirname, "src/chat.html")); 
});

// stun-turn server
let iceServers = [{ urls: "stun:stun.l.google.com:19302" }];
if (turnEnabled == "true") iceServers.push({ urls: turnUrls, username: turnUsername, credential: turnCredential, });

// Expose server to external with https tunnel using ngrok
async function startngrok() {
  try {
    await ngrok.authtoken(ngrokAuthToken);
    await ngrok.connect(PORT);
    let data = await ngrok.getApi().listTunnels();
    let pu0 = data.tunnels[0].public_url;
    let pu1 = data.tunnels[1].public_url;
    let tunnelHttps = pu0.startsWith("https") ? pu0 : pu1;
    console.log(tunnelHttps);
  } 
  catch (err) {
    console.error(err);
  }
}

// Start Local Server 
server.listen(PORT, null, () => { 
  console.log(`Running at ${PORT}`); 
  if (ngrokEnabled == "true") startngrok();
});

// users get connected to the server
// they give a 'join' signal to join a particular channel
// server keeps track of all sockets who are in a channel
// on join server sends 'add' signals to each pair of users in channel 
// users set up an RTCPeerConnection with one another  
// they have to relay ICECandidate and SessionDescription information to one another
// the peer connection is completed and the streaming starts
 
// connected
io.sockets.on("connect", (socket) => {

  socket.channels = {};
  sockets[socket.id] = socket;

  // diconnected
  socket.on("disconnect", () => {
    for (let channel in socket.channels) removePeerFrom(channel);
    delete sockets[socket.id];
  });

  // join
  socket.on("join", (config) => {

    let channel = config.channel;
    let peer_name = config.peerName;
    let peer_video = config.peerVideo;
    let peer_audio = config.peerAudio;
    let peer_hand = config.peerHand;

    if (channel in socket.channels) return;
    
    if (!(channel in channels)) channels[channel] = {}; // no channel in channels
    if (!(channel in peers)) peers[channel] = {}; // no channel in peers 

    // collect peers info grp by channels
    peers[channel][socket.id] = { peer_name: peer_name, peer_video: peer_video, peer_audio: peer_audio, peer_hand: peer_hand, };

    for (let id in channels[channel]) {
      channels[channel][id].emit("add", { peer_id: socket.id, peers: peers[channel], should_create_offer: false, iceServers: iceServers, });
      socket.emit("add", { peer_id: id, peers: peers[channel], should_create_offer: true, iceServers: iceServers, });
    }

    channels[channel][socket.id] = socket;
    socket.channels[channel] = channel;
  });

  // remove from channel 
  async function removePeerFrom(channel) {
    
    if (!(channel in socket.channels)) return;
    
    delete socket.channels[channel];
    delete channels[channel][socket.id];
    delete peers[channel][socket.id];

    if (Object.keys(peers[channel]).length === 0) delete peers[channel]; // remove if no channel in peers
    
    for (let id in channels[channel]) {
      await channels[channel][id].emit("remove", { peer_id: socket.id });
      await socket.emit("remove", { peer_id: id });
    }
  }

  // relay ICE to peers
  socket.on("ICE", (config) => {
    let peer_id = config.peer_id;
    let ice_candidate = config.ice_candidate;
    if (peer_id in sockets) sockets[peer_id].emit("iceCandidate", { peer_id: socket.id, ice_candidate: ice_candidate, });  
  });

  // relay SDP to peers
  socket.on("SDP", (config) => {
    let peer_id = config.peer_id;
    let session_description = config.session_description;
    if (peer_id in sockets) sockets[peer_id].emit("sessionDescription", { peer_id: socket.id, session_description: session_description, });
  });

  // audio video hand status to peers
  socket.on("status", (config) => {
    let connections = config.connections;
    let room_id = config.room_id;
    let peer_name = config.peer_name;
    let element = config.element;
    let status = config.status;

    for (let peer_id in peers[room_id]) {
      if (peers[room_id][peer_id]["peer_name"] == peer_name) {
        switch (element) {
          case "video": peers[room_id][peer_id]["peer_video"] = status; break;
          case "audio": peers[room_id][peer_id]["peer_audio"] = status; break;
          case "hand": peers[room_id][peer_id]["peer_hand"] = status; break;
        }
    
      }
    }

    // peer that send this status
    if (Object.keys(connections).length != 0) {
      for (let peer_id in connections) {
        if (sockets[peer_id]) sockets[peer_id].emit("status", { peer_id: socket.id, peer_name: peer_name, element: element, status: status, });
      }
    }

  });

  // mute everyone in the room
  socket.on("muteEveryone", (config) => {
    let connections = config.connections;
    let room_id = config.room_id;
    let peer_name = config.peer_name;

    //  peer that send this status
    if (Object.keys(connections).length != 0) {
      for (let peer_id in connections) {
        if (sockets[peer_id]) sockets[peer_id].emit("muteEveryone", { peer_name: peer_name, });
      }
    }

  });

  // hide everyone in the room
  socket.on("hideEveryone", (config) => {
    let connections = config.connections;
    let room_id = config.room_id;
    let peer_name = config.peer_name;

    // peer that send this status
    if (Object.keys(connections).length != 0) {
      for (let peer_id in connections) {
        if (sockets[peer_id]) sockets[peer_id].emit("hideEveryone", { peer_name: peer_name, });
      }
    }

  });

  // kick out peer 
  socket.on("kickOut", (config) => {
    let room_id = config.room_id;
    let peer_id = config.peer_id;
    let peer_name = config.peer_name;

    if (peer_id in sockets) sockets[peer_id].emit("kickOut", { peer_name: peer_name, });
    
  });

  // File info
  socket.on("fileInfo", (config) => {
    let connections = config.connections;
    let room_id = config.room_id;
    let peer_name = config.peer_name;
    let file = config.file;

    if (Object.keys(connections).length != 0) {
      for (let peer_id in connections) {
        if (sockets[peer_id]) sockets[peer_id].emit("fileInfo", file);
      }
    }

  });

}); // end [sockets.on-connect]

