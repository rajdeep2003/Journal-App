// src/utils/userHelper.js
// Helper to fetch a user’s MongoDB _id given a username.
// Returns a Promise that resolves to the ObjectId string, or null if not found.

const User = require('../models/User');

/**
 * Retrieves the MongoDB ObjectId for a given username.
 * @param {string} username - The username to look up.
 * @returns {Promise<string|null>} The user _id as a string, or null if the user does not exist.
 */
async function getUserIdByUsername(username) {
  if (!username) return null;
  const user = await User.findOne({ username }).select('_id');
  return user ? user._id.toString() : null;
}

module.exports = { getUserIdByUsername };
