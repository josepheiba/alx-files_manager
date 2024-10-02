import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import dbClient from "../utils/db";
import redisClient from "../utils/redis";

// Retrieve folder path from environment variable or use default
const FOLDER_PATH = process.env.FOLDER_PATH || "/tmp/files_manager";

class FilesController {
  static async postUpload(req, res) {
    const token = req.headers["x-token"];
    const userId = await redisClient.get(`auth_${token}`);

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { name, type, parentId = "0", isPublic = false, data } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Missing name" });
    }

    const acceptedTypes = ["folder", "file", "image"];
    if (!type || !acceptedTypes.includes(type)) {
      return res.status(400).json({ error: "Missing type" });
    }

    if (type !== "folder" && !data) {
      return res.status(400).json({ error: "Missing data" });
    }

    let parentFile = null;
    if (parentId !== "0") {
      parentFile = await dbClient.filesCollection.findOne({ _id: parentId });

      if (!parentFile) {
        return res.status(400).json({ error: "Parent not found" });
      }
      if (parentFile.type !== "folder") {
        return res.status(400).json({ error: "Parent is not a folder" });
      }
    }

    const user = await dbClient.usersCollection.findOne({ _id: userId });
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const fileData = {
      userId: user._id,
      name,
      type,
      isPublic,
      parentId,
    };

    if (type === "folder") {
      const result = await dbClient.filesCollection.insertOne(fileData);
      return res.status(201).json({ ...fileData, id: result.insertedId });
    }

    // Create the storage folder if it doesn't exist
    if (!fs.existsSync(FOLDER_PATH)) {
      fs.mkdirSync(FOLDER_PATH, { recursive: true });
    }

    const localPath = path.join(FOLDER_PATH, uuidv4());
    fileData.localPath = localPath;

    // Decode the base64 data and write it to disk
    const fileContent = Buffer.from(data, "base64");
    fs.writeFileSync(localPath, fileContent);

    const result = await dbClient.filesCollection.insertOne(fileData);
    return res.status(201).json({ ...fileData, id: result.insertedId });
  }
}

export default FilesController;
