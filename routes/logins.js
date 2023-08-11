const express = require("express");
var router = express.Router();
const session = require("express-session");
const FileStore = require('session-file-store')(session);
var con = require("../database.js");
const fetch = require('node-fetch');


var randomCode;

router.use(express.urlencoded({ extended: true }));
router.use(session({
    secret: 'your-secret-key',
    store: new FileStore({
      path: '/session/bundeli', // Choose a directory to store session files
      ttl: 86400 // Session expiration time in seconds (optional)
    }),
    resave: false,
    saveUninitialized: true
  }));
  

function executeQuery(query) {
  return new Promise((resolve, reject) => {
    con.query(query, (err, result, fields) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}
async function sendmessage(number, message) {
  try {
    const apiUrl = "https://wapi.kamingo.in/send-message"; // Replace with the actual API URL

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ number: number, message: message }),
    });

    if (response.ok) {
      const responseData = await response.json();
      console.log("API Response:", responseData);
    } else {
      console.error("API Error:", response.status);
      // Send a JSON response with status 'error'
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

router.post("/sendcode", async (req, res) => {
  console.log(req.body.phonenumber);
  const { phonenumber } = req.body;

  req.session.phoneNumber = phonenumber;

  const generateRandomCode = () => {
    const codeLength = 4;
    let code = "";
    for (let i = 0; i < codeLength; i++) {
      code += Math.floor(Math.random() * 10); // Generate a random digit (0-9)
    }
    return code;
  };

  randomCode = generateRandomCode();

  const message =
    "Your Bundeli Kisan Authentication Code is : " + "*" + randomCode + "*";


  sendmessage(phonenumber, message)
    .then(() => {
      console.log("Message sent successfully");
      const result = executeQuery(
        `SELECT * FROM chats WHERE number='${phonenumber}'`
      );

      if (result.length < 1) {
        executeQuery(`INSERT INTO chats (number) VALUES ('${phonenumber}')`);
      }

      res.render("logins/typecode", { number: phonenumber});
    })
    .catch((error) => {
      console.error("Error sending message:", error);
      res.sendStatus(500); // Send an error response to the client
    });
});

router.post("/numberlogin", async (req, res) => {
  const { code, phonenumber } = req.body;

  const user = await executeQuery(
    `SELECT * FROM kissans WHERE number='${phonenumber}'`
  );

  if (code === randomCode) {
    if (user.length > 0) {
      res.redirect("/home");
    } else {
      res.redirect("/createprofile");
    }
  } else {
    res.render("logins/whatsapplogin");
  }
});

router.get("/whatsapplogin", async (req, res) => {
  res.render("logins/whatsapplogin");
});

router.get("/expertlogin", async (req, res) => {
  res.render("logins/expertlogin");
});

router.post("/expertlogin", async (req, res) => {
  const { name, password } = req.body;

  const expert = await executeQuery(
    `SELECT * FROM experts WHERE user='${name}' AND pass='${password}'`
  );

  console.log(expert);

  if (expert.length > 0) {
    res.redirect("/expert");
  } else {
    res.redirect("/");
  }
});

module.exports = router;
