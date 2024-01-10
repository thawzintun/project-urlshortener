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

app.post("/api/shorturl", async (req, res) => {
    const { url } = req.body;
    let urlData;
    if ((!url.startsWith("http://") && !url.startsWith("https://")) || !url) {
        return res.json({
            error: "Invalid URL",
        });
    }
    const oldData = await Url.findOne({
        original_url: new URL(url).origin,
    }).then((result) => {
        if (result) {
            return res.json({
                original_url: result.original_url,
                short_url: result.short_url,
            });
        }
    });
    !oldData &&
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
                short_url: totalUrls,
            };
            const insertNew = await Url.create(urlData);
            res.json({
                original_url: new URL(url).origin,
                short_url: totalUrls,
            });
        });
});

app.get("/api/shorturl/:short_url", async (req, res) => {
    const { short_url } = req.params;
    if (short_url === 0) {
        return res.json({
            error: "Wrong format",
        });
    }
    const data = await Url.findOne({ short_url: +short_url }).then((result) => {
        if (!result) {
            return res.json({
                error: "No short URL found for the given input",
            });
        }
        return result;
    });
    return res.redirect(data.original_url);
});

app.listen(port, function () {
    console.log(`Listening on port ${port}`);
});
