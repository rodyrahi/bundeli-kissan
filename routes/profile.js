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

app.get('/createprofile', async (req, res) => {
  const number =  req.session.phoneNumber;
  res.render('createprofile', { phonenumber: number });
});

app.post('/createprofile', async (req, res) => {
  const number =  req.session.phoneNumber;
  const { name, fathername, gender, dob, pincode, address } = req.body;

  await executeQuery(
    `INSERT INTO kissans (number,name , fathername , gender , dob , pincode , address) VALUES ('${number}','${name}','${fathername}' ,'${gender}' ,'${dob}','${pincode}','${address}')`
  );

  res.redirect('/home');
});

app.get('/userprofile', async (req, res) => {
  const number =  req.session.phoneNumber;
  const result = await executeQuery(
    `SELECT * FROM kissans WHERE number='${number}'`
  );

  console.log(result);

  res.render('userprofile', { phonenumber: number, user: result[0] });
});




module.exports = router