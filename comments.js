// Create web server
const express = require('express');
const bodyParser = require('body-parser');
const { randomBytes } = require('crypto');
const { default: axios } = require('axios');

const app = express();
// Parse the request body
app.use(bodyParser.json());

const commentsByPostId = {};

// Get all comments for a post
app.get('/posts/:id/comments', (req, res) => {
  res.send(commentsByPostId[req.params.id] || []);
});

// Create a new comment
app.post('/posts/:id/comments', async (req, res) => {
  // Create a random id
  const commentId = randomBytes(4).toString('hex');
  // Get the content of the comment
  const { content } = req.body;
  // Get the post id
  const postId = req.params.id;
  // Get the comment list of the post
  const comments = commentsByPostId[postId] || [];
  // Add the new comment to the list
  comments.push({ id: commentId, content, status: 'pending' });
  // Save the comment list
  commentsByPostId[postId] = comments;
  // Send the comment list
  await axios.post('http://event-bus-srv:4005/events', {
    type: 'CommentCreated',
    data: {
      id: commentId,
      content,
      postId,
      status: 'pending'
    }
  });
  res.status(201).send(comments);
});

// Receive events from the event bus
app.post('/events', async (req, res) => {
  console.log('Event received:', req.body.type);
  const { type, data } = req.body;
  if (type === 'CommentModerated') {
    // Get the post id
    const { postId, id, status, content } = data;
    // Get the comment list of the post
    const comments = commentsByPostId[postId];
    // Update the comment
    const comment = comments.find(comment => {
      return comment.id === id;
    });
    comment.status = status;
    // Send the comment list
    await axios.post('http://event-bus-srv:4005/events', {
      type: 'CommentUpdated',
      data: {
        id,
        status,
        postId,
        content
      }
    });
  }
  res.send({});
});

// Listen to