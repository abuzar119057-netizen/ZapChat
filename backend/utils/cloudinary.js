const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'sen0nmbj',
  api_key: process.env.CLOUDINARY_API_KEY || '293593211639417',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'Tr2SAjbbvYNeUutdhZ3DkuHhRJ4'
});

const uploadToCloudinary = (fileBuffer, folder = 'zapchat_media') => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: folder, resource_type: 'auto' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(fileBuffer);
  });
};

module.exports = { cloudinary, uploadToCloudinary };
