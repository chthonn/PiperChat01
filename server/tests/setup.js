process.env.ACCESS_TOKEN = "testsecret";
process.env.DICEBEAR_API = "https://api.dicebear.com/7.x";
process.env.DICEBEAR_STYLE = "bottts";
process.env.DEFAULT_PROFILE_PIC = "test.png";

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();

  const uri = mongoServer.getUri();

  await mongoose.connect(uri);
});

afterEach(async () => {
  const collections = mongoose.connection.collections;

  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();

  await mongoServer.stop();
});