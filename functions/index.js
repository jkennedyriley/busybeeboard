const {onDocumentCreated} = require('firebase-functions/v2/firestore');
const {onCall} = require('firebase-functions/v2/https');
const {initializeApp} = require('firebase-admin/app');
const {getFirestore} = require('firebase-admin/firestore');

initializeApp();

// Content Moderation Function
exports.moderateEvent = onDocumentCreated('events/{eventId}', async (event) => {
  const eventData = event.data.data();
  const eventId = event.params.eventId;
  
  // Basic moderation checks
  const moderationResult = await runModerationChecks(eventData);
  
  const db = getFirestore();
  
  if (moderationResult.approved) {
    await db.collection('events').doc(eventId).update({
      moderationStatus: 'approved',
      isApproved: true
    });
    console.log(`Event ${eventId} approved`);
  } else {
    await db.collection('events').doc(eventId).update({
      moderationStatus: 'rejected',
      isApproved: false,
      moderationNotes: moderationResult.reason
    });
    console.log(`Event ${eventId} rejected: ${moderationResult.reason}`);
  }
});

// Event Posting Limits Check
exports.checkEventPostingLimits = onCall(async (request) => {
  if (!request.auth) {
    throw new Error('User must be authenticated');
  }
  
  const userId = request.auth.uid;
  const db = getFirestore();
  const userDoc = await db.collection('users').doc(userId).get();
  
  if (!userDoc.exists) {
    throw new Error('User profile not found');
  }
  
  const userData = userDoc.data();
  
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  // Count events posted this month
  const eventsThisMonth = await db.collection('events')
    .where('createdBy', '==', userId)
    .where('createdAt', '>=', startOfMonth)
    .where('createdAt', '<=', endOfMonth)
    .get();
  
  const eventCount = eventsThisMonth.size;
  
  // Check limits based on account type
  let canPost = false;
  let limit = 0;
  
  switch (userData.accountType || 'customer') {
    case 'customer':
      limit = 5;
      canPost = eventCount < 5;
      break;
    case 'promoter':
      limit = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      canPost = eventCount < limit;
      break;
    case 'agent':
      canPost = true;
      limit = 'unlimited';
      break;
    default:
      limit = 5;
      canPost = eventCount < 5;
  }
  
  return {
    canPost,
    currentCount: eventCount,
    limit,
    accountType: userData.accountType || 'customer'
  };
});

// Helper function for moderation
async function runModerationChecks(eventData) {
  // Basic moderation checks
  const profanityWords = ['spam', 'scam', 'fraud', 'fake']; // Add more as needed
  
  const titleLower = eventData.title.toLowerCase();
  const descriptionLower = eventData.description.toLowerCase();
  
  // Check for profanity/spam words
  for (const word of profanityWords) {
    if (titleLower.includes(word) || descriptionLower.includes(word)) {
      return { approved: false, reason: 'Content may violate community guidelines' };
    }
  }
  
  // Check required fields
  if (!eventData.title || !eventData.description || !eventData.date) {
    return { approved: false, reason: 'Missing required fields' };
  }
  
  // Check description length
  if (eventData.description.length < 20 || eventData.description.length > 140) {
    return { approved: false, reason: 'Description must be between 20-140 characters' };
  }
  
  // Check if date is in the future
  const eventDate = eventData.date.toDate ? eventData.date.toDate() : new Date(eventData.date.seconds * 1000);
  const now = new Date();
  if (eventDate <= now) {
    return { approved: false, reason: 'Event date must be in the future' };
  }
  
  // Check for excessive caps (might indicate spam)
  const capsRatio = (eventData.title.match(/[A-Z]/g) || []).length / eventData.title.length;
  if (capsRatio > 0.7 && eventData.title.length > 10) {
    return { approved: false, reason: 'Excessive use of capital letters' };
  }
  
  return { approved: true, reason: null };
}