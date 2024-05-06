import express from "express";
import axios from "axios";
import morgan from "morgan";
import fs from "fs";

const app = express();
const port = process.env.PORT || 3000;
const API_URL = "https://secrets-api.appbrewery.com";

app.set("view engine", "ejs");
app.use(morgan("dev"));
app.use(express.static("public"));

//TODO 1: Fill in your values for the 3 types of auth.
let yourUsername = "testuser";
let yourPassword = "testpass";
let yourAPIKey = "";
let yourBearerToken = "";

// Register a new user and log them into user.txt
const result = await registerAndLogUser(yourUsername, yourPassword);
// Generate an API Key

// Generate a Bearer Token

/* FUNCTIONS */

// Register a new user
async function registerUser(username, password) {
  const url = API_URL + "/register";
  const body = { username: username, password: password };

  try {
    const response = await axios.post(url, body);
    const data = response.data;

    if (response.status === 200) {
      console.log(
        data.success + ` Username: ${username}, Password: ${password}`
      );
      return true;
    } else if (
      response.status === 401 &&
      data.error === "Username is already taken."
    ) {
      console.error(
        `${data.error} Username: ${username}, Password: ${password}`
      );
      return false;
    } else {
      console.error(data.error || "Registration failed");
      return false;
    }
  } catch (error) {
    if (error.response && error.response.data) {
      console.error(error.response.data.error || "An error occurred");
    } else {
      console.error("An error occurred");
    }
    return false;
  }
}

async function registerAndLogUser(username, password) {
  try {
    // Check if users.txt file exists, create an empty file if it doesn't
    try {
      fs.accessSync("users.txt", fs.constants.R_OK | fs.constants.W_OK);
    } catch (err) {
      fs.writeFileSync("users.txt", "");
    }

    const userExists = await checkUserExists(username);
    if (userExists) {
      yourUsername = username;
      yourPassword = password;
      return { username, password };
    }

    const success = await registerUser(username, password);
    if (success) {
      saveUserToFile(username, password);
      yourUsername = username;
      yourPassword = password;
      return { username, password };
    }
  } catch (error) {
    console.error("Error registering user:", error.message);
    yourUsername = "";
    yourPassword = "";
    return null;
  }
}

function checkUserExists(username) {
  return new Promise((resolve, reject) => {
    fs.readFile("users.txt", "utf8", (err, data) => {
      if (err) {
        reject(err);
        return;
      }

      const users = data.split("\n").filter((line) => line.trim() !== "");
      const userExists = users.some((line) =>
        line.includes(`Username: ${username}`)
      );

      if (userExists) {
        console.log(
          `User already exists in local database: Username: ${username}`
        );
      }

      resolve(userExists);
    });
  });
}

function saveUserToFile(username, password) {
  const userData = `Username: ${username}, Password: ${password}\n`;
  fs.appendFile("users.txt", userData, (err) => {
    if (err) {
      console.error("Error writing to file:", err);
    } else {
      console.log(
        `Logged new user successfully: Username: ${username}, Password: ${password}`
      );
    }
  });
}

/* WEB METHODS */

app.get("/", (req, res) => {
  res.render("index.ejs", { content: "API Response." });
});

app.get("/noAuth", async (req, res) => {
  //TODO 2: Use axios to hit up the /random endpoint
  //The data you get back should be sent to the ejs file as "content"
  //Hint: make sure you use JSON.stringify to turn the JS object from axios into a string.
  try {
    const response = await axios.get(API_URL + "/random");
    const content = JSON.stringify(response.data);

    res.render("index.ejs", { content: content });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Error fetching data");
  }
});

app.get("/basicAuth", (req, res) => {
  //TODO 3: Write your code here to hit up the /all endpoint
  //Specify that you only want the secrets from page 2
  //HINT: This is how you can use axios to do basic auth:
  // https://stackoverflow.com/a/74632908
  /*
   axios.get(URL, {
      auth: {
        username: "abc",
        password: "123",
      },
    });
  */
});

app.get("/apiKey", (req, res) => {
  //TODO 4: Write your code here to hit up the /filter endpoint
  //Filter for all secrets with an embarassment score of 5 or greater
  //HINT: You need to provide a query parameter of apiKey in the request.
});

app.get("/bearerToken", (req, res) => {
  //TODO 5: Write your code here to hit up the /secrets/{id} endpoint
  //and get the secret with id of 42
  //HINT: This is how you can use axios to do bearer token auth:
  // https://stackoverflow.com/a/52645402
  /*
  axios.get(URL, {
    headers: { 
      Authorization: `Bearer <YOUR TOKEN HERE>` 
    },
  });
  */
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
