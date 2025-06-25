# Bank Reconciliation System - NestJS & MongoDB

A microservices-based system for importing and managing bank transactions with high-volume data processing capabilities, built with NestJS and MongoDB.

## Architecture Overview

<img src="./public/BankReconciliationSystem.png" alt="Architecture Diagram" width="800"/>

The system consists of multiple NestJS microservices designed for scalability, maintainability, and fault tolerance:

### Services

1. **API Gateway Service** (Port 3000) - Entry point, routing, rate limiting
2. **Transaction Service** (Port 3002) - Core transaction processing
3. **File Processing Service** (Port 3003,3006) - Handles CSV/Excel file processing
4. **Notification Service** (Port 3004) - Async notifications

### Key Features

- **High-volume processing**: Handles 1M+ records efficiently using MongoDB bulk operations
- **Batch processing**: Processes large files in chunks with queue management
- **Async processing**: Non-blocking file uploads with Bull Queue
- **JWT Authentication**: Secure API access with Passport strategies
- **Role-based access control**: Fine-grained permissions for different user roles
- **Session management**: Manage, revoke, and validate user sessions
- **Rate limiting**: Prevents API abuse with NestJS throttler
- **Database transactions**: MongoDB transactions for data consistency
- **Comprehensive logging**: Request tracing and monitoring with Pino
- **API Documentation**: Auto-generated with Swagger

## Software Development Principles & Patterns

### Design Patterns Applied

- **Microservices Architecture**: Service separation and independence
- **API Gateway Pattern**: Single entry point for all client requests
- **Repository Pattern**: Data access abstraction with Mongoose
- **Generic Repository Pattern**: Reusable data access logic
- **Observer Pattern**: Event-driven notifications with EventEmitter2
- **Queue Pattern**: Bull Queue for background job processing
- **Strategy Pattern**: Authentication strategies with Passport

## Technology Stack

### Core Framework

- **NestJS**: Progressive Node.js framework
- **TypeScript**: Type safety and better development experience

### Database & Storage

- **MongoDB**: Primary database with Mongoose ODM
- **Redis**: Caching, sessions, and Bull Queue backend
- **GridFS**: Large file storage in MongoDB

### Security & Authentication

- **Passport JWT**: JWT authentication strategy
- **bcrypt**: Password hashing
- **Helmet**: HTTP security headers
- **@nestjs/throttler**: Rate limiting

### Processing & Utilities

- **Bull Queue**: Background job processing
- **csv-parse**: CSV file processing
- **xlsx**: Excel file processing
- **Multer**: File upload handling
- **moment**: Date/time handling

### Development & Testing

- **Jest**: Unit and integration testing
- **Swagger**: API documentation
- **Class-validator**: DTO validation
- **Class-transformer**: Object transformation

## Project Structure

```
|   docker-compose.yml
|   Dockerfile
|   nest-cli.json
|   package-lock.json
|   package.json
|   README.md
|   tsconfig.build.json
|   tsconfig.json
+---config
+---public
+---scripts
+---src
|   +---apps
|   |   +---api-gateway
|   |   |   |   Dockerfile
|   |   |   |   tsconfig.app.json
|   |   |   +---public
|   |   |   \---src
|   |   |       |   app.module.ts
|   |   |       |   main.ts
|   |   |       \---modules
|   |   |           +---auth
|   |   |           +---file-upload
|   |   |           +---health
|   |   |           +---mail
|   |   |           +---realtime
|   |   |           +---role
|   |   |           +---session
|   |   |           +---shared
|   |   |           +---transaction
|   |   |           \---user
|   |   +---file-processing-service
|   |   +---notification-service
|   |   \---transaction-service
|   +---config
|   +---constants
|   +---decorators
|   +---entities
|   |   +---seeders
|   |   \---shared
|   +---filter
|   +---helpers
|   +---logger
|   +---repositories
|   |   +---base
|   |   +---fileProcessing
|   |   +---permission
|   |   +---profile
|   |   +---role
|   |   +---session
|   |   +---transaction
|   |   \---user
|   +---served
|   +---services
|   |   +---base
|   |   \---mongo
|   +---timing
|   +---transformers
|   \---types
\---test
```

## Local Development Setup

### Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose
- MongoDB 6+
- Redis 7+

### Quick Start

1. **Clone and Install Dependencies**

```bash
git clone <repository-url>
cd bank-reconciliation
```

2. **Environment Setup**

```bash
# Copy environment files
cp .env.example .env

```

4. **Start All Services**

```bash
# Start all services with Docker Compose
docker-compose up -d
```

### Service Ports

- API Gateway: http://localhost:3000
- Transaction Service: http://localhost:3002
- File Processing: http://localhost:3003
- Notification Service: http://localhost:3004

### API Documentation

- Swagger UI: http://localhost:3000/api/docs

## API Testing with CURL

### Prerequisites

```bash
BASE_URL="http://localhost:3000"
JWT_TOKEN="your-jwt-token-here" // replace with a valid JWT token after authentication
```

### 1. User Authentication

```bash
curl -X POST ${BASE_URL}/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "bankuser",
    "password": "SecurePass123!"
  }'
```

**Response:**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6InN1cGVyYWRtaW4iLCJzdWIiOiI2ODViYmQwYmRmMzc5ODExMDVhMWYyNWEiLCJzZXNzaW9uSWQiOiIyZGFkNWQ4NmI2MjhkZmVhMDU2OGE3MGEiLCJpYXQiOjE3NTA4NDMwMDYsImV4cCI6MTc1MzQzNTAwNn0.SODbNRet8yXzTaWQ0x3STyse-fNzQy9SCPnHC6K5uKc",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6InN1cGVyYWRtaW4iLCJzdWIiOiI2ODViYmQwYmRmMzc5ODExMDVhMWYyNWEiLCJpYXQiOjE3NTA4NDMwMDYsImV4cCI6MTc1MDg0MzM2Nn0.gf_i4Vx9KRy4YLsKaGUxH9i7Bg5yXmnUPX34i3jXhus",
  "expired_at": "2025-07-25T09:16:46.000Z",
  "session_id": "2dad5d86b628dfea0568a70a"
}
```

### 2. Upload Transaction File (CSV)

```bash
curl -X POST "${BASE_URL}/upload/transactions" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Accept: application/json" \
  -F "file=@/path/to/your/transactions.csv" \
  -F "description=Monthly transaction import for March 2024"
```

**Response:**

```json
{
  "uploadId": "faad9526-20bc-4e2e-bcc9-66afe9a831a8",
  "filename": "sample_transactions.csv",
  "status": "QUEUED",
  "message": "File uploaded successfully and queued for processing",
  "uploadedAt": "2025-06-25T09:19:20.872Z",
  "fileSize": 60391757,
  "estimatedProcessingTime": "8 minutes"
}
```

### 3. Upload Transaction File (Excel)

```bash
curl -X POST "${BASE_URL}/upload/transactions" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Accept: application/json" \
  -F "file=@/path/to/your/transactions.xlsx" \
  -F "description=Q1 2024 transaction data"
```

### 4. Check Upload Status

```bash
curl -X GET "${BASE_URL}/upload/status/upload-id-12345" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Accept: application/json"
```

**Response:**

```json
{
  "uploadId": "16e6f315-97b1-493c-b601-e7a756925dca",
  "filename": "sample_transactions.csv",
  "status": "PROCESSING",
  "progress": 23,
  "processedRecords": 230500,
  "totalRecords": 1000000,
  "successfulRecords": 230500,
  "failedRecords": 0,
  "errors": [],
  "uploadedAt": "2025-06-25T09:41:01.939Z",
  "fileSize": 60391757,
  "fileType": "csv"
}
```

### 5. Get Upload History

```bash
curl -X GET "${BASE_URL}/upload/history" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Accept: application/json"
```

**Response:**

```json
[
  {
    "uploadId": "16e6f315-97b1-493c-b601-e7a756925dca",
    "filename": "sample_transactions.csv",
    "status": "PROCESSING",
    "progress": 3,
    "processedRecords": 30500,
    "totalRecords": 1000000,
    "successfulRecords": 30500,
    "failedRecords": 0,
    "uploadedAt": "2025-06-25T09:41:01.939Z",
    "fileSize": 60391757,
    "fileType": "csv"
  }
]
```

### 6. Get Transactions

```bash
curl -X GET "${BASE_URL}/transactions" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json"
```

**Response:**

```json
{
  "data": [
    {
      "id": "685bbe9bb43e85e55fb7506d",
      "date": "2025-06-21T00:00:00.000Z",
      "type": "Deposit",
      "amount": 200000,
      "content": "Manual deposit transaction",
      "user_id": "685bbd0bdf37981105a1f25a",
      "upload_id": null,
      "originalRowNumber": 0,
      "fileUploadId": null,
      "created_at": "2025-06-25T09:17:15.412Z",
      "updated_at": "2025-06-25T09:17:15.412Z"
    }
  ],
  "meta": {
    "include": [],
    "custom": [],
    "pagination": {
      "total": 1,
      "count": 1,
      "per_page": 10,
      "current_page": 1,
      "total_pages": 1,
      "links": {}
    }
  }
}
```

### 7. Get Transaction by ID

```bash
curl -X GET "${BASE_URL}/transactions/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json"
```

**Response:**

```json
{
  "data": {
    "id": "685bbe9bb43e85e55fb7506d",
    "date": "2025-06-21T00:00:00.000Z",
    "type": "Deposit",
    "amount": 200000,
    "content": "Manual deposit transaction",
    "user_id": "685bbd0bdf37981105a1f25a",
    "upload_id": null,
    "originalRowNumber": 0,
    "fileUploadId": null,
    "created_at": "2025-06-25T09:17:15.412Z",
    "updated_at": "2025-06-25T09:17:15.412Z"
  },
  "meta": {
    "include": []
  }
}
```

### 8. Create Single Transaction

```bash
curl -X POST "${BASE_URL}/transactions" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "date": "2024-03-21T10:20:11.000Z",
    "content": "Manual deposit transaction",
    "amount": 150.75,
    "type": "DEPOSIT"
  }'
```

**Response:**

```json
{
  "deleted_at": null,
  "date": "2025-06-21T00:00:00.000Z",
  "content": "Manual deposit transaction",
  "amount": 200000,
  "type": "Deposit",
  "user_id": "685bbd0bdf37981105a1f25a",
  "originalRowNumber": 0,
  "isActive": true,
  "_id": "685bbe9bb43e85e55fb7506d",
  "created_at": "2025-06-25T09:17:15.412Z",
  "updated_at": "2025-06-25T09:17:15.412Z",
  "__v": 0,
  "id": "685bbe9bb43e85e55fb7506d"
}
```

### 9. Delete Transaction

```bash
curl -X DELETE "${BASE_URL}/transactions/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Accept: application/json"
```

## Sample Data Format

### CSV Format (sample_transactions.csv)

```csv
date,content,amount,type
21/03/2024 10:20:11,Salary deposit,+5000.00,Deposit
20/03/2024 14:30:25,ATM withdrawal,-200.00,Withdraw
19/03/2024 09:15:45,Online transfer,+1500.00,Deposit
18/03/2024 16:45:30,Grocery payment,-85.50,Withdraw
17/03/2024 12:10:20,Bill payment,-150.75,Withdraw
16/03/2024 08:30:45,Freelance payment,+800.00,Deposit
```

### Excel Format

Same structure as CSV but in .xlsx format with proper column headers.

### Environment Variables

Set the following environment variables for production:

## Security Features

### Authentication & Authorization

- **JWT Authentication**: Secure token-based auth with refresh tokens
- **Role-based Access Control**: BANK_OPERATOR, ADMIN roles
- **Password Security**: bcrypt with configurable rounds
- **Rate Limiting**: Throttling per endpoint and user
- **Session Management**: Session creation, validation, and revocation

### Data Protection

- **Input Validation**: Class-validator DTOs
- **SQL/NoSQL Injection Prevention**: Mongoose query sanitization
- **CORS Configuration**: Proper cross-origin settings
- **Security Headers**: Helmet.js implementation

### Audit

- **Audit Logging**: All transaction modifications logged
- **Data Encryption**: Sensitive data encryption at rest

## Performance Optimization

### Database Optimization

- **Indexing Strategy**: Compound indexes for query optimization
- **Aggregation Pipelines**: Efficient data aggregation

### Caching Strategy

- **Redis Caching**: Frequently accessed data caching
- **Query Result Caching**: Database query optimization
- **Session Management**: Efficient session storage

### Queue Management

- **Bull Queue**: Background job processing
- **Retry Mechanism**: Failed job retry with exponential backoff
- **Dead Letter Queue**: Failed job handling

## API Documentation

The system automatically generates comprehensive API documentation using Swagger:

- **Interactive Documentation**: Available at `/api/docs`
- **Schema Definitions**: Complete DTO and response schemas
- **Authentication Examples**: JWT token usage examples
- **Query Parameters**: Detailed descriptions of query parameters for filtering, sorting, and pagination

## Contributing

### Development Guidelines

1. Follow NestJS conventions and best practices
2. Update Swagger documentation for API changes
3. Follow conventional commit messages
4. Ensure all linting and formatting rules pass

### Code Quality

- **ESLint**: Code quality enforcement
- **Prettier**: Code formatting

## Support

For issues and questions:

- Check the API documentation at `/api/docs`
- Review the health check endpoints
- Check service logs for error details

## Author

- [Liem Huynh](https://github.com/Quangliem59)
