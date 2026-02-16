# AbanRemit Backend

Standalone Node.js/Express backend with PostgreSQL for AbanRemit wallet system.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

3. Set up PostgreSQL database:
```bash
# Create database
createdb abanremit_dev

# Run migrations
npm run prisma:migrate
```

4. Start development server:
```bash
npm run dev
```

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio

## Project Structure

```
backend/
├── src/
│   ├── routes/        # API route handlers
│   ├── services/      # Business logic services
│   ├── middleware/    # Express middleware
│   ├── utils/         # Utility functions
│   ├── types/         # TypeScript type definitions
│   └── index.ts       # Application entry point
├── prisma/
│   └── schema.prisma  # Database schema
├── tests/             # Test files
└── dist/              # Compiled output
```

## API Documentation

See [API.md](./API.md) for complete API documentation.

## Testing

The project uses Vitest for testing with both unit tests and property-based tests using fast-check.

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment instructions.
