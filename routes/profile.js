const express = require("express");
const app = express();
var router = express.Router();

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

async function  sendmessage(number , message) {
  try {
    


    const apiUrl = 'https://wapi.kamingo.in/send-message'; // Replace with the actual API URL

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ number: number, message: message }),
    });



    if (response.ok) {
      const responseData = await response.json();
      console.log('API Response:', responseData);

    } else {
      console.error('API Error:', response.status);
      // Send a JSON response with status 'error'
    }
  } catch (error) {
    console.error('Error:', error);

  }
}






module.exports = router