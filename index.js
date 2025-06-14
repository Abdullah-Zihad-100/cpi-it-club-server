require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const nodemailer = require("nodemailer");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const port = process.env.PORT || 5000;

// middleware
app.use(
  cors({
    origin: ["http://localhost:5173", "https://cpi-it-club.netlify.app"], // client origins
    credentials: true,
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
    // await client.connect();

    const membersCollection = client.db("Cpi-it-club").collection("members");
    const coursesCollection = client.db("Cpi-it-club").collection("courses");
    const classesCollection = client.db("Cpi-it-club").collection("classes");
    const eventsCollection = client.db("Cpi-it-club").collection("events");
    const noticeCollection = client.db("Cpi-it-club").collection("notice");
    const usersCollection = client.db("Cpi-it-club").collection("users");
    const galleryCollection = client.db("Cpi-it-club").collection("gallery");
    const assignmentsCollection = client
      .db("Cpi-it-club")
      .collection("assignments");

    // middle ware ------------->

    // jwt verify token-------->
    const verifyToken = (req, res, next) => {
      const token = req.cookies.token;
      if (!token) return res.status(401).send({ message: "Unauthorized" });

      jwt.verify(token, process.env.JWT_SECRET, (err, decode) => {
        if (err) return res.status(403).send({ message: "Forbidden" });
        req.decode = decode;
        next();
      });
    };

    // admin middleware ------->
    const verifyAdmin = async (req, res, next) => {
      const email = req?.decode?.email;
      const user = await usersCollection.findOne({ email });
      if (!user || user?.role !== "admin") {
        return res.status(403).send({ message: "Forbidden: Admins only" });
      }
      next();
    };

    const sendEmail = (emailAddress, emailData) => {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });
      const htmlTemplate = `
    <div style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px;">
      <div style="max-width: 600px; margin: auto; background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.05);">
        <h2 style="color: #1e40af; text-align: center;">📩 New Contact Message</h2>
        <p style="text-align: center; color: #555;">Someone just reached out via your contact form.</p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #eaeaea;" />
        <p><strong>👤 Name:</strong> ${emailData.name}</p>
        <p><strong>📧 Email:</strong> ${emailData.email}</p>
        <p><strong>📝 Subject:</strong> ${emailData.subject}</p>
        <div style="margin-top: 20px;">
          <p style="font-weight: bold;">💬 Message:</p>
          <p style="background-color: #f1f5f9; padding: 15px; border-radius: 6px; border-left: 4px solid #3b82f6; color: #333;">
            ${emailData.message}
          </p>
        </div>
        <p style="margin-top: 30px; font-size: 13px; color: #999;">This email was automatically sent from your website contact form.</p>
      </div>
    </div>
  `;
      transporter.verify((error, success) => {
        if (error) {
          console.log(error);
        } else {
          console.log("Server is ready to take our message", success);
        }
      });
      const mailBody = {
        from: process.env.EMAIL_USER,
        to: emailAddress,
        subject: emailData?.subject,
        html: htmlTemplate,
      };
      transporter.sendMail(mailBody, (error, info) => {
        if (error) {
          console.log(error);
        } else {
          console.log("Email sent", info.response);
        }
      });
    };

    app.post("/try-contact", (req, res) => {
      const data = req.body;
      console.log(data);
      sendEmail(process.env.EMAIL_USER, data);
      res.send({ status: "success", message: "Email sent successfully!" });
    });

    // jwt create
    app.post("/jwt", (req, res) => {
      const user = req.body; // { email }
      const token = jwt.sign(user, process.env.JWT_SECRET, {
        expiresIn: "30d",
      });

      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production", // true in production
          sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // 🔥 fix here
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        })
        .send({ success: true });
    });

    // jaw delete
    // ✅ JWT Token Delete Route
    app.post("/logout", (req, res) => {
      res
        .clearCookie("token", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // 🔥 fix here too
        })
        .send({ success: true });
    });

    // notice get---->
    app.get("/notice", async (req, res) => {
      const result = await noticeCollection.find().toArray();
      res.send(result);
    });

    // post notice------>
    app.post("/notice", verifyToken, verifyAdmin, async (req, res) => {
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

    app.delete("/notice/:id", verifyToken, verifyToken, async (req, res) => {
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
    app.post("/events", verifyToken, verifyAdmin, async (req, res) => {
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
    app.delete("/events/:id", verifyToken, verifyAdmin, async (req, res) => {
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

    // course delete
    app.delete("/course/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      console.log(id);
      try {
        const query = { _id: new ObjectId(id) };
        const result = await coursesCollection.deleteOne(query);
        if (result.deletedCount === 1) {
          res.send({ message: "Course deleted", deletedId: id });
        } else {
          res.status(404).json({ message: "Course not found" });
        }
      } catch (error) {
        console.error("Failed to delete Course:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    //  single event get ------->
    app.get("/event/:id", verifyToken, async (req, res) => {
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
    app.get("/classes", verifyToken, async (req, res) => {
      const result = await classesCollection.find().toArray();
      res.send(result);
    });

    // single class get ----------->
    app.get("/classes/:id", verifyToken, async (req, res) => {
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

    app.post("/classes", verifyToken, verifyAdmin, async (req, res) => {
      const classData = req.body;
      const result = await classesCollection.insertOne(classData);
      res.send(result);
    });

    // post a course
    app.post("/courses", verifyToken, verifyAdmin, async (req, res) => {
      const courseData = req.body;
      const result = await coursesCollection.insertOne(courseData);
      res.send(result);
    });

    // delete class -------->
    app.delete("/classes/:id", verifyToken, verifyAdmin, async (req, res) => {
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

    // delete courses -------->
    app.delete("/courses/:id", verifyToken, verifyAdmin, async (req, res) => {
      const { id } = req.params;
      console.log(id);
      try {
        const result = await coursesCollection.deleteOne({
          _id: new ObjectId(id),
        });
        if (result.deletedCount === 0) {
          return res.status(404).json({ message: "Courses not found" });
        }
        res.status(200).json({ deletedCount: result.deletedCount });
      } catch (error) {
        console.error("Delete error:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    // update the class

    app.patch("/classes/:id", verifyToken, verifyAdmin, async (req, res) => {
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
    app.get("/courses/:id", verifyToken, async (req, res) => {
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

    // save user database ---------->

    // put a user ------>
    app.put("/users", async (req, res) => {
      const newUser = req.body;
      console.log("New user:", newUser);
      try {
        const isExited = await usersCollection.findOne({
          email: newUser.email,
        });

        if (!isExited) {
          const result = await usersCollection.insertOne(newUser);
          return res.send({ result, message: "User saved to database" });
        }
        res.send({ message: "User already exists" });
      } catch (error) {
        console.error("Error saving user:", error);
        res.status(500).send({ error: "Internal server error" });
      }
    });

    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    // get single email
    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const user = await usersCollection.findOne({ email });
      res.send(user);
    });

    // delete user by email------>
    app.delete("/users/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const result = await usersCollection.deleteOne({ email });
      res.send(result);
    });

    // Get User Role by Email
    app.get("/users/role/:email", async (req, res) => {
      const email = req.params.email;
      const user = await usersCollection.findOne({ email });

      if (user) {
        res.send({ role: user.role });
      } else {
        res.status(404).send({ error: "User not found" });
      }
    });

    // change role ----------->

    app.put(
      "/users/role/:email",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const { email } = req.params;
        const { role } = req.body;

        console.log(email, role);
        try {
          const result = await usersCollection.updateOne(
            { email },
            { $set: { role } }
          );

          if (result.modifiedCount > 0) {
            res.status(200).send({ message: `User role updated to ${role}` });
          } else {
            res
              .status(404)
              .send({ message: "User not found or already has that role" });
          }
        } catch (error) {
          console.error("Error updating role:", error);
          res.status(500).send({ message: "Internal Server Error" });
        }
      }
    );

    // update Profile
    const { ObjectId } = require("mongodb");

    app.put("/users/:id", async (req, res) => {
      const id = req.params.id;
      if (!ObjectId.isValid(id)) {
        return res.status(400).send({ message: "Invalid user ID" });
      }
      const updatedUser = req.body;
      console.log("Update Request:", id, updatedUser);
      try {
        const result = await usersCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedUser }
        );
        if (result.modifiedCount > 0) {
          res.send({ message: "User updated successfully", result });
        } else {
          res.send({ message: "No changes made", result });
        }
      } catch (err) {
        console.error("Error updating user:", err);
        res.status(500).send({ message: "Update failed", error: err.message });
      }
    });

    // gallery get --->
    app.get("/gallery", async (req, res) => {
      const result = await galleryCollection.find().toArray();
      res.send(result);
    });

    // gallery delete ---------->
    app.delete("/gallery/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      console.log(id);
      try {
        const query = { _id: new ObjectId(id) };
        const result = await galleryCollection.deleteOne(query);
        if (result.deletedCount === 1) {
          res.send({ message: "Image deleted", deletedId: id });
        } else {
          res.status(404).json({ message: "Image not found" });
        }
      } catch (error) {
        console.error("Failed to delete Image:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    // post a gallery
    app.post("/gallery", verifyToken, verifyAdmin, async (req, res) => {
      const image = req.body;
      const result = await galleryCollection.insertOne(image);
      res.send(result);
    });

    // get all members -->
    app.get("/members", async (req, res) => {
      const result = await membersCollection.find().toArray();
      res.send(result);
    });

    // POST a new member
    app.post("/members", verifyToken, async (req, res) => {
      try {
        const member = req.body;
        const result = await membersCollection.insertOne(member);
        res.send(result);
      } catch (err) {
        res.status(500).send({ message: "Failed to add member", error: err });
      }
    });

    //  delete members---------->
    app.delete("/member/:id", verifyToken, verifyAdmin, async (req, res) => {
      try {
        const id = req.params.id;
        const result = await membersCollection.deleteOne({
          _id: new ObjectId(id),
        });
        res.send(result);
      } catch (err) {
        res
          .status(500)
          .send({ message: "Failed to delete member", error: err });
      }
    });

    // assignment get ----------->
    app.get("/assignments", verifyToken, verifyAdmin, async (req, res) => {
      const result = await assignmentsCollection.find().toArray();
      res.send(result);
    });

    //  get email by assignment -------------->
    app.get("/assignment/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const result = await assignmentsCollection.find({ email }).toArray();
      res.send(result);
    });

    // post a assignment -------->
    app.post("/assignments", verifyToken, async (req, res) => {
      try {
        const member = req.body;
        const result = await assignmentsCollection.insertOne(member);
        res.send(result);
      } catch (err) {
        res
          .status(500)
          .send({ message: "Failed to add assignment", error: err });
      }
    });

    // DELETE an assignment by ID
    app.delete(
      "/assignments/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;

        try {
          const result = await assignmentsCollection.deleteOne({
            _id: new ObjectId(id),
          });

          if (result.deletedCount === 1) {
            res.send({ message: "Assignment deleted", deletedCount: 1 });
          } else {
            res.status(404).send({ message: "Assignment not found" });
          }
        } catch (error) {
          res
            .status(500)
            .send({ message: "Failed to delete assignment", error });
        }
      }
    );

    // update mark a assignment -------------->
    app.patch("/assignment/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const { mark } = req.body;
      console.log(mark);
      const result = await assignmentsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { mark } }
      );
      res.send(result);
    });

    app.get("/admin-stats", verifyToken, verifyAdmin, async (req, res) => {
      try {
        const eventCount = await eventsCollection.estimatedDocumentCount();
        const classCount = await classesCollection.estimatedDocumentCount();
        const courseCount = await coursesCollection.estimatedDocumentCount();
        const noticeCount = await noticeCollection.estimatedDocumentCount();
        const usersCount = await usersCollection.estimatedDocumentCount();
        const membersCount = await membersCollection.estimatedDocumentCount();

        res.send({
          events: eventCount,
          classes: classCount,
          courses: courseCount,
          notices: noticeCount,
          members: membersCount,
          users: usersCount,
        });
      } catch (error) {
        res.status(500).json({ message: "Failed to load stats" });
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
