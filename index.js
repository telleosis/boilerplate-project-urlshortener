require("dotenv").config();
const express = require("express");
const MongoClient = require("mongodb").MongoClient;
const ObjectId = require("mongodb").ObjectId;
const Mongoose = require("mongoose");
const shortId = require("shortid");
const bodyParser = require("body-parser");
const validUrl = require("valid-url");
const cors = require("cors");
const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(
  bodyParser.urlencoded({
    extended: false,
  })
);
app.use(cors());
app.use(express.json());

const mySecret = process.env["MONGO_URI"];

Mongoose.connect(mySecret, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
});

const connection = Mongoose.connection;

connection.once("open", () => {
  console.log("MongoDB database connection established successfully");
});

app.use("/public", express.static(process.cwd() + "/public"));
app.get("/", function (req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

//Create Schema
const Schema = Mongoose.Schema;
const urlSchema = new Schema({
  original_url: String,
  short_url: String,
});
const URL = Mongoose.model("URL", urlSchema);

app.post("/api/shorturl", async function (req, res) {
  const url = req.body.url; //input
  const urlCode = shortId.generate();

  // check if the url is valid or not
  if (!validUrl.isWebUri(url)) {
    res.json({ error: "invalid url" });
  } else {
    try {
      // check if its already in the database
      let findOne = await URL.findOne({
        original_url: url,
      });
      if (findOne) {
        res.json({
          original_url: findOne.original_url,
          short_url: findOne.short_url,
        });
      } else {
        // if its not exist yet then create new one and response with the result
        findOne = new URL({
          original_url: url,
          short_url: urlCode,
        });
        await findOne.save();
        res.json({
          original_url: findOne.original_url,
          short_url: findOne.short_url,
        });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json("Server erorr...");
    }
  }
});

app.get("/api/shorturl/:short_url?", async function (req, res) {
  try {
    const urlParams = await URL.findOne({
      short_url: req.params.short_url,
    });
    if (urlParams) {
      return res.redirect(urlParams.original_url);
    } else {
      return res.status(404).json("No URL found");
    }
  } catch (err) {
    console.log(err);
    res.status(500).json("Server error");
  }
});

app.listen(port, () => {
  console.log(`Server is running on port : ${port}`);
});
