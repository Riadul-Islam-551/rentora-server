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
    const propertyRejectCollection = db.collection("rejection");
    const userCollection = db.collection("user");
    const favoriteCollection = db.collection("favorite");
    const reviewCollection = db.collection("review");

    app.post("/api/property", async (req, res) => {
      const data = req.body;
      const newProperty = {
        ...data,
        createdAt: new Date(),
      };

      const result = await propertyCollection.insertOne(newProperty);

      res.send(result);
    });

    app.get("/api/property/owner", async (req, res) => {
      try {
        const { ownerId, page = 1 } = req.query;

        if (!ownerId) {
          return res.status(400).send({
            success: false,
            message: "Owner ID is required",
          });
        }

        const pageSize = 10;

        const currentPage = Math.max(1, Number(page) || 1);

        const skip = (currentPage - 1) * pageSize;

        const filter = {
          ownerId,
        };

        const properties = await propertyCollection
          .find(filter)
          .sort({ _id: -1 })
          .skip(skip)
          .limit(pageSize)
          .toArray();

        const totalProperties = await propertyCollection.countDocuments(filter);

        const totalPages = Math.ceil(totalProperties / pageSize);

        res.status(200).send({
          success: true,
          data: properties,
          pagination: {
            currentPage,
            pageSize,
            totalProperties,
            totalPages,
          },
        });
      } catch (error) {
        console.error("Error fetching owner properties:", error);

        res.status(500).send({
          success: false,
          message: "Failed to fetch owner properties",
          error: error.message,
        });
      }
    });

    app.patch("/api/update/property", async (req, res) => {
      try {
        const { id, ...updateProperty } = req.body;

        console.log("PATCH property:", {
          id,
          updateProperty,
        });

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

        if (Object.keys(updateProperty).length === 0) {
          return res.status(400).send({
            success: false,
            message: "No property data provided for update",
          });
        }

        const result = await propertyCollection.updateOne(
          {
            _id: new ObjectId(id),
          },
          {
            $set: updateProperty,
          },
        );

        if (result.matchedCount === 0) {
          return res.status(404).send({
            success: false,
            message: "Property not found",
          });
        }

        return res.status(200).send({
          success: true,
          message: "Property updated successfully",
          modifiedCount: result.modifiedCount,
        });
      } catch (error) {
        console.error("PATCH PROPERTY ERROR:", error);

        return res.status(500).send({
          success: false,
          message: "Failed to update property",
          error: error.message,
        });
      }
    });

    app.delete("/api/delete/property", async (req, res) => {
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

    app.get("/api/property", async (req, res) => {
      try {
        const {
          page = 1,
          search = "",
          propertyType = "",
          sortPrice = "",
          status = "",
        } = req.query;

        const pageSize = 10;

        const currentPage = Math.max(1, Number(page) || 1);
        const skip = (currentPage - 1) * pageSize;

        const filter = {};

        // Search
        if (search.trim()) {
          filter.$or = [
            {
              title: {
                $regex: search.trim(),
                $options: "i",
              },
            },
            {
              location: {
                $regex: search.trim(),
                $options: "i",
              },
            },
          ];
        }

        // Property type
        if (propertyType.trim()) {
          filter.propertyType = {
            $regex: `^${propertyType.trim()}$`,
            $options: "i",
          };
        }

        // Status
        if (status.trim()) {
          filter.status = {
            $regex: `^${status.trim()}$`,
            $options: "i",
          };
        }

        // Sorting
        let sort = { _id: -1 };

        if (sortPrice === "asc") {
          sort = { rent: 1 };
        }

        if (sortPrice === "desc") {
          sort = { rent: -1 };
        }

        const properties = await propertyCollection
          .find(filter)
          .sort(sort)
          .skip(skip)
          .limit(pageSize)
          .toArray();

        const totalProperties = await propertyCollection.countDocuments(filter);

        const totalPages = Math.ceil(totalProperties / pageSize);

        res.status(200).send({
          success: true,
          data: properties,
          pagination: {
            currentPage,
            pageSize,
            totalProperties,
            totalPages,
          },
          filters: {
            search,
            propertyType,
            sortPrice,
            status,
          },
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

    app.post("/api/reject/property", async (req, res) => {
      try {
        const data = req.body;

        if (!data?.propertyId) {
          return res.status(400).send({
            success: false,
            message: "Property ID is required",
          });
        }

        if (!data?.message?.trim()) {
          return res.status(400).send({
            success: false,
            message: "Rejection message is required",
          });
        }

        const rejection = {
          ...data,
          createdAt: new Date(),
        };

        const result = await propertyRejectCollection.insertOne(rejection);

        res.send({
          success: true,
          message: "Property rejection created successfully",
          data: result,
        });
      } catch (error) {
        console.error("Reject property error:", error);

        res.status(500).send({
          success: false,
          message: "Failed to create property rejection",
        });
      }
    });

    app.get("/api/reject/property", async (req, res) => {
      try {
        const { propertyId } = req.query;

        if (!propertyId) {
          return res.status(400).send({
            success: false,
            message: "Property ID is required",
          });
        }

        const rejection = await propertyRejectCollection.findOne({
          propertyId,
        });

        if (!rejection) {
          return res.status(404).send({
            success: false,
            message: "Rejection data not found",
            data: null,
          });
        }

        res.status(200).send({
          success: true,
          data: rejection,
        });
      } catch (error) {
        console.log("Error fetching rejection:", error);

        res.status(500).send({
          success: false,
          message: "Failed to fetch rejection data",
          error: error?.message,
        });
      }
    });

    // Get all users
    app.get("/api/users", async (req, res) => {
      try {
        const users = await userCollection.find().toArray();

        res.status(200).send({
          success: true,
          data: users,
        });
      } catch (error) {
        console.error("Error fetching users:", error);

        res.status(500).send({
          success: false,
          message: "Failed to fetch users",
          error: error?.message,
        });
      }
    });

    app.patch("/api/update/user", async (req, res) => {
      try {
        const { id, ...updateUser } = req.body;

        console.log("PATCH user:", {
          id,
          updateUser,
        });

        // Check ID
        if (!id) {
          return res.status(400).send({
            success: false,
            message: "User ID is required",
          });
        }

        // Validate MongoDB ObjectId
        if (!ObjectId.isValid(id)) {
          return res.status(400).send({
            success: false,
            message: "Invalid user ID",
          });
        }

        // Check update data
        if (Object.keys(updateUser).length === 0) {
          return res.status(400).send({
            success: false,
            message: "No user data provided for update",
          });
        }

        // Optional: validate role
        if (updateUser.role) {
          const allowedRoles = ["admin", "owner", "tenant"];

          if (!allowedRoles.includes(updateUser.role.toLowerCase())) {
            return res.status(400).send({
              success: false,
              message: "Invalid user role",
            });
          }

          updateUser.role = updateUser.role.toLowerCase();
        }

        const result = await userCollection.updateOne(
          {
            _id: new ObjectId(id),
          },
          {
            $set: updateUser,
          },
        );

        // User doesn't exist
        if (result.matchedCount === 0) {
          return res.status(404).send({
            success: false,
            message: "User not found",
          });
        }

        return res.status(200).send({
          success: true,
          message: "User updated successfully",
          modifiedCount: result.modifiedCount,
        });
      } catch (error) {
        console.error("PATCH USER ERROR:", error);

        return res.status(500).send({
          success: false,
          message: "Failed to update user",
          error: error.message,
        });
      }
    });

    app.get("/api/property/:id", async (req, res) => {
      try {
        const { id } = req.params;

        if (!id) {
          return res.status(400).send({
            success: false,
            message: "Property ID is required",
          });
        }

        const property = await propertyCollection.findOne({
          _id: new ObjectId(id),
        });

        if (!property) {
          return res.status(404).send({
            success: false,
            message: "Property not found",
          });
        }

        res.status(200).send({
          success: true,
          data: property,
        });
      } catch (error) {
        console.error("Error fetching property:", error);

        res.status(500).send({
          success: false,
          message: "Failed to fetch property",
          error: error.message,
        });
      }
    });

    app.post("/api/favorite", async (req, res) => {
      try {
        const { propertyId, tenantId } = req.body;
        console.log("information", propertyId, tenantId);

        if (!propertyId) {
          return res.status(400).send({
            success: false,
            message: "Property ID is required",
          });
        }

        if (!tenantId) {
          return res.status(400).send({
            success: false,
            message: "Tenant ID is required",
          });
        }

        // Prevent duplicate favorite
        const existingFavorite = await favoriteCollection.findOne({
          propertyId,
          tenantId,
        });

        if (existingFavorite) {
          return res.status(409).send({
            success: false,
            message: "Property is already in favorites",
            data: existingFavorite,
          });
        }

        const favorite = {
          propertyId,
          tenantId,
          createdAt: new Date(),
        };

        const result = await favoriteCollection.insertOne(favorite);
        console.log("result", result);

        res.status(201).send({
          success: true,
          message: "Property added to favorites",
          data: result,
        });
      } catch (error) {
        console.error("Error adding favorite:", error);

        res.status(500).send({
          success: false,
          message: "Failed to add property to favorites",
          error: error.message,
        });
      }
    });

    app.get("/api/favorite", async (req, res) => {
      try {
        const { tenantId } = req.query;

        if (!tenantId) {
          return res.status(400).send({
            success: false,
            message: "Tenant ID is required",
          });
        }

        // Get all favorites belonging to this tenant
        const favorites = await favoriteCollection
          .find({ tenantId })
          .sort({ createdAt: -1 })
          .toArray();

        if (favorites.length === 0) {
          return res.status(200).send({
            success: true,
            data: [],
            totalFavorites: 0,
          });
        }

        // Get property IDs from favorites
        const propertyIds = favorites.map(
          (favorite) => new ObjectId(favorite.propertyId),
        );

        // Get the actual properties
        const properties = await propertyCollection
          .find({
            _id: {
              $in: propertyIds,
            },
          })
          .toArray();

        res.status(200).send({
          success: true,
          data: properties,
          totalFavorites: properties.length,
        });
      } catch (error) {
        console.error("Error fetching favorites:", error);

        res.status(500).send({
          success: false,
          message: "Failed to fetch favorite properties",
          error: error.message,
        });
      }
    });

    app.delete("/api/favorite", async (req, res) => {
      try {
        const { propertyId, tenantId } = req.body;

        if (!propertyId || !tenantId) {
          return res.status(400).send({
            success: false,
            message: "property id and tenant id is required",
          });
        }

        // Delete the favorite belonging to this tenant and property
        const result = await favoriteCollection.deleteOne({
          propertyId,
          tenantId,
        });

        if (result.deletedCount === 0) {
          return res.status(404).send({
            success: false,
            message: "Favorite property not found",
          });
        }

        res.status(200).send({
          success: true,
          message: "Favorite removed successfully",
        });
      } catch (error) {
        console.error("Error deleting favorite:", error);

        res.status(500).send({
          success: false,
          message: "Failed to remove favorite",
          error: error.message,
        });
      }
    });

    app.post("/api/reviews", async (req, res) => {
      try {
        const { propertyId, tenantId, rating, feedback } = req.body;

        // Validation----------

        if (!propertyId) {
          return res.status(400).send({
            success: false,
            message: "Property ID is required",
          });
        }

        if (!tenantId) {
          return res.status(400).send({
            success: false,
            message: "Tenant ID is required",
          });
        }

        if (!rating) {
          return res.status(400).send({
            success: false,
            message: "Rating is required",
          });
        }

        if (!feedback || !feedback.trim()) {
          return res.status(400).send({
            success: false,
            message: "Feedback is required",
          });
        }

        // --Validate rating-----------------------------

        const ratingNumber = Number(rating);

        if (
          !Number.isInteger(ratingNumber) ||
          ratingNumber < 1 ||
          ratingNumber > 5
        ) {
          return res.status(400).send({
            success: false,
            message: "Rating must be a number between 1 and 5",
          });
        }

        // ---Check whether property exists--------

        const property = await propertyCollection.findOne({
          _id: new ObjectId(propertyId),
        });

        if (!property) {
          return res.status(404).send({
            success: false,
            message: "Property not found",
          });
        }

        // ------Prevent duplicate review------

        const existingReview = await reviewCollection.findOne({
          propertyId,
          tenantId,
        });

        if (existingReview) {
          return res.status(409).send({
            success: false,
            message: "You have already reviewed this property",
          });
        }

        // ------------Create review------------

        const review = {
          propertyId,
          tenantId,
          rating: ratingNumber,
          feedback: feedback.trim(),
          createdAt: new Date(),
        };

        const result = await reviewCollection.insertOne(review);

        res.status(201).send({
          success: true,
          message: "Review submitted successfully",
          data: {
            _id: result.insertedId,
            ...review,
          },
        });
      } catch (error) {
        console.error("Error creating review:", error);

        res.status(500).send({
          success: false,
          message: "Failed to submit review",
          error: error.message,
        });
      }
    });

    // app.get("/api/reviews", async (req, res) => {
    //   try {
    //     const { propertyId } = req.query;
    //     if (!propertyId) {
    //       return res
    //         .status(400)
    //         .send({ success: false, message: "Property ID is required" });
    //     }
    //     const reviews = await reviewCollection
    //       .find({ propertyId })
    //       .sort({ createdAt: -1 })
    //       .toArray();
    //     res
    //       .status(200)
    //       .send({ success: true, data: reviews, totalReviews: reviews.length });
    //   } catch (error) {
    //     console.error("Error fetching reviews:", error);
    //     res
    //       .status(500)
    //       .send({
    //         success: false,
    //         message: "Failed to fetch reviews",
    //         error: error.message,
    //       });
    //   }
    // });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });

    app.get("/api/reviews/top", async (req, res) => {
      try {
        const reviews = await reviewCollection
          .find({})
          .sort({
            rating: -1,
            createdAt: -1,
          })
          .limit(4)
          .toArray();

        res.status(200).send({
          success: true,
          data: reviews,
          totalReviews: reviews.length,
        });
      } catch (error) {
        console.error("Error fetching top reviews:", error);

        res.status(500).send({
          success: false,
          message: "Failed to fetch top reviews",
          error: error.message,
        });
      }
    });

    app.get("/api/user/:userId", async (req, res) => {
      try {
        const { userId } = req.params;
        console.log("user id", userId);
        if (!userId) {
          return res.status(400).send({
            success: false,
            message: "user ID is required",
          });
        }

        // Find tenant by MongoDB _id
        const user = await userCollection.findOne({
          _id: new ObjectId(userId),
        });

        if (!user) {
          return res.status(404).send({
            success: false,
            message: "User not found",
          });
        }

        res.status(200).send({
          success: true,
          data: user,
        });
      } catch (error) {
        console.error("Error fetching user:", error);

        res.status(500).send({
          success: false,
          message: "Failed to fetch user details",
          error: error.message,
        });
      }
    });

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
