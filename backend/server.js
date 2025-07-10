const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const AWS = require('aws-sdk');
const bodyParser = require('body-parser');
require('dotenv').config();
const app = express();
const port = 3002;
const corsOptions = {
  origin: 'http://localhost:3000',
  optionsSuccessStatus: 200,
  credentials: true,
};
app.use(cors(corsOptions));
app.use(bodyParser.json());
AWS.config.update({
  region: process.env.AWS_REGION,
});
const dynamoDb = new AWS.DynamoDB.DocumentClient();
// ===== USERS =====
app.get('/users', async (req, res) => {
  const params = {
    TableName: process.env.AWS_TABLE,
    ProjectionExpression: 'userId, firstName, lastName, email, password, category, courseCompleted, coursesInProgress, emailVerified, isApproved',
  };
  try {
    const data = await dynamoDb.scan(params).promise();
    res.json(data.Items);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: err.message });
  }
});
app.post('/users', async (req, res) => {
  const {
    email, category, courseCompleted, coursesInProgress, emailVerified,
    firstName, gender, goal, hoursSpentThisWeek, lastName,
    password, profileUrl, registerType, skills
  } = req.body;
  const newUser = {
    userId: uuidv4(),
    email, category, courseCompleted, coursesInProgress, emailVerified,
    firstName, gender, goal, hoursSpentThisWeek, lastName,
    password, profileUrl, registerType, skills,
  };
  const params = {
    TableName: process.env.AWS_TABLE,
    Item: newUser,
  };
  try {
    await dynamoDb.put(params).promise();
    res.json(newUser);
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ error: err.message });
  }
});
app.put('/users/:email', async (req, res) => {
  const email = req.params.email;
  const updates = req.body;
  const filteredUpdates = {};
  Object.keys(updates).forEach((key) => {
    if (updates[key] !== undefined && updates[key] !== null) {
      filteredUpdates[key] = updates[key];
    }
  });
  delete filteredUpdates.email;
  const updateExpParts = [];
  const expAttrValues = {};
  for (const [key, value] of Object.entries(filteredUpdates)) {
    updateExpParts.push(`${key} = :${key}`);
    expAttrValues[`:${key}`] = value;
  }
  if (updateExpParts.length === 0) {
    return res.status(400).json({ error: 'No valid fields provided for update' });
  }
  const updateParams = {
    TableName: process.env.AWS_TABLE,
    Key: { email },
    UpdateExpression: 'set ' + updateExpParts.join(', '),
    ExpressionAttributeValues: expAttrValues,
    ReturnValues: 'ALL_NEW',
  };
  try {
    const result = await dynamoDb.update(updateParams).promise();
    res.json(result.Attributes);
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ error: err.message });
  }
});
app.patch('/users/:email/approval', async (req, res) => {
  const email = decodeURIComponent(req.params.email).toLowerCase();
  const { isApproved } = req.body;

  console.log("PATCH /users/:email/approval");
  console.log("Email:", email);
  console.log("Request Body:", req.body);

  if (!['approved', 'rejected'].includes(isApproved)) {
    return res.status(400).json({ error: 'Invalid approval status' });
  }

  const params = {
    TableName: process.env.AWS_TABLE,
    Key: { email },
    UpdateExpression: 'set isApproved = :status',
    ExpressionAttributeValues: {
      ':status': isApproved,
    },
    ReturnValues: 'UPDATED_NEW',
  };

  console.log("Params to DynamoDB:", params);

  try {
    const result = await dynamoDb.update(params).promise();
    res.status(200).json({ message: 'Approval status updated', updated: result.Attributes });
  } catch (err) {
    console.error('❌ Error updating approval:', err.message, err);
    res.status(500).json({ error: 'Failed to update approval' });
  }
});

app.delete('/users/:email', async (req, res) => {
  const email = decodeURIComponent(req.params.email);
  const params = {
    TableName: process.env.AWS_TABLE,
    Key: { email },
  };
  try {
    await dynamoDb.delete(params).promise();
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});
// ===== COURSES =====
app.get('/courses', async (req, res) => {
  const params = {
    TableName: process.env.AWS_COURSES_TABLE,
  };
  let allItems = [];
  let lastEvaluatedKey = null;
  try {
    do {
      if (lastEvaluatedKey) {
        params.ExclusiveStartKey = lastEvaluatedKey;
      }
      const data = await dynamoDb.scan(params).promise();
      allItems = allItems.concat(data.Items);
      lastEvaluatedKey = data.LastEvaluatedKey;
    } while (lastEvaluatedKey);
    res.json(allItems);
  } catch (err) {
    console.error('Error fetching courses:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/courses', async (req, res) => {
  const {
    userId = '', category = '', completed = false, contents = '', cost = '',
    courseReview = '', description = '', enrolled = '', estimatedDuration = '',
    image = '', lastUpdatedOn = '', publishedOn = '', rating = '', requirements = '',
    title = '', whatWeCoverInCourse = '', whatYouLearn = ''
  } = req.body;
  const newCourse = {
    courseId: uuidv4(),
    userId,
    category, completed, contents, cost,
    courseReview, description, enrolled, estimatedDuration,
    image, lastUpdatedOn, publishedOn, rating, requirements,
    title, whatWeCoverInCourse, whatYouLearn
  };
  const params = {
    TableName: process.env.AWS_COURSES_TABLE,
    Item: newCourse,
  };
  try {
    await dynamoDb.put(params).promise();
    res.json(newCourse);
  } catch (err) {
    console.error('Error saving course:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/courses/:courseId', async (req, res) => {
  const courseId = req.params.courseId;
  const { userId, ...updates } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required in the request body' });
  }
  const filteredUpdates = {};
  Object.keys(updates).forEach((key) => {
    if (updates[key] !== undefined && updates[key] !== null) {
      filteredUpdates[key] = updates[key];
    }
  });
  delete filteredUpdates.courseId;
  const updateExpParts = [];
  const expAttrValues = {};
  for (const [key, value] of Object.entries(filteredUpdates)) {
    updateExpParts.push(`${key} = :${key}`);
    expAttrValues[`:${key}`] = value;
  }
  if (updateExpParts.length === 0) {
    return res.status(400).json({ error: 'No valid fields provided for update' });
  }
  const updateParams = {
    TableName: process.env.AWS_COURSES_TABLE,
    Key: { courseId, userId },
    UpdateExpression: 'set ' + updateExpParts.join(', '),
    ExpressionAttributeValues: expAttrValues,
    ReturnValues: 'ALL_NEW',
  };
  try {
    const result = await dynamoDb.update(updateParams).promise();
    res.json(result.Attributes);
  } catch (err) {
    console.error('Error updating course:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/courses/:courseId', async (req, res) => {
  const courseId = req.params.courseId;
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required in the request body' });
  }
  const params = {
    TableName: process.env.AWS_COURSES_TABLE,
    Key: { courseId, userId },
  };
  try {
    await dynamoDb.delete(params).promise();
    res.status(200).json({ message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Error deleting course:', error);
    res.status(500).json({ error: 'Failed to delete course' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
