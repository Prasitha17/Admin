const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const AWS = require('aws-sdk');
const bodyParser = require('body-parser');
console.log('ENV file path:', require('path').resolve('.env'));
require('dotenv').config();
console.log({
  AWS_REGION: process.env.AWS_REGION,
  AWS_TABLE: process.env.AWS_TABLE,
  AWS_COURSES_TABLE: process.env.AWS_COURSES_TABLE,
});
const app = express();
const port = 3001;
const corsOptions = {
  origin: 'http://localhost:3000',
  optionsSuccessStatus: 200,
  credentials: true,
};
app.use(cors(corsOptions));
AWS.config.update({
  region: process.env.AWS_REGION,
});
const dynamoDb = new AWS.DynamoDB.DocumentClient();
app.use(bodyParser.json());
app.get('/users', async (req, res) => {
  const params = {
    TableName: process.env.AWS_TABLE,
    ProjectionExpression: 'userId, firstName, lastName, email, password, category, courseCompleted, coursesInProgress, emailVerified',
  };
  try {
    const data = await dynamoDb.scan(params).promise();
    res.json(data.Items);
  } catch (err) {
    console.error('Error fetching users:', err); // <-- ADDED LOG
    res.status(500).json({ error: err.message });
  }
});
app.post('/users', async (req, res) => {
  const {
    email,
    category,
    courseCompleted,
    coursesInProgress,
    emailVerified,
    firstName,
    gender,
    goal,
    hoursSpentThisWeek,
    lastName,
    password,
    profileUrl,
    registerType,
    skills,
  } = req.body;
  const newUser = {
    userId: uuidv4(),
    email,
    category,
    courseCompleted,
    coursesInProgress,
    emailVerified,
    firstName,
    gender,
    goal,
    hoursSpentThisWeek,
    lastName,
    password,
    profileUrl,
    registerType,
    skills,
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

  console.log('Updating user with email:', email); 
  console.log('Update data:', updates); 

  const filteredUpdates = {};
  Object.keys(updates).forEach((key) => {
    if (updates[key] !== undefined && updates[key] !== null) {
      filteredUpdates[key] = updates[key];
    }
  });
  delete filteredUpdates.email;

  let updateExpParts = [];
  let expAttrValues = {};

  for (const [key, value] of Object.entries(filteredUpdates)) {
    updateExpParts.push(`${key} = :${key}`);
    expAttrValues[`:${key}`] = value;
  }
  if (updateExpParts.length === 0) {
    return res.status(400).json({ error: 'No valid fields provided for update' });
  }
  const updateExpression = 'set ' + updateExpParts.join(', ')
  const updateParams = {
    TableName: process.env.AWS_TABLE,
    Key: { email },
    UpdateExpression: updateExpression,
    ExpressionAttributeValues: expAttrValues,
    ReturnValues: 'ALL_NEW',
  };

  try {
    const result = await dynamoDb.update(updateParams).promise();
    console.log('User update successful:', result.Attributes); 
    res.json(result.Attributes);
  } catch (err) {
    console.error('Error updating user:', err); 
    res.status(500).json({ error: err.message });
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

app.get('/courses', async (req, res) => {
  const params = {
    TableName: process.env.AWS_COURSES_TABLE,
  };
  try {
    const data = await dynamoDb.scan(params).promise();
    res.json(data.Items);
  } catch (err) {
    console.error('Error fetching courses:', err); 
    res.status(500).json({ error: err.message });
  }
});
app.post('/courses', async (req, res) => {
  const {
    userID = '',
    category = '',
    completed = false,
    contents = '',
    cost = '',
    courseReview = '',
    description = '',
    enrolled = '',
    estimatedDuration = '',
    image = '',
    lastUpdatedOn = '',
    publishedOn = '',
    rating = '',
    requirements = '',
    title = '',
    whatWeCoverInCourse = '',
    whatYouLearn = '',
  } = req.body;
  const newCourse = {
    courseId: uuidv4(),
    userID,
    category,
    completed,
    contents,
    cost,
    courseReview,
    description,
    enrolled,
    estimatedDuration,
    image,
    lastUpdatedOn,
    publishedOn,
    rating,
    requirements,
    title,
    whatWeCoverInCourse,
    whatYouLearn,
  };
  console.log("📦 Creating new course:", newCourse);
  const params = {
    TableName: process.env.AWS_COURSES_TABLE,
    Item: newCourse,
  };
  try {
    await dynamoDb.put(params).promise();
    res.json(newCourse);
  } catch (err) {
    console.error('🔥 Error saving course:', err);
    res.status(500).json({ error: err.message });
  }
});
app.put('/courses/:courseId', async (req, res) => {
  const courseId = req.params.courseId;
  const updates = req.body;

  console.log('Updating course with id:', courseId); //
  console.log('Update data:', updates); 
  const filteredUpdates = {};
  Object.keys(updates).forEach((key) => {
    if (updates[key] !== undefined && updates[key] !== null) {
      filteredUpdates[key] = updates[key];
    }
  });
  delete filteredUpdates.courseId;

  let updateExpParts = [];
  let expAttrValues = {};

  for (const [key, value] of Object.entries(filteredUpdates)) {
    updateExpParts.push(`${key} = :${key}`);
    expAttrValues[`:${key}`] = value;
  }

  if (updateExpParts.length === 0) {
    return res.status(400).json({ error: 'No valid fields provided for update' });
  }

  const updateExpression = 'set ' + updateExpParts.join(', ');

  const updateParams = {
    TableName: process.env.AWS_COURSES_TABLE,
    Key: { courseId },
    UpdateExpression: updateExpression,
    ExpressionAttributeValues: expAttrValues,
    ReturnValues: 'ALL_NEW',
  };

  try {
    const result = await dynamoDb.update(updateParams).promise();
    console.log('Course update successful:', result.Attributes); 
    res.json(result.Attributes);
  } catch (err) {
    console.error('Error updating course:', err); // <-- ADDED LOG
    res.status(500).json({ error: err.message });
  }
});
app.delete('/courses/:courseId', async (req, res) => {
  const courseId = req.params.courseId;

  const params = {
    TableName: process.env.AWS_COURSES_TABLE,
    Key: { courseId },
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
