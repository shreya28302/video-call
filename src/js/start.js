"use strict";

const login_button = getId("login_button");
const signup_button = getId("signup_button");


function init() {
	setLoginButton();
	setSignupButton();
}

function setLoginButton() {

	login_button.addEventListener("click", async(e) => {
		e.preventDefault();
		const username = document.getElementById('login_username').value
		const password = document.getElementById('login_password').value

		const result = await fetch('/login', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ username, password})
		}).then((res) => res.json())

		if (result.status === 'ok') {
			// everythign went fine
			console.log('Got the token: ', result.data)
			localStorage.setItem('token', result.data)
			alert('Success')
			window.location.href = "/"
		} else alert(result.error)
	});
}

function setSignupButton() {

	signup_button.addEventListener("click", async(e) => {
		e.preventDefault()
		const username = document.getElementById('signup_username').value
		const password = document.getElementById('signup_password').value

		const result = await fetch('/register', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ username, password })
		}).then((res) => res.json())

		if (result.status === 'ok') {
			// everythign went fine
			alert('Success')
			window.location.href = "/"
		} else alert(result.error)
	});
}
// Get Html element by Id
function getId(id) { return document.getElementById(id); }