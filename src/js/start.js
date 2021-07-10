$(document).ready(function(){
    $('.login-info-box').fadeOut();
    $('.login-show').addClass('show-log-panel');
});


$('.login-reg-panel input[type="radio"]').on('change', function() {
    if($('#log-login-show').is(':checked')) {
        $('.register-info-box').fadeOut(); 
        $('.login-info-box').fadeIn();
        
        $('.white-panel').addClass('right-log');
        $('.register-show').addClass('show-log-panel');
        $('.login-show').removeClass('show-log-panel');
        
    }
    else if($('#log-reg-show').is(':checked')) {
        $('.register-info-box').fadeIn();
        $('.login-info-box').fadeOut();
        
        $('.white-panel').removeClass('right-log');
        
        $('.login-show').addClass('show-log-panel');
        $('.register-show').removeClass('show-log-panel');
    }
});

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

let loginBtn = document.getElementById("loginBtn");
let signupBtn = document.getElementById("signupBtn");

// login
loginBtn.addEventListener("click", async(e) => {
    e.preventDefault();
    const email = document.getElementById('login_email').value;
    const password = document.getElementById('login_password').value;

    auth.signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
        window.location.href = '/main';
    })
    .catch((error) => {
        document.getElementById('login_email').value = "";
        document.getElementById('login_password').value = "";
        alert(error);
    });

});

// signup 
signupBtn.addEventListener("click", async(e) => {
    e.preventDefault();
    const email = document.getElementById('signup_email').value;
    const username = document.getElementById('signup_username').value;
    const password = document.getElementById('signup_password').value;

    const snapshot = await firestore.collection('users').where('username', '==', username).get();
    if (snapshot.empty) {
    
        auth.createUserWithEmailAndPassword(email, password)
        .then( (userCredential) => {
            // store username email to the database
            const user = userCredential.user;
            const currentUser = firestore.collection('users').doc(`${user.uid}`);
            const snapshot = currentUser.get();
            if (!snapshot.exists) {
                try {
                    currentUser.set({ email, username, password });
                } 
                catch (error) {
                    console.log(error);
                }
            }
            
            setTimeout(() => { window.location.href = '/main'}, 2000);  
            document.getElementById('signup_email').value = "";
            document.getElementById('signup_username').value = "";
            document.getElementById('signup_password').value = "";

        })
        .catch((error) => {
            document.getElementById('signup_email').value = "";
            document.getElementById('signup_username').value = "";
            document.getElementById('signup_password').value = "";
            alert(error);
        });
    }
    else {
        document.getElementById('signup_email').value = "";
        document.getElementById('signup_username').value = "";
        document.getElementById('signup_password').value = "";
        alert('Username already in use');
    }    
       
});


