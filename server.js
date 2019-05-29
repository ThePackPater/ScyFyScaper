// Dependencies
const express = require("express");
const logger = require("morgan");
const mongoose = require("mongoose");

const axios = require("axios");
const cheerio = require("cheerio");

const exphbs = require("express-handlebars");

//Models req
const Note = require("./models/note");
const Article = require("./models/article");

const port = process.env.PORT || 3000;

// Initialize Express
const app = express();

// Use morgan logger for logging requests
app.use(logger("dev"));

// Parse request body as JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Make public a static folder
app.use(express.static("public"));

// Connect to the Mongo DB
var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/mongoHeadlines";

mongoose.connect(MONGODB_URI, { useNewUrlParser: true });

mongoose.set('useCreateIndex', true);

// if (process.env.MONGODB_URI) {
//   mongoose.connect(process.env.MONGODB_URI);
// } else {
//   mongoose.connect("mongodb://localhost/scraper", { useNewUrlParser: true });
// }

// mongoose.Promise = Promise;
// const db = mongoose.connection;

// db.on("error", function(error) {
//   console.log("Mongoose Error: ", error);
// });

// db.once("open", function() {
//   console.log("Mongoose connection successful.");
// });

// app set-ups
app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");
app.listen(port, function() {
  console.log("Listening on port " + port);
});

// Routes
app.get("/", function(req, res) {
  Article.find({}, null, { sort: { created: -1 } }, function(err, data) {
    if (data.length === 0) {
      res.render("placeholder", {
        message:
          'Nothing scraped yet. Please click "Scrape For Newest Articles" for news.',
      });
    } else {
      res.render("index", { articles: data });
    }
  });
});

app.get("/scrape", function(req, res) {
  axios.get("https://www.nytimes.com/section/world", function(
    error,
    response,
    html
  ) {
    const $ = cheerio.load(html);
    const result = {};
    $("div.story-body").each(function(i, element) {
      const link = $(element)
        .find("a")
        .attr("href");
      const title = $(element)
        .find("h2")
        .text()
        .trim();
      const summary = $(element)
        .find("p")
        .text()
        .trim();
      const img = $(element)
        .parent()
        .find("figure.media")
        .find("img")
        .attr("src");
      result.link = link;
      result.title = title;
      if (summary) {
        result.summary = summary;
      }
      if (img) {
        result.img = img;
      } else {
        result.img = $(element)
          .find(".wide-thumb")
          .find("img")
          .attr("src");
      }
      const entry = new Article(result);
      Article.find({ title: result.title }, function(err, data) {
        if (data.length === 0) {
          entry.save(function(err, data) {
            if (err) throw err;
          });
        }
      });
    });
    console.log("Scraped.");
    res.redirect("/");
  });
});

app.get("/saved", function(req, res) {
  Article.find({ issaved: true }, null, { sort: { created: -1 } }, function(
    err,
    data
  ) {
    if (data.length === 0) {
      res.render("placeholder", {
        message:
          'No saved articles. Try to save some news by clicking "Save Article"!',
      });
    } else {
      res.render("saved", { saved: data });
    }
  });
});

app.get("/:id", function(req, res) {
  Article.findById(req.params.id, function(err, data) {
    res.json(data);
  });
});

app.post("/search", function(req, res) {
  console.log(req.body.search);
  Article.find(
    { $text: { $search: req.body.search, $caseSensitive: false } },
    null,
    { sort: { created: -1 } },
    function(err, data) {
      console.log(data);
      if (data.length === 0) {
        res.render("placeholder", {
          message: "No Results. Try other keywords.",
        });
      } else {
        res.render("search", { search: data });
      }
    }
  );
});

app.post("/save/:id", function(req, res) {
  Article.findById(req.params.id, function(err, data) {
    if (data.issaved) {
      Article.findByIdAndUpdate(
        req.params.id,
        { $set: { issaved: false, status: "Save Article" } },
        { new: true },
        function(err, data) {
          res.redirect("/");
        }
      );
    } else {
      Article.findByIdAndUpdate(
        req.params.id,
        { $set: { issaved: true, status: "Saved" } },
        { new: true },
        function(err, data) {
          res.redirect("/saved");
        }
      );
    }
  });
});

app.post("/note/:id", function(req, res) {
  const note = new Note(req.body);
  note.save(function(err, doc) {
    if (err) throw err;
    Article.findByIdAndUpdate(
      req.params.id,
      { $set: { note: doc._id } },
      { new: true },
      function(err, newdoc) {
        if (err) throw err;
        else {
          res.send(newdoc);
        }
      }
    );
  });
});

app.get("/note/:id", function(req, res) {
  const id = req.params.id;
  Article.findById(id)
    .populate("note")
    .exec(function(err, data) {
      res.send(data.note);
    });
});
