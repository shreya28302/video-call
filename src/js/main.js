$(function(){
 $("a[data-toggle='tooltip']").tooltip();
});
 
function getRandomNumber(length) {
  let result = "";
  let characters = "0123456789";
  let charactersLength = characters.length;
  for (let i = 0; i < length; i++) result += characters.charAt(Math.floor(Math.random() * charactersLength));
  return result;
}

function getRandomWord(length) {
  let result = "";
  let characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  let charactersLength = characters.length;
  for (let i = 0; i < length; i++) result += characters.charAt(Math.floor(Math.random() * charactersLength));
  return result;
}

document.getElementById("roomName").value = "";
document.getElementById("chatroomName").value = "";

let i = 0;
let txt = getRandomNumber(4) + getRandomWord(8) + getRandomNumber(4);
let speed = 100;

typeWriter();

function typeWriter() {
  if (i < txt.length) {
    document.getElementById("roomName").value += txt.charAt(i);
    document.getElementById("chatroomName").value += txt.charAt(i);
    i++;
    setTimeout(typeWriter, speed);
  }
}


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

const logout_button = document.getElementById("logout_button");
const name = document.getElementById("username");
let myName;
let meetings = document.getElementById("meetings");
let serverPort = 4000; // must be same of server PORT
let server = getServerUrl();

// Get Server url
function getServerUrl() {
  return ( "http" + (location.hostname == "localhost" ? "" : "s") + "://" + location.hostname + (location.hostname == "localhost" ? ":" + serverPort : "") );
}

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
    console.log('Logged In');
  } 
  else {
    window.location.href='/';
  }

});


logout_button.addEventListener("click", async (e) => {
  e.preventDefault();

  try {
    await auth.signOut();
    console.log('Log Out!');
    window.location.href = '/';
  } 
  catch (err) {
    alert(err);
  }
  
})

function loadMeetings() {
  firestore.collection(`${myName}`).get()
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
                      <h4>${doc.data().roomId}</h4>
                  </div>
              </div>
              <div class="clearfix"></div>
              <hr>
          </div>
        </div>
      </div>
      `;
      meetings.insertAdjacentHTML("beforeend", meetdiv);
      meetings.scrollTop += 500;
    });
  });
}


