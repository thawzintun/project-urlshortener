require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const bodyParser = require("body-parser");
const router = express.Router();
const dns = require("dns");
const mongoose = require("mongoose");
const { URL } = require("url");

mongoose.connect(process.env.MONGODB_URI);

const urlSchema = new mongoose.Schema({
    original_url: String,
    short_url: Number,
});

const Url = mongoose.model("Url", urlSchema);

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use(bodyParser.urlencoded({ extended: "false" }));
app.use(bodyParser.json());

app.use("/public", express.static(`${process.cwd()}/public`));

app.get("/", function (req, res) {
    res.sendFile(process.cwd() + "/views/index.html");
});

// Your first API endpoint
app.get("/api/hello", function (req, res) {
    res.json({ greeting: "hello API" });
});

app.get("/api/shorturl/:urlNumber", (req, res) => {
    const { urlNumber } = req.params;
    if (urlNumber === 0) {
        return res.json({
            error: "Wrong format",
        });
    }
    Url.findOne({ short_url: urlNumber }).then((result) => {
        if (!result) {
            return res.json({
                error: "No short URL found for the given input",
            });
        }
        return res.redirect(result.original_url);
    });
});

app.post("/api/shorturl", (req, res) => {
    const { url } = req.body;
    let urlData;
    if ((!url.startsWith("http://") && !url.startsWith("https://")) || !url) {
        return res.json({
            error: "Invalid URL",
        });
    }
    Url.findOne({ original_url: new URL(url).origin }).then((result) => {
        if (result) {
            return res.json({
                original_url: result.original_url,
                short_url: result.short_url,
            });
        }
        dns.lookup(new URL(url).hostname, async (err, address, family) => {
            // console.log(err, address, family);
            if (err) {
                return res.json({
                    error: "Invalid Hostname",
                });
            }
            const totalUrls = await Url.countDocuments({});
            urlData = {
                original_url: new URL(url).origin,
                short_url: totalUrls + 1,
            };
            await Url.create(urlData);
            return res.json({
                original_url: new URL(url).origin,
                short_url: totalUrls + 1,
            });
        });
    });
});

app.listen(port, function () {
    console.log(`Listening on port ${port}`);
});
