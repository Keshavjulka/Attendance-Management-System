# 🔒 Environment Setup Guide

## Setting Up Environment Variables

This project uses environment variables to store sensitive information like database credentials and API keys. **Never commit these to version control!**

### 1. Create Environment File

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` file with your actual credentials:
   ```bash
   # MongoDB Configuration
   MONGO_URI=mongodb+srv://your-username:your-password@your-cluster.mongodb.net/your-database

   # JWT Secret Key (generate a secure random key)
   JWT_SECRET_KEY=your-super-secure-jwt-secret-key

   # Flask Configuration
   FLASK_ENV=development
   FLASK_DEBUG=True
   ```

### 2. Generate Secure JWT Secret

You can generate a secure JWT secret using Python:

```python
import secrets
print(secrets.token_urlsafe(32))
```

### 3. MongoDB Setup

1. Create a MongoDB Atlas account
2. Create a new cluster
3. Create a database user
4. Get your connection string from MongoDB Atlas
5. Replace the MONGO_URI in your `.env` file

### 4. Important Security Notes

- ✅ **DO**: Use environment variables for all secrets
- ✅ **DO**: Keep `.env` in `.gitignore`
- ✅ **DO**: Use different secrets for development and production
- ❌ **DON'T**: Commit `.env` files to version control
- ❌ **DON'T**: Share your `.env` file publicly
- ❌ **DON'T**: Use default/example secrets in production

### 5. Production Deployment

For production deployment (Heroku, AWS, etc.), set environment variables in your hosting platform's dashboard rather than using `.env` files.

### 6. Troubleshooting

If you get "MONGO_URI environment variable is required" error:
1. Ensure `.env` file exists in the project root
2. Check that MONGO_URI is properly set in `.env`
3. Restart your Flask application after changing `.env`
