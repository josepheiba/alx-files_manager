import { ObjectId } from 'mongodb';
import fs from 'fs';
import mime from 'mime-types';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class FilesController {
  static async postUpload(req, res) {
    // Existing postUpload method
  }

  static async getShow(req, res) {
    const token = req.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const fileId = req.params.id;
    const file = await dbClient.db
      .collection('files')
      .findOne({ _id: ObjectId(fileId), userId: ObjectId(userId) });

    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    return res.status(200).json(file);
  }

  static async getIndex(req, res) {
    const token = req.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const parentId = req.query.parentId || '0';
    const page = parseInt(req.query.page, 10) || 0;
    const pageSize = 20;

    const query = { userId: ObjectId(userId) };
    if (parentId !== '0') {
      query.parentId = parentId;
    }

    const files = await dbClient.db
      .collection('files')
      .aggregate([
        { $match: query },
        { $skip: page * pageSize },
        { $limit: pageSize },
      ])
      .toArray();

    return res.status(200).json(files.map((file) => ({
      id: file._id,
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId,
    })));
  }

  static async putPublish(req, res) {
    const token = req.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const fileId = req.params.id;
    const file = await dbClient.db
      .collection('files')
      .findOneAndUpdate(
        { _id: ObjectId(fileId), userId: ObjectId(userId) },
        { $set: { isPublic: true } },
        { returnDocument: 'after' },
      );

    if (!file.value) {
      return res.status(404).json({ error: 'Not found' });
    }

    return res.status(200).json(file.value);
  }

  static async putUnpublish(req, res) {
    const token = req.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const fileId = req.params.id;
    const file = await dbClient.db
      .collection('files')
      .findOneAndUpdate(
        { _id: ObjectId(fileId), userId: ObjectId(userId) },
        { $set: { isPublic: false } },
        { returnDocument: 'after' },
      );

    if (!file.value) {
      return res.status(404).json({ error: 'Not found' });
    }

    return res.status(200).json(file.value);
  }

  static async getFile(req, res) {
    const fileId = req.params.id;
    const file = await dbClient.db
      .collection('files')
      .findOne({ _id: ObjectId(fileId) });

    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    if (!file.isPublic) {
      const token = req.headers['x-token'];
      const userId = await redisClient.get(`auth_${token}`);
      if (!userId || userId.toString() !== file.userId.toString()) {
        return res.status(404).json({ error: 'Not found' });
      }
    }

    if (file.type === 'folder') {
      return res.status(400).json({ error: 'A folder doesn\'t have content' });
    }

    if (!fs.existsSync(file.localPath)) {
      return res.status(404).json({ error: 'Not found' });
    }

    const mimeType = mime.lookup(file.name);
    res.setHeader('Content-Type', mimeType);

    const fileStream = fs.createReadStream(file.localPath);
    fileStream.pipe(res);
  }
}

export default FilesController;
