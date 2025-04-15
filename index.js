require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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

    // post notice------>
    app.post("/notice", async (req, res) => {
      const notice = req.body;
      if (!notice.title || !notice.date) {
        return res.status(400).json({ message: "Title and date are required" });
      }
      try {
        const result = await noticeCollection.insertOne(notice);
        res.send(result);
      } catch (error) {
        console.error("Failed to add notice:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    // delete a notice ---------->

    app.delete("/notice/:id", async (req, res) => {
      const id = req.params.id;
      try {
        const query = { _id: new ObjectId(id) };
        const result = await noticeCollection.deleteOne(query);
        if (result.deletedCount === 1) {
          res.send({ message: "Notice deleted", deletedId: id });
        } else {
          res.status(404).json({ message: "Notice not found" });
        }
      } catch (error) {
        console.error("Failed to delete notice:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    // event get --->
    app.get("/events", async (req, res) => {
      const result = await eventsCollection.find().toArray();
      res.send(result);
    });

    // event post --------->
    app.post("/events", async (req, res) => {
      const event = req.body;
      console.log(event);
      try {
        const result = await eventsCollection.insertOne(event);
        res.send(result);
      } catch (error) {
        console.error("Failed to add Event:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    // event delete ---------->
    app.delete("/events/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      try {
        const query = { _id: new ObjectId(id) };
        const result = await eventsCollection.deleteOne(query);
        if (result.deletedCount === 1) {
          res.send({ message: "Event deleted", deletedId: id });
        } else {
          res.status(404).json({ message: "Event not found" });
        }
      } catch (error) {
        console.error("Failed to delete Event:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    //  single event get ------->
    app.get("/events/:id", async (req, res) => {
      const id = req.params.id;
      try {
        const result = await eventsCollection.findOne({
          _id: new ObjectId(id),
        });
        if (result) {
          res.send(result);
        } else {
          res.status(404).send({ message: "Events not found" });
        }
      } catch (error) {
        res
          .status(500)
          .send({ error: "Failed to get Events", details: error.message });
      }
    });

    // classes get --->
    app.get("/classes", async (req, res) => {
      const result = await classesCollection.find().toArray();
      res.send(result);
    });

    // single class get ----------->
    app.get("/classes/:id", async (req, res) => {
      const id = req.params.id;
      try {
        const result = await classesCollection.findOne({
          _id: new ObjectId(id),
        });
        if (result) {
          res.send(result);
        } else {
          res.status(404).send({ message: "classes not found" });
        }
      } catch (error) {
        res
          .status(500)
          .send({ error: "Failed to get classes", details: error.message });
      }
    });

    // post a class-------->

    app.post("/classes", async (req, res) => {
      const classData = req.body;
      const result = await classesCollection.insertOne(classData);
      res.send(result);
    });

    // delete class -------->
    app.delete("/classes/:id", async (req, res) => {
      const { id } = req.params;
      try {
        const result = await classesCollection.deleteOne({
          _id: new ObjectId(id),
        });
        if (result.deletedCount === 0) {
          return res.status(404).json({ message: "Class not found" });
        }
        res.status(200).json({ message: "Class deleted successfully" });
      } catch (error) {
        console.error("Delete error:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    // update the class

    app.patch("/classes/:id", async (req, res) => {
      const id = req.params.id;
      const updatedData = req.body;
      try {
        const result = await classesCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedData }
        );
        res.send(result);
      } catch (err) {
        res.status(500).send({ message: "Failed to update class" });
      }
    });

    // courses get ---->
    app.get("/courses", async (req, res) => {
      const result = await coursesCollection.find().toArray();
      res.send(result);
    });
    // single courses get --->
    app.get("/courses/:id", async (req, res) => {
      const id = req.params.id;
      try {
        const result = await coursesCollection.findOne({
          _id: new ObjectId(id),
        });
        if (result) {
          res.send(result);
        } else {
          res.status(404).send({ message: "courses not found" });
        }
      } catch (error) {
        res
          .status(500)
          .send({ error: "Failed to get courses", details: error.message });
      }
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
