import express from "express";
import axios from "axios";
import morgan from "morgan";
import fs from "fs";
import csv from "csv-parser";

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
// Generate an API Key and update user.csv with new the new key
generateApiKey()
  .then((apiKey) => {
    if (apiKey) {
      return updateUserAPIKey(yourUsername, apiKey);
    } else {
      throw new Error("Failed to generate API key"); // This line only executes if no specific error message is received from the API
    }
  })
  .then(() => {
    console.log("API Key update successful");
  })
  .catch((err) => {
    console.error("Error updating API Key:", err.message);
  });

// Generate a Bearer Token

/* FUNCTIONS */

// Register a new user
async function registerUser(username, password) {
  try {
    const response = await axios.post(API_URL + "/register", {
      username: username,
      password: password,
    });
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
      fs.accessSync("users.csv", fs.constants.R_OK | fs.constants.W_OK);
    } catch (err) {
      fs.writeFileSync("users.csv", "");
    }

    checkUserExists(username)
      .then((userInfo) => {
        if (userInfo) {
          yourUsername = userInfo.username;
          yourPassword = userInfo.password;
          yourAPIKey = userInfo.apiKey;
          yourBearerToken = userInfo.bearerToken;
          console.log(`Username: ${yourUsername}`);
          console.log(`Password: ${yourPassword}`);
          console.log(`API Key: ${yourAPIKey || "N/A"}`);
          console.log(`Bearer Token: ${yourBearerToken || "N/A"}`);
        } else {
          console.log("User not found in local database");
        }
      })
      .catch((err) => {
        console.error("Error:", err);
      });

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
    const results = [];

    fs.createReadStream("users.csv")
      .pipe(csv())
      .on("data", (data) => results.push(data))
      .on("end", () => {
        const userInfo = results.find((user) => user.Username === username);
        if (userInfo) {
          console.log(
            `User found in local database: Username: ${userInfo.Username}`
          );
          resolve({
            username: userInfo.Username,
            password: userInfo.Password,
            apiKey: userInfo["API Key"],
            bearerToken: userInfo["Bearer Token"],
          });
        } else {
          console.log(
            `User not found in local database for username: ${username}`
          );
          resolve(null);
        }
      })
      .on("error", (error) => {
        console.error("Error reading CSV file:", error);
        reject(error);
      });
  });
}

function saveUserToFile(username, password, apiKey = "", bearerToken = "") {
  const userData = `Username: ${username},Password: ${password},API Key: ${apiKey},Bearer Token: ${bearerToken}\n`;
  fs.appendFile("users.csv", userData, (err) => {
    if (err) {
      console.error("Error writing to file:", err);
    } else {
      console.log(
        `Logged new user successfully: Username: ${username}, Password: ${password}`
      );
    }
  });
}

// Generate an API Key
async function generateApiKey() {
  try {
    const response = await axios.get(API_URL + "/generate-api-key");
    const data = response.data;

    if (response.status === 200 && data.apiKey) {
      console.log(`API key generated: ${data.apiKey}`);
      return data.apiKey;
    } else {
      throw new Error(data.error || "Failed to generate API key");
    }
  } catch (error) {
    console.error("Error:", error.message);
    return null;
  }
}

function updateUserAPIKey(username, newAPIKey) {
  return new Promise((resolve, reject) => {
    fs.readFile("users.csv", "utf8", (err, data) => {
      if (err) {
        reject(err);
        return;
      }

      const lines = data.split("\n");
      const updatedLines = lines.map((line) => {
        if (line.trim() === "") {
          return line;
        }

        const [csvUsername, password, oldAPIKey, ...rest] = line.split(",");
        if (csvUsername === username) {
          const updatedLine = `${csvUsername},${password},${newAPIKey},${rest.join(
            ","
          )}`;
          console.log(`Updated line: ${updatedLine}`);
          return updatedLine;
        }
        return line;
      });

      const updatedData = updatedLines.join("\n");

      fs.writeFile("users.csv", updatedData, (err) => {
        if (err) {
          reject(err);
          return;
        }
        console.log(`Updated API Key for user ${username} to ${newAPIKey}`);
        resolve();
      });
    });
  });
}

/* ROUTES */

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
