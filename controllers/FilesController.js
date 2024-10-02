import { ObjectId } from 'mongodb';
import fs from 'fs';
import path from 'path';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class FilesController {
  static async postUpload(req, res) {
    const token = req.headers['x-token'];
    const { name, type, parentId = 0, isPublic = false, data } = req.body;

    // Check user authentication
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validate input
    if (!name) {
      return res.status(400).json({ error: 'Missing name' });
    }

    const acceptedTypes = ['folder', 'file', 'image'];
    if (!type || !acceptedTypes.includes(type)) {
      return res.status(400).json({ error: 'Missing type' });
    }

    if (type !== 'folder' && !data) {
      return res.status(400).json({ error: 'Missing data' });
    }

    // Validate parentId if set
    if (parentId !== 0) {
      const parentFile = await dbClient.db
        .collection('files')
        .findOne({ _id: ObjectId(parentId) });
      if (!parentFile) {
        return res.status(400).json({ error: 'Parent not found' });
      }
      if (parentFile.type !== 'folder') {
        return res.status(400).json({ error: 'Parent is not a folder' });
      }
    }

    // Create a new file in the database
    const newFile = {
      userId: ObjectId(userId),
      name,
      type,
      isPublic,
      parentId,
    };

    // Handle folder creation
    if (type === 'folder') {
      const result = await dbClient.db.collection('files').insertOne(newFile);
      return res
        .status(201)
        .json({ id: result.insertedId.toString(), ...newFile });
    }

    // Handle file or image creation
    const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
    const fileName = `${Date.now()}-${name}`;
    const filePath = path.join(folderPath, fileName);

    // Ensure the folder exists
    fs.mkdirSync(folderPath, { recursive: true });

    // Store the file locally
    fs.writeFileSync(filePath, Buffer.from(data, 'base64'));

    // Add local path to new file document
    newFile.localPath = filePath;

    // Insert file document in the database
    const result = await dbClient.db.collection('files').insertOne(newFile);
    return res
      .status(201)
      .json({ id: result.insertedId.toString(), ...newFile });
  }
}

export default FilesController;
