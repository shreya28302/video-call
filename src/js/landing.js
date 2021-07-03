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

let i = 0;
let txt = getRandomNumber(4) + getRandomWord(8) + getRandomNumber(4);
let speed = 100;

typeWriter();

function typeWriter() {
  if (i < txt.length) {
    document.getElementById("roomName").value += txt.charAt(i);
    i++;
    setTimeout(typeWriter, speed);
  }
}


