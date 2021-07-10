# Teams

This is a webRTC based video calling website where the users can register and get logged in to their user page. They can either create a new room or use their previous rooms to join a call and chat. The users have the capabiltiy to mute and hide. This implementation also consists of a real time chat and file share functionality. 

<h1>https://evening-basin-41332.herokuapp.com/</h1> <br />

# Features and Functionalities
* Multi-participants 
* Unlimited number of rooms 
* Unlimited duration calls 
* Copy the link and share it with your friends 
* Toggling your audio/video stream 
* Mute and Hide Everyone 
* Chat and File Share in real-time 
* Chat before and after the meeting 
* Send individual messages to the participants online in the room 
* Screen Sharing 
* Recording your stream, audio and video 
* Full Screen Mode on double click on the video  
* Desktop compatible

# Demo
* Open https://evening-basin-41332.herokuapp.com/
* Create an account
* Set a meeting name to create your name
* Click on call button and give access to camera and microphone to join call
* Click on chat button to chat before the meeting starts and as well as after the meeting ends
* Share the room link for others to join 

# ScreenShots

# Getting Started
* You need to have Node.js installed
* clone this repo
git clone https://github.com/shreya28302/video-call.git
cd server
* create a .env file in the server folder and add the below lines to the file
* if you want to use ngrok and turn create the accounts and fill yours
* Then enable NGROK_ENABLED = true and TURN_ENABLED = true
# Ngrok
# 1. Goto https://ngrok.com
# 2. Get started for free 

NGROK_ENABLED=true|false
NGROK_AUTH_TOKEN=YourNgrokAuthToken

# Turn
# 1. Goto http://numb.viagenie.ca/
# 2. Create an account

TURN_ENABLED=true|false
TURN_URLS=turn:numb.viagenie.ca
TURN_USERNAME=YourNumbUsername
TURN_PASSWORD=YourNumbPassword
* Install dependencies
npm install
* Start the server
npm start
* open http://localhost:4000 in your browser

# Tech Stack
* Node.js 
* Web RTC 
* Socket.io 
* Firebase - for database 
* Heroku - for hosting
