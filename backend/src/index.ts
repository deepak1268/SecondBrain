import "dotenv/config";
import express from "express";
import jwt from "jsonwebtoken";
import z from "zod";
import { ContentModel, LinkModel, UserModel } from "./db.js";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { userAuth } from "./middleware.js";
import cors from "cors";
import { JWT_USER_SECRET } from "./config.js";
import { qdrant } from "./qdrant.js";
import { createEmbedding } from "./embedding.js";
import {v4 as uuidv4} from "uuid";

const app = express();
app.use(express.json());
app.use(cors());

app.post("/api/v1/signup", async (req, res) => {
  const requiredBody = z.object({
    username: z
      .string()
      .min(6, { message: "Username must be atleast 6 characters." })
      .max(15, { message: "Username cannot be more than 15 characters." }),
    password: z
      .string()
      .min(8, { message: "Password must be atleast 8 characters" })
      .max(20, { message: "Password cannot be more than 20 characters." })
      .refine((password) => /[A-Z]/.test(password), {
        message: "Password must contain at least one uppercase letter.",
      })
      .refine((password) => /[a-z]/.test(password), {
        message: "Password must contain at least one lowercase letter.",
      })
      .refine((password) => /[0-9]/.test(password), {
        message: "Password must contain at least one digit.",
      })
      .refine((password) => /[!@#$%^&*]/.test(password), {
        message: "Password must contain at least one special letter.",
      }),
  });

  const result = requiredBody.safeParse(req.body);
  if (!result.success) {
    return res.status(411).send(result.error);
  } else {
    try {
      type RequiredBody = z.infer<typeof requiredBody>;
      const { username, password }: RequiredBody = result.data;
      const hashedPass = await bcrypt.hash(password, 9);
      await UserModel.create({
        username,
        password: hashedPass,
      });
      return res.status(200).send({
        message: "Sign Up Successful",
      });
    } catch (err) {
      console.error(err);
      return res.status(403).send({
        message: "User already exists.",
      });
    }
  }
});

app.post("/api/v1/signin", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await UserModel.findOne({
      username,
    });
    if (user) {
      const passwordCheck = await bcrypt.compare(password, user.password);
      if (passwordCheck) {
        const token = jwt.sign(
          {
            userId: user._id,
          },
          JWT_USER_SECRET as string
        );
        res.status(200).send({
          token,
        });
      } else {
        res.status(403).send({
          message: "Incorrect Credentials",
        });
      }
    }
  } catch (err) {
    res.status(403).send({
      message: "User not found.",
    });
  }
});

app.post("/api/v1/content", userAuth, async (req, res) => {
  // need to add input validation over here

  const { title, type, link, tags } = req.body;
  try {
    const content = await ContentModel.create({
      title,
      type,
      link,
      tags,
      userId: req.userId,
    });
    const textToEmbed = `
      Title: ${title}
      Type: ${type}
      Tags: ${tags.join(" ")}
    `;
    const embedding = await createEmbedding(textToEmbed);

    await qdrant.upsert("content",{
      wait: true,
      points: [
        {
          id: uuidv4(),
          vector: embedding,
          payload: {
            contentId: content._id.toString(),
            userId: req.userId,
            title,
            type,
            tags
          }
        }
      ]
    })
    console.log("stored in qdrant");
    console.log("Embedding created:", embedding.length);  
  
    return res.status(200).send({
      message: "Content created",
    });
  } catch (err) {
    console.error(err);
    return res.status(403).send({
      message: "Error while creating content.",
    });
  }
});

app.get("/api/v1/content", userAuth, async (req, res) => {
  const userId = req.userId;
  try {
    const content = await ContentModel.find({
      userId,
    }).populate("userId", "username");
    return res.status(200).json({content});
  } catch (err) {
    return res.status(500).json({
      message: "Error while fetching content",
    });
  }
});

app.delete("/api/v1/content/:contentId", userAuth, async (req, res) => {
  const contentId = req.params.contentId;
  try {
    await ContentModel.deleteOne({
      _id: contentId,
    });
    return res.status(200).send({
      message: "Content deleted",
    });
  } catch (err) {
    return res.status(403).send({
      message: "Error while deleting content",
    });
  }
});

app.post("/api/v1/brain/share", userAuth, async (req, res) => {
  const userId = req.userId;
  const share = req.body.share;
  try {
    if (share) {
      // add a check so that user cannot generate multiple links
      const existingLink = await LinkModel.findOne({
        userId,
      });
      if (existingLink) {
        return res.status(200).send({
          hash: existingLink.hash,
        });
      }
      const hash = await bcrypt.hash(userId as string, 9);
      await LinkModel.create({
        hash,
        userId,
      });
      return res.status(200).send({
        hash,
      });
    }

    await LinkModel.deleteOne({
      userId,
    });
    res.json({
      message: "Shareable link deactivated",
    });
  } catch (err) {
    return res.status(403).send({
      message: "Error while creating/deactivating shareable link",
    });
  }
});

app.get("/api/v1/brain/share/:hash", async (req, res) => {
  const hash = req.params.hash;
  try {
    const link = await LinkModel.findOne({
      hash,
    });
    if (!link) {
      return res.status(403).send({
        message: "This link does not exist",
      });
    }
    const content = await ContentModel.find({
      userId: link.userId,
    }).populate("userId", "username");
    return res.status(200).json({content});
  } catch (err) {
    return res.status(500).send({
      message: "Internal server error",
    });
  }
});

app.post("/api/v1/search",userAuth,async (req,res) => {
  const { query } = req.body;
  try{
    const queryEmbedding = await createEmbedding(query);
    const result = await qdrant.search("content",{
      vector: queryEmbedding,
      limit: 5,
      filter:{
        must: [
          {
            key: "userId",
            match: {
              value: req.userId
            }
          }
        ]
      }
    });
    console.log(
      result.map(r => ({
        score: r.score,
        contentId: r.payload?.contentId
      }))
    );
    const contentIds = result.map(
      (r: any) => r.payload?.contentId
    );
    const contents = await ContentModel.find({
      _id: { $in: contentIds }
    });
    const contentMap = new Map(
      contents.map(content => [content._id.toString(),content])
    );
    const orderedContents = contentIds
      .map(id=>contentMap.get(id.toString()))
      .filter(Boolean);
    return res.status(200).json({
      contents: orderedContents
    });
  } catch(err){
    console.error(err);
    return res.status(500).json({
      message: "Search failed"
    });
  }
});

async function main() {
  await mongoose.connect(process.env.MONGO_URL as string);
  app.listen(3000, () => {
    console.log("listening on port 3000");
  });
}

main();
