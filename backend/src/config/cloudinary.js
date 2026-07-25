const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Storage for book listing images
const bookImageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'smart-study-exchange/books',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1200, crop: 'limit' }],
  },
});

// Storage for note files (PDF/images) and chat attachments
const documentStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'smart-study-exchange/documents',
    resource_type: 'auto', // allows PDFs alongside images
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'pdf'],
  },
});

const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'smart-study-exchange/avatars',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
  },
});

const uploadBookImages = multer({ storage: bookImageStorage, limits: { fileSize: 8 * 1024 * 1024 } });
const uploadDocument = multer({ storage: documentStorage, limits: { fileSize: 20 * 1024 * 1024 } });
const uploadAvatar = multer({ storage: avatarStorage, limits: { fileSize: 4 * 1024 * 1024 } });

module.exports = { cloudinary, uploadBookImages, uploadDocument, uploadAvatar };
