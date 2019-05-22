const express = require("express");

const PORT = process.env.PORT || 8080;

const app = express();

const cheerio = require("cheerio");

const axios = require("axios");

// Serve static content for the app from the "public" directory in the application directory.
app.use(express.static("public"));

// Parse application body as JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Set Handlebars.
const exphbs = require("express-handlebars");

app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");

console.log("\n***********************************\n" +
            "Grabbing every thread name and link\n" +
            "from ScyFy.com:" +
            "\n***********************************\n");

// Making a request via axios.
axios.get("https://www.syfy.com").then(function(response) {

  // Load the Response into cheerio and save it to a variable
  const $ = cheerio.load(response.data);

  // An empty array to save the data
  const results = [];

  // With cheerio, find each p-tag with the "title" class
  // (i: iterator. element: the current element)
  $("p.title").each(function(i, element) {

    // Save the text of the element in a "title" variable
    const title = $(element).text();

    // In the currently selected element, look at its child elements (i.e., its a-tags),
    // then save the values for any "href" attributes that the child elements may have
    const link = $(element).children().attr("href");

    // Save these results in an object that we'll push into the results array we defined earlier
    results.push({
      title: title,
      link: link
    });
  });

  console.log(results);
});

// Import routes and give the server access.
const routes = require("./controllers/Controller.js");

app.use(routes);

app.listen(PORT, function() {

  console.log("Server listening on: http://localhost:" + PORT);
});