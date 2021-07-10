$(function(){
 $("a[data-toggle='tooltip']").tooltip();
});
 
function getRandom(length) {
  let result = "";
  let characters = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  let charactersLength = characters.length;
  for (let i = 0; i < length; i++) result += characters.charAt(Math.floor(Math.random() * charactersLength));
  return result;
}

let roomId = getRandom(16); // Generate random room ID
document.getElementById("roomName").value = "";

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

const name = document.getElementById("username");
const logoutBtn = document.getElementById("logoutBtn");
const createBtn = document.getElementById("createBtn");
let meetingsDiv = document.getElementById("meetingsDiv");

let myName;
let port = 4000; // must be same of server 
let server = "http" + (location.hostname == "localhost" ? "" : "s") + "://" + location.hostname + (location.hostname == "localhost" ? ":" + port : "");

auth.onAuthStateChanged((user) => {

  if (user) {
    firestore.collection('users').doc(`${user.uid}`).get()
    .then((snapshot) => {
      console.log(snapshot.data().username);
      let n = `<li><a type="text" href="/main" style="color:white; font-weight:bold; font-size:1.5em;">${snapshot.data().username}</a></li>`
      name.innerHTML = n;
      myName = snapshot.data().username;
      loadMeetings();
    });
    //console.log('Logged In');
  } 
  else window.location.href='/';

});

// logout 
logoutBtn.addEventListener("click", async (e) => {
  e.preventDefault();

  try {
    await auth.signOut();
    alert('Log Out!');
    window.location.href = '/';
  } 
  catch (err) {
    alert(err);
  }
  
});

// creates a room - this gets appended in your user page
createBtn.addEventListener("click", async (e) => {
  e.preventDefault();

  if(document.getElementById("roomName").value.trim() === ""){
    alert('Please enter a valid room name');
    document.getElementById("roomName").value = "";
    return;
  }

  let timerInterval;
  Swal.fire({ allowEscapeKey: false, allowEnterKey: false, allowOutsideClick: false, 
    background: "rgba(48, 48, 48)", position: "top", title: `Creating room`, 
    timer: 2000, 
    didOpen: () => { Swal.showLoading(); timerInterval = setInterval(() => {
      let roomName = document.getElementById("roomName").value.trim(); // set room name
      // store the created room information 
      const mymeetings = firestore.collection(`${myName}`).doc(`${roomId}`);
      const snapshot = mymeetings.get();
      let timestamp = Date.now();
      let createdBy = myName;
      let date = new Date().toString().slice(0,-34);
      if (!snapshot.exists) {
        try {
          mymeetings.set({ roomId, timestamp, date, roomName, createdBy });
        } catch (err) {
          console.log(err);
        }
      }
      
      // store room Id and room name
      const meetings = firestore.collection('meetings').doc(`${roomId}`);
      const shot = meetings.get();
      if (!shot.exists) {
        try {
          meetings.set({ roomId, roomName, createdBy });
        } catch (err) {
          console.log(err);
        }
      }

    }, 100); },
    willClose: () => { clearInterval(timerInterval); }, 
  }).then(() => {
      window.location.href = '/main';     
  });
  
})

// loads all the rooms that a particular user has created and attended
// with the latest room at the top of the userpage
function loadMeetings() {
  firestore.collection(`${myName}`).orderBy('timestamp', 'desc').get()
  .then(function(snapshot) {
    snapshot.forEach(function(doc) {
      console.log(doc.data().roomId);
      let callLink = `${server}` + '/join/' + `${doc.data().roomId}`;
      let chatLink = `${server}` + '/chat/' + `${doc.data().roomId}`;
      let meetdiv = `
      <div class="col-sm-6">
        <div class="panel">
          <div style="background-color:#FFF8DC" class="panel-body p-t-10">
              <div class="media-main">
                  <div class="pull-right btn-group-sm">
                      <a href="${callLink}" class="btn btn-success tooltips" data-placement="top" data-toggle="tooltip" data-original-title="Edit">
                          <i class="fa fa-phone"></i>
                      </a>
                      <a href="${chatLink}" class="btn btn-danger tooltips" data-placement="top" data-toggle="tooltip" data-original-title="Delete">
                          <i class="fa fa-comment"></i>
                      </a>
                  </div>
                  <div class="info">
                      <h4>${doc.data().roomName}</h4>
                      <i style="font-size:0.75em">${doc.data().roomId}</i>
                      <i style="font-size:0.85em">- by ${doc.data().createdBy}</i>
                      <p class="text-muted">${doc.data().date}</p>
                  </div>
              </div>
              <div class="clearfix">
                <button onclick="copyRoomURL('${callLink}')" class="btn btn-info">
                    copy call link
                </button>
                <button onclick="copyRoomURL('${chatLink}')" class="btn btn-info">
                    copy chat link
                </button>
              </div>
              <hr>
          </div>
        </div>
      </div>
      `;
      meetingsDiv.insertAdjacentHTML("beforeend", meetdiv);
    });
  });
}


// copy room url to clipboard
function copyRoomURL(url) {
  let tmpInput = document.createElement("input");
  document.body.appendChild(tmpInput);
  tmpInput.value = url;
  tmpInput.select();
  document.execCommand("copy");
  document.body.removeChild(tmpInput);
  notify("Meeting link copied");
}