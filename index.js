require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");
const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const port = process.env.PORT || 5000;

// middleware
app.use(
  cors({
    origin: "http://localhost:5173", // Use your frontend origin here
    credentials: true, // Allow credentials
  })
);
app.use(express.json());
app.use(cookieParser());
const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASS}@cluster0.hmqrzhm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect(); //when it deploy it is commented

    const membersCollection = client.db("Cpi-it-club").collection("members");
    const coursesCollection = client.db("Cpi-it-club").collection("courses");
    const classesCollection = client.db("Cpi-it-club").collection("classes");
    const eventsCollection = client.db("Cpi-it-club").collection("events");
    const noticeCollection = client.db("Cpi-it-club").collection("notice");

    // notice get---->
    app.get("/notice", async (req, res) => {
      const result = await noticeCollection.find().toArray();
      res.send(result);
    });

    // event get --->
    app.get("/events", async (req, res) => {
      const result = await eventsCollection.find().toArray();
      res.send(result);
    });


    // classes get --->
    app.get("/classes", async (req, res) => {
      const result = await classesCollection.find().toArray();
      res.send(result);
    });

    // courses get ---->
     app.get("/courses", async (req, res) => {
       const result = await coursesCollection.find().toArray();
       res.send(result);
     });






    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

// listing ----->

app.get("/", (req, res) => {
  res.send("Club Is Running");
});

app.listen(port, () => {
  console.log(`App is running by ${port} port`);
});
