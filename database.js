var Host  = "165.232.151.6" 
var mysql = require("mysql");
var isWin = process.platform === "win32";

if (!isWin) {
  Host = "127.0.0.1"
  
}
console.log(Host);

var connection = mysql.createConnection({
  host: Host,
  user: "raj",
  password: "Kamingo@11",
  database: "bundeli",
  charset:"utf8mb4",
  timeout: 60000

});
connection.connect((err) => {
  if (err) {
    console.log(err);
    return;
  }
  
});
module.exports = connection;
