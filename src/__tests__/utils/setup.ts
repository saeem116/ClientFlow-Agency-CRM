import mongoose from 'mongoose'

// Force the test connection to a dedicated test database.
//
// The default is a localhost test database that is NEVER the production
// database. To run tests against a remote test database (e.g. a separate
// Atlas cluster), set TEST_MONGODB_URI explicitly — never use MONGODB_URI,
// which is reserved for the production app connection.
const MONGODB_URI =
  process.env.TEST_MONGODB_URI ||
  'mongodb://localhost:27017/clientflow-test'

// Connect immediately when the module loads — this runs in each fork's context.
console.log('[setup] Connecting to test database:', MONGODB_URI)

const connectPromise = mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 15000,
  bufferCommands: false,
  maxPoolSize: 5
})

connectPromise
  .then(() => {
    console.log('[setup] Connected! readyState:', mongoose.connection.readyState)
  })
  .catch((err) => {
    console.log('[setup] Connection failed:', err.message)
  })

export const db = mongoose
export const isMongoConnected = () => mongoose.connection.readyState === 1
export { connectPromise }