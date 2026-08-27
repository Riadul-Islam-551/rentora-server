const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");
const { ServerApiVersion } = require("mongodb");
const { ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());
const port = process.env.PORT;
const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    const db = client.db("rentora");
    const propertyCollection = db.collection("property");

    app.post("/api/property", async (req, res) => {
      const data = req.body;
      const newProperty = {
        ...data,
        createdAt: new Date(),
      };

      const result = await propertyCollection.insertOne(newProperty);

      res.send(result);
    });

    app.get("/api/property", async (req, res) => {
      try {
        const { owner } = req.query;
        const query = {};

        console.log(req.query.owner);

        if (owner) {
          query.ownerId = owner;
        }

        const properties = await propertyCollection.find(query).toArray();

        res.status(200).send({
          success: true,
          data: properties,
        });
      } catch (error) {
        console.error("Error fetching properties:", error);

        res.status(500).send({
          success: false,
          message: "Failed to fetch properties",
          error: error.message,
        });
      }
    });

    app.delete("/api/property", async (req, res) => {
      try {
        const { id } = req.body;

        console.log("Property ID:", id);

        if (!id) {
          return res.status(400).send({
            success: false,
            message: "Property ID is required",
          });
        }

        if (!ObjectId.isValid(id)) {
          return res.status(400).send({
            success: false,
            message: "Invalid property ID",
          });
        }

        const result = await propertyCollection.deleteOne({
          _id: new ObjectId(id),
        });

        console.log("Delete result:", result);

        if (result.deletedCount === 0) {
          return res.status(404).send({
            success: false,
            message: "Property not found",
          });
        }

        return res.status(200).send({
          success: true,
          message: "Property deleted successfully",
        });
      } catch (error) {
        console.error("DELETE PROPERTY ERROR:", error);

        return res.status(500).send({
          success: false,
          message: "Failed to delete property",
          error: error.message,
        });
      }
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("hello world");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
