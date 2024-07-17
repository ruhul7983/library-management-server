const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const cors = require("cors");
require('dotenv').config();
const cookieParser = require("cookie-parser");
const port = process.env.PORT || 5000;
app.use(cors(
  {
    origin: [
      // 'https://car-doctor-fec9d.web.app',
      // 'https://car-doctor-fec9d.firebaseapp.com',
      'http://localhost:5173',
    ],
    credentials: true,
  }
));
app.use(express.json());
app.use(cookieParser());


const logger = (req, res, next) => {
  console.log('called: ', req.host, req.originalUrl);
  next();
}

const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;
  console.log("Token in middle Layer: ", token);
  if (!token) {
    return res.status(401).send({ message: "Unauthorized" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      console.log(err);
      return res.status(401).send({ message: "Unauthorized" })
    }
    console.log("decoded in verify ",decoded);
    req.user = decoded;
    next();

  })
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rsqtl7q.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


// const verifyToken = (req, res, next) => {
//   const token = req?.cookies?.token;
//   console.log("Token in middle Layer: ", token);
//   if (!token) {
//     return res.status(401).send({ message: "Unauthorized" });
//   }
//   jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
//     if (err) {
//       console.log(err);
//       return res.status(401).send({ message: "Unauthorized" })
//     }
//     req.user = decoded;
//     next();

//   })
// }



async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const categoryCollection = client.db("libraryDB").collection("categories");
    const bookCollection = client.db("libraryDB").collection("books");
    const issuesCollection = client.db("libraryDB").collection("issueBook");


    // jwt
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "1h" });
      res.cookie("token", token, {
        httpOnly: true,
        secure: false,
      })
        .send({ success: true })
    })

    app.post("/logout", async (req, res) => {
      res
        .clearCookie("token", { maxAge: 0 })
        .send({ success: true })
    })


    app.post("/categories", async (req, res) => {
      const category = req.body;
      const result = await categoryCollection.insertOne(category);
      res.send(result);

    });

    app.get("/categories", async (req, res) => {
      const cursor = categoryCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })
    app.post("/issues-book", async (req, res) => {
      const issueDetails = req.body;
      const result = await issuesCollection.insertOne(issueDetails);
      res.send(result);

    });

    app.get("/issues-book", async (req, res) => {
      const cursor = issuesCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })

    app.get("/your-issues-book", logger, verifyToken, async (req, res) => {
      console.log("user in valid token", req.user);
      //console.log("email: ", req.query.email);
      console.log('Query Email:', req.query.email);
      console.log('User Email:', req.user?.email);
      if (req.query.email !== req.user?.email) {
        return res.status(403).send({ message: "Forbidden Access" });
      }

      console.log("Cookies in issues ", req.cookies);

      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };
      }
      const result = await issuesCollection.find(query).toArray();
      res.send(result);
    })

    app.post("/books", async (req, res) => {
      const book = req.body;
      const result = await bookCollection.insertOne(book);
      res.send(result);
    });

    app.patch("/book-update", async (req, res) => {
      console.log(req.body);
      const update = req.body;
      const filter = { _id: new ObjectId(update._id) };
      const updateStock = {
        $set: {
          stock: update.stockNeg,
        }
      }
      const result = await bookCollection.updateOne(filter, updateStock);
      res.send(result);
    })

    app.get("/books", async (req, res) => {
      const cursor = bookCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })

    app.get("/book/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookCollection.findOne(query);
      res.send(result);
    })

    app.delete("/delete-book/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      console.log(id);
      const result = await bookCollection.deleteOne(query);
      res.send(result);

    })



    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get("/", (req, res) => {
  res.send("Library server is running");
})



app.listen(port, () => {
  console.log("Running port ", port);
});