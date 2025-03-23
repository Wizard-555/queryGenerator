const express = require("express");
require("dotenv").config();
const mongoose = require("mongoose");
const { Pool } = require("pg");

const mysql = require("mysql2/promise");

const { MongoClient } = require("mongodb"); // Import MongoClient
const OpenAI = require("openai");
const openai = new OpenAI({
  apiKey: `${process.env.NVIDIA_API_KEY}`, // Replace with your OpenAI API key
  baseURL: "https://integrate.api.nvidia.com/v1", // NVIDIA API endpoint
});

const router = express.Router();
function detectDBType(dbUrl) {
  if (
    dbUrl.startsWith("mysql://") ||
    dbUrl.startsWith("postgres://") ||
    dbUrl.startsWith("mssql://") ||
    dbUrl.startsWith("oracle://")
  ) {
    return "SQL";
  }
  if (dbUrl.startsWith("mongodb://")) {
    return "NoSQL";
  }
  return "Unknown";
}

async function connectSQL(dbUrl) {
  try {
    if (dbUrl.startsWith("mysql://")) {
      const connection = await mysql.createConnection(dbUrl);

      // ✅ Get table names
      const [tables] = await connection.execute("SHOW TABLES;");
      const tableNames = tables.map((row) => Object.values(row)[0]);

      let schema = [];
      for (let table of tableNames) {
        // ✅ Fetch column names for each table
        const [columns] = await connection.execute(
          `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
          [table]
        );

        schema.push({
          name: table,
          columns: columns.map((col) => col.COLUMN_NAME),
        });
      }

      await connection.end();
      return { success: true, tables: schema };
    } else if (dbUrl.startsWith("postgres://")) {
      const pool = new Pool({ connectionString: dbUrl });

      // ✅ Get table names
      const tableResult = await pool.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"
      );
      const tableNames = tableResult.rows.map((row) => row.table_name);

      let schema = [];
      for (let table of tableNames) {
        // ✅ Fetch column names for each table
        const colResult = await pool.query(
          `SELECT column_name FROM information_schema.columns WHERE table_name = $1`,
          [table]
        );

        schema.push({
          name: table,
          columns: colResult.rows.map((row) => row.column_name),
        });
      }

      await pool.end();
      return { success: true, tables: schema };
    }
  } catch (error) {
    console.error("Error in DB connection:", error);
    return { success: false, error: error.message };
  }
}

// Function to connect & fetch collections from NoSQL (MongoDB)
async function connectNoSQL(dbUrl) {
  try {
    const conn = await mongoose.connect(dbUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const collections = await mongoose.connection.db
      .listCollections()
      .toArray();

    let schema = { success: true, collections: [] };

    for (let coll of collections) {
      let collectionName = coll.name;
      let sampleDoc = await mongoose.connection.db
        .collection(collectionName)
        .findOne(); // Fetch one document

      let fields = sampleDoc ? Object.keys(sampleDoc) : []; // Extract field names
      schema.collections.push({ name: collectionName, fields });
    }

    await mongoose.connection.close();
    return schema;
  } catch (error) {
    console.error(error);
    return { success: false, error: error.message };
  }
}

let mongooseConnection = null; // Store single connection instance

async function connectNoSQL(dbUrl) {
  try {
    if (!mongooseConnection) {
      mongooseConnection = await mongoose.connect(dbUrl, {}); // No extra options needed
    }

    const collections = await mongoose.connection.db.listCollections().toArray();
    let schema = { success: true, collections: [] };

    for (let coll of collections) {
      let collectionName = coll.name;
      let sampleDoc = await mongoose.connection.db.collection(collectionName).findOne();
      let fields = sampleDoc ? Object.keys(sampleDoc) : [];
      schema.collections.push({ name: collectionName, fields });
    }

    return schema;
  } catch (error) {
    console.error(error);
    return { success: false, error: error.message };
  }
}


router.post("/connect-db", async (req, res) => {
  console.log("Connecting to database...");
  try {
    const { dbUrl, dbName } = req.body;
    if (!dbUrl) {
      return res.status(400).json({ error: "Database URL is required" });
    }

    const decodedUrl = decodeURIComponent(dbUrl);
    let response;

    if (!dbName) {
      console.log("Connecting to MySQL...");
      response = await connectSQL(decodedUrl);
    } else {
      console.log(`Connecting to MongoDB: ${dbName}`);
      response = await connectNoSQL(decodedUrl);
    }

    if (!response?.success) {
      return res.status(500).json({ error: response?.error || "Database connection failed" });
    }

    res.json({ details: response });
  } catch (error) {
    console.error("Database connection error:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

let mongoClient;
async function getMongoClient(dbUrl) {
  if (!mongoClient) {
    mongoClient = new MongoClient(dbUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    await mongoClient.connect();
  }
  return mongoClient;
}

router.post("/nl-to-nosql", async (req, res) => {
  let connection;
  try {
    console.log("Received Query:", req.body);
    const { userQuery, dbUrl, dbName } = req.body;

    if (!userQuery || !dbUrl || !dbName) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // 🔹 Connect to MongoDB
    connection = await mongoose.connect(dbUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const db = mongoose.connection.db;
    if (!db) throw new Error("Database connection failed.");

    console.log(`🔗 Connected to MongoDB: ${dbName}`);

    // 🔹 Fetch available collections
    const collections = await db.listCollections().toArray();
    if (!collections.length) {
      return res.status(400).json({ error: "No collections found" });
    }

    // 🔹 Extract schema (field names) from each collection
    const schemaDescriptions = await Promise.allSettled(
      collections.map(async ({ name }) => {
        const sampleDoc = await db.collection(name).findOne({}, { projection: { _id: 0 } });
        return sampleDoc
          ? `Collection: ${name} (Fields: ${Object.keys(sampleDoc).join(", ")})`
          : `Collection: ${name} (No sample document found)`;
      })
    );

    // 🔹 Filter valid schemas
    const validSchemas = schemaDescriptions
      .filter((result) => result.status === "fulfilled")
      .map((result) => result.value)
      .join("\n");

    console.log("📜 Extracted Collection Schemas:\n", validSchemas);

    // 🔹 **AI Prompt for Direct NoSQL Query**
    const nosqlPrompt = `
Convert the following natural language request into a **valid MongoDB NoSQL query**.
- Ensure output is **strictly JSON** (no explanations, no markdown).
- The JSON output should include:
  - "collection" (which should match a MongoDB collection)
  - "query" (MongoDB filter query)
  - "projection" (optional fields to retrieve)
  - "limit" (if specified)
  - "sort" (if sorting is present)
  - "pipeline" (for aggregations, if needed)

### Database Schema:
${validSchemas}

### User Query:
"${userQuery}"

Return JSON:
    `.trim();

    const models = ["gpt-4-turbo", "claude-3-opus-2024-02-14", "gemini-1.5-pro-latest", "mistral-large-latest"];
    let responseText;
    let selectedModel;

    for (const model of models) {
      try {
        console.log(`🔹 Trying Model: ${model}`);
        const aiResponse = await openai.chat.completions.create({
          model,
          messages: [{ role: "user", content: nosqlPrompt }],
        });

        responseText = aiResponse.choices[0]?.message?.content?.trim();
        if (responseText) {
          selectedModel = model;
          console.log(`✅ Model ${model} provided a response.`);
          break;
        }
      } catch (error) {
        console.error(`❌ Model ${model} failed:`, error.message);
      }
    }

    if (!responseText) {
      console.error("⚠️ All AI models failed to generate a response.");
      return res.status(500).json({ error: "AI models failed to generate a valid query." });
    }

    // 🔹 Auto-Fix AI JSON
    responseText = responseText
      .replace(/}\s*"/g, '}, "') // Fix missing commas between objects
      .replace(/\s"\w+":\s*([\[\{])/g, ',"$1'); // Fix missing commas between properties

    // 🔹 Parse Fixed JSON
    let parsedQuery;
    try {
      parsedQuery = JSON.parse(responseText);
    } catch (err) {
      console.error("⚠️ AI Query Parsing Error:", err.message, "Fixed Response:", responseText);
      return res.status(500).json({ error: "Invalid JSON from AI" });
    }

    // 🔹 Validate AI Query
    let { collection, query, projection, limit, sort, pipeline } = parsedQuery;

    // 🔥 **Fallback: If AI Fails to Select a Collection**
    if (!collection) {
      console.warn("⚠️ AI did not provide a collection. Suggesting the best match.");
      collection = collections[0]?.name || null; // Pick the first available collection
    }

    if (!collection) {
      return res.status(500).json({ error: "No valid collection found" });
    }

    console.log(`✅ Using Collection: ${collection} (Model: ${selectedModel})`);

    const collectionRef = db.collection(collection);
    let result;

    try {
      if (pipeline) {
        if (!Array.isArray(pipeline)) throw new Error("'pipeline' must be an array");
        result = await collectionRef.aggregate(pipeline).toArray();
      } else {
        let mongoQuery = collectionRef.find(query || {});
        if (projection) mongoQuery = mongoQuery.project(projection);
        if (sort) mongoQuery = mongoQuery.sort(sort);
        if (limit) mongoQuery = mongoQuery.limit(limit);
        result = await mongoQuery.toArray();
      }
    } catch (executionError) {
      console.error("⚠️ MongoDB Execution Error:", executionError.message);
      return res.status(500).json({ error: "Failed to execute query." });
    }

    res.json({ [collection]: result });
  } catch (error) {
    console.error("🚨 General Error:", error.message);
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  } finally {
    if (mongoose.connection.readyState === 1) {
      mongoose.connection.close();
    }
  }
});


router.get("/allDocuments", async (req, res, next) => {
  try {
    const { connectionUrl, collectionName } = req.query;
    dbUrl = decodeURIComponent(connectionUrl)

    // Connect to MongoDB using Mongoose
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(dbUrl);
    }

    const db = mongoose.connection.db;
    const collection = db.collection(collectionName);
    const documents = await collection.find().toArray();

    res.json(documents);
  } catch (error) {
    console.error("Error in fetching documents from MongoDB:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;